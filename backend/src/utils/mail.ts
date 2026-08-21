import { Resend } from 'resend'

let client: Resend | null = null

// Lazy singleton: only build the client when a key is present. Returns null
// when Resend isn't configured (local dev, tests, CI) so callers can no-op
// instead of crashing.
const getResend = (): Resend | null => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  if (!client) client = new Resend(apiKey)
  return client
}

const appName = () => process.env.APP_NAME || 'MotoCenter'

// Resend requires a verified sender; fall back to their shared onboarding
// domain so a missing MAIL_FROM doesn't hard-fail in staging.
const sender = () =>
  process.env.MAIL_FROM || `${appName()} <onboarding@resend.dev>`

const button = (href: string, label: string): string =>
  `<a href="${href}" style="display:inline-block;padding:12px 20px;background:#e11d48;color:#fff;border-radius:9999px;text-decoration:none;font-weight:600;">${label}</a>`

/**
 * Send an email, or no-op when Resend isn't configured (local dev, tests, CI).
 * Delivery is best-effort: callers should treat a rejection as non-fatal.
 */
const send = async (params: {
  to: string
  subject: string
  html: string
}): Promise<void> => {
  const resend = getResend()
  if (!resend) return

  const { error } = await resend.emails.send({ from: sender(), ...params })

  // Resend reports API-level failures via the `error` field rather than a
  // throw; surface it so the caller's .catch() logs it.
  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }
}

export interface WelcomeEmailParams {
  to: string
  firstname: string
  // Link to confirm the email address. Omitted when verification is disabled.
  verifyUrl?: string
}

/**
 * Send the welcome + email-confirmation message to a freshly registered user.
 * MUST NOT gate signup — see `send` above.
 */
export const sendWelcomeEmail = async ({
  to,
  firstname,
  verifyUrl
}: WelcomeEmailParams): Promise<void> => {
  const verifyBlock = verifyUrl
    ? `<p>Confirmez votre adresse e-mail pour sécuriser votre compte :</p>
       <p>${button(verifyUrl, 'Confirmer mon e-mail')}</p>
       <p style="color:#666;font-size:12px;">Ce lien expire dans 24 heures.</p>`
    : ''

  await send({
    to,
    subject: `Bienvenue sur ${appName()} 🏍️`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.5; color: #111;">
        <h1>Bienvenue ${firstname} !</h1>
        <p>
          Votre compte ${appName()} a bien été créé. Vous pouvez dès à présent
          vous connecter et rejoindre la communauté.
        </p>
        ${verifyBlock}
        <p>À très vite sur la route 🏍️</p>
        <p style="color: #666; font-size: 12px;">
          Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail.
        </p>
      </div>
    `
  })
}

export interface PasswordResetEmailParams {
  to: string
  firstname: string
  resetUrl: string
}

/** Send the password-reset link. Best-effort, same rules as the welcome mail. */
export const sendPasswordResetEmail = async ({
  to,
  firstname,
  resetUrl
}: PasswordResetEmailParams): Promise<void> => {
  await send({
    to,
    subject: `Réinitialisation de votre mot de passe ${appName()}`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.5; color: #111;">
        <h1>Bonjour ${firstname},</h1>
        <p>
          Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le
          bouton ci-dessous pour en choisir un nouveau :
        </p>
        <p>${button(resetUrl, 'Réinitialiser mon mot de passe')}</p>
        <p style="color:#666;font-size:12px;">Ce lien expire dans 1 heure.</p>
        <p style="color: #666; font-size: 12px;">
          Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail :
          votre mot de passe reste inchangé.
        </p>
      </div>
    `
  })
}
