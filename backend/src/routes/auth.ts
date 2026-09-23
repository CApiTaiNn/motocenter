import jwt from 'jsonwebtoken'
import { Request, Response, Router } from 'express'
import { OAuth2Client, type TokenPayload } from 'google-auth-library'
import User from '../models/User'
import { argon2PasswordHasher } from '../utils/hash'
import { generateToken, hashToken } from '../utils/tokens'
import { sendPasswordResetEmail, sendWelcomeEmail } from '../utils/mail'
import { validatePassword } from '../utils/passwordPolicy'
import { issueSession } from '../utils/session'

const { verify, hash } = argon2PasswordHasher

// One reusable Google client, created lazily once the client id is configured.
let googleClient: OAuth2Client | null = null
const getGoogleClient = (clientId: string): OAuth2Client =>
  (googleClient ??= new OAuth2Client(clientId))

// Build a unique pseudo from the Google profile. pseudo is unique at the DB
// level, so we probe with a numeric suffix until a free one is found.
const uniquePseudo = async (payload: TokenPayload): Promise<string> => {
  const base =
    (payload.name || payload.email?.split('@')[0] || 'rider')
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 20) || 'rider'
  let candidate = base
  let n = 0
  while (await User.exists({ pseudo: candidate })) {
    n += 1
    candidate = `${base}${n}`
  }
  return candidate
}

const appUrl = () => process.env.APP_URL || 'http://localhost:3000'

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

// Same response whether or not the email exists, to avoid leaking which
// addresses are registered.
const GENERIC_EMAIL_MESSAGE =
  'If an account exists for this email, a message has been sent'

// Verified against when the email is unknown, so login timing does not reveal
// whether an account exists. Computed once, lazily.
let dummyHash: string | null = null
const getDummyHash = async (): Promise<string> =>
  (dummyHash ??= await hash('user-enumeration-timing-guard'))

const router = Router()
/**
 * @openapi
 * /auth:
 *   post:
 *     summary: Connexion à Perforum
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@email.com
 *               password:
 *                 type: string
 *                 example: mypassword123
 *     responses:
 *       200:
 *         description: Connected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Connected
 *       401:
 *         description: Email ou mot de passe incorrect
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Email ou mot de passe incorrect
 *       500:
 *         description: Internal server error
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Strings only: an object like {"$gt":""} would otherwise reach the
    // Mongo query as an operator (NoSQL injection / user enumeration).
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res
        .status(401)
        .json({ message: 'Email ou mot de passe incorrect' })
    }

    const user = await User.findOne({ email }).select('+password')

    // Always run argon2, even for an unknown email, so a missing account costs
    // the same time as a wrong password (no user enumeration by timing).
    const passwordOk = await verify(
      password,
      user?.password ?? (await getDummyHash())
    )
    if (!user || !passwordOk) {
      return res
        .status(401)
        .json({ message: 'Email ou mot de passe incorrect' })
    }

    issueSession(res, user)
    res.status(200).json({ message: 'Connected' })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * @openapi
 * /auth/google:
 *   post:
 *     summary: Sign in to Perforum with a Google ID token
 *     description: Verifies the Google ID token, finds or creates the matching
 *       user, and issues the same session cookie as password login.
 */
router.post('/google', async (req: Request, res: Response) => {
  const { credential } = req.body

  // Strings only, so a crafted object can never reach verifyIdToken.
  if (typeof credential !== 'string') {
    return res.status(400).json({ message: 'Missing Google credential' })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return res
      .status(503)
      .json({ message: 'Google sign-in is not configured' })
  }

  try {
    const ticket = await getGoogleClient(clientId).verifyIdToken({
      idToken: credential,
      audience: clientId
    })
    const payload = ticket.getPayload()

    // Only trust a verified email — it is the key we match accounts on.
    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ message: 'Google account not verified' })
    }

    let user = await User.findOne({ email: payload.email })
    if (!user) {
      user = await User.create({
        firstname: payload.given_name || payload.name || 'Utilisateur',
        lastname: payload.family_name || payload.given_name || 'Google',
        pseudo: await uniquePseudo(payload),
        email: payload.email,
        // Google already verified the address, so skip our own email check.
        emailVerified: true,
        provider: 'google',
        providerId: payload.sub,
        image: payload.picture || ''
      })
    }

    issueSession(res, user)
    res.status(200).json({ message: 'Connected' })
  } catch (error) {
    console.error('Google login error:', error)
    res.status(401).json({ message: 'Invalid Google credential' })
  }
})

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Connexion à Perforum
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Connected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Connected
 */
router.post('/logout', async (req: Request, res: Response) => {
  // Really end the session, not just drop the cookie: bump tokenVersion so the
  // JWT can no longer be replayed if it was captured. This revokes every device
  // for the account. Best-effort — an invalid cookie is simply cleared.
  const token = req.cookies?.accessToken
  if (typeof token === 'string' && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256']
      })
      const id = typeof decoded === 'string' ? undefined : decoded.id
      if (id) await User.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } })
    } catch {
      // Invalid or expired token: nothing to revoke.
    }
  }

  const isProd = process.env.NODE_ENV === 'production'
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax'
  })
  res.status(200).json({ message: 'Disconnected' })
})

// Request a password-reset link. Always 200 (see GENERIC_EMAIL_MESSAGE).
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body

  if (typeof email === 'string') {
    const user = await User.findOne({ email })
    if (user) {
      const { raw, hash: tokenHash } = generateToken()
      user.passwordResetToken = tokenHash
      user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS)
      await user.save()

      const resetUrl = `${appUrl()}/reset-password?token=${raw}`
      void sendPasswordResetEmail({
        to: user.email,
        firstname: user.firstname,
        resetUrl
      }).catch((err) => console.error('Failed to send reset email:', err))
    }
  }

  res.status(200).json({ message: GENERIC_EMAIL_MESSAGE })
})

// Set a new password from a valid reset token.
router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, password } = req.body

  if (typeof token !== 'string') {
    return res.status(400).json({ message: 'Invalid or expired token' })
  }

  const user = await User.findOne({
    passwordResetToken: hashToken(token),
    passwordResetExpires: { $gt: new Date() }
  })
  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired token' })
  }

  const passwordCheck = validatePassword(password, {
    email: user.email,
    pseudo: user.pseudo
  })
  if (!passwordCheck.valid) {
    return res.status(400).json({ message: passwordCheck.message })
  }

  user.password = await hash(password)
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined
  await user.save()

  // Revoke any session opened before the reset — e.g. an attacker still logged
  // in on the account being recovered. Atomic $inc, so no stale read.
  await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } })

  res.status(200).json({ message: 'Password updated' })
})

// Confirm an email address from a verification token.
router.post('/verify-email', async (req: Request, res: Response) => {
  const { token } = req.body

  if (typeof token !== 'string') {
    return res.status(400).json({ message: 'Invalid or expired token' })
  }

  const user = await User.findOne({
    emailVerificationToken: hashToken(token),
    emailVerificationExpires: { $gt: new Date() }
  })
  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired token' })
  }

  user.emailVerified = true
  user.emailVerificationToken = undefined
  user.emailVerificationExpires = undefined
  await user.save()

  res.status(200).json({ message: 'Email verified' })
})

// Resend the verification email. Always 200 (see GENERIC_EMAIL_MESSAGE).
router.post('/resend-verification', async (req: Request, res: Response) => {
  const { email } = req.body

  if (typeof email === 'string') {
    const user = await User.findOne({ email })
    if (user && !user.emailVerified) {
      const { raw, hash: tokenHash } = generateToken()
      user.emailVerificationToken = tokenHash
      user.emailVerificationExpires = new Date(
        Date.now() + VERIFICATION_TOKEN_TTL_MS
      )
      await user.save()

      const verifyUrl = `${appUrl()}/verify-email?token=${raw}`
      void sendWelcomeEmail({
        to: user.email,
        firstname: user.firstname,
        verifyUrl
      }).catch((err) =>
        console.error('Failed to resend verification email:', err)
      )
    }
  }

  res.status(200).json({ message: GENERIC_EMAIL_MESSAGE })
})

export default router
