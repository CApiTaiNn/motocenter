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

export interface WelcomeEmailParams {
  to: string
  firstname: string
}

/**
 * Send the account-confirmation email to a freshly registered user.
 *
 * Email delivery is best-effort and MUST NOT gate signup: when Resend isn't
 * configured this resolves without doing anything, and callers should treat a
 * rejection as non-fatal (log, don't fail the request).
 */
export const sendWelcomeEmail = async ({
  to,
  firstname
}: WelcomeEmailParams): Promise<void> => {
  const resend = getResend()
  if (!resend) return

  const appName = process.env.APP_NAME || 'MotoCenter'
  // Resend requires a verified sender; fall back to their shared onboarding
  // domain so a missing MAIL_FROM doesn't hard-fail in staging.
  const from = process.env.MAIL_FROM || `${appName} <onboarding@resend.dev>`

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Bienvenue sur ${appName} 🏍️`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.5; color: #111;">
        <h1>Bienvenue ${firstname} !</h1>
        <p>
          Votre compte ${appName} a bien été créé. Vous pouvez dès à présent
          vous connecter et rejoindre la communauté.
        </p>
        <p>À très vite sur la route 🏍️</p>
        <p style="color: #666; font-size: 12px;">
          Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail.
        </p>
      </div>
    `
  })

  // Resend reports API-level failures via the `error` field rather than a
  // throw; surface it so the caller's .catch() logs it.
  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }
}
