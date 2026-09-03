import jwt from 'jsonwebtoken'
import { Request, Response, Router } from 'express'
import User from '../models/User'
import { argon2PasswordHasher } from '../utils/hash'
import { generateToken, hashToken } from '../utils/tokens'
import { sendPasswordResetEmail, sendWelcomeEmail } from '../utils/mail'
import { validatePassword } from '../utils/passwordPolicy'

const { verify, hash } = argon2PasswordHasher

const appUrl = () => process.env.APP_URL || 'http://localhost:3000'

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

// Same response whether or not the email exists, to avoid leaking which
// addresses are registered.
const GENERIC_EMAIL_MESSAGE =
  'If an account exists for this email, a message has been sent'

const router = Router()
/**
 * @openapi
 * /auth:
 *   post:
 *     summary: Connexion à MotoCenter
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

    if (!user || !(await verify(password, user.password))) {
      return res
        .status(401)
        .json({ message: 'Email ou mot de passe incorrect' })
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    )

    const isProd = process.env.NODE_ENV === 'production'
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000
    })
    res.status(200).json({ message: 'Connected' })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Connexion à MotoCenter
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
router.post('/logout', (req: Request, res: Response) => {
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
