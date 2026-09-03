// Password policy aligned with NIST SP 800-63B (the modern consensus): length
// matters far more than composition rules. We enforce a minimum length, cap the
// maximum to avoid hashing very large inputs, and reject common or identity-based
// passwords. We deliberately do NOT require a mix of upper/lower/digit/symbol —
// those rules push users toward predictable patterns without adding real entropy.

export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

// Minimum length of an identifier (email local part, pseudo) before we reject a
// password that contains it. Short values like "new" would cause false positives.
const IDENTIFIER_MIN_LENGTH = 4

// A small blocklist of very common passwords. Not exhaustive — screening against
// a breach database (for example Have I Been Pwned's k-anonymity API) would be
// the natural next step.
const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  'motdepasse',
  'motdepasse1',
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  'azerty',
  'azertyuiop',
  'qwerty',
  'qwertyuiop',
  'iloveyou',
  'welcome',
  'welcome1',
  'letmein',
  'sunshine',
  'football',
  'motocenter',
  'vroomvroom',
  'abcdefgh',
  'aaaaaaaaaaaa',
  '000000000000',
  '111111111111'
])

export interface PasswordContext {
  email?: unknown
  pseudo?: unknown
}

export interface PasswordCheck {
  valid: boolean
  message?: string
}

/**
 * Validate a password against the policy. Returns `{ valid: true }` or
 * `{ valid: false, message }` with an English message for the API response.
 */
export const validatePassword = (
  password: unknown,
  context: PasswordContext = {}
): PasswordCheck => {
  if (typeof password !== 'string') {
    return { valid: false, message: 'Password is required' }
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    }
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return {
      valid: false,
      message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters`
    }
  }

  const lower = password.toLowerCase()
  if (COMMON_PASSWORDS.has(lower)) {
    return { valid: false, message: 'Password is too common' }
  }

  const email = typeof context.email === 'string' ? context.email : ''
  const localPart = email.split('@')[0]?.toLowerCase() ?? ''
  if (localPart.length >= IDENTIFIER_MIN_LENGTH && lower.includes(localPart)) {
    return { valid: false, message: 'Password must not contain your email' }
  }

  const pseudo = typeof context.pseudo === 'string' ? context.pseudo.toLowerCase() : ''
  if (pseudo.length >= IDENTIFIER_MIN_LENGTH && lower.includes(pseudo)) {
    return { valid: false, message: 'Password must not contain your pseudo' }
  }

  return { valid: true }
}
