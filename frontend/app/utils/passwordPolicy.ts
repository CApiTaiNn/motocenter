// Mirror of the backend password policy (backend/src/utils/passwordPolicy.ts).
// Aligned with NIST SP 800-63B: length over composition rules. The backend is
// authoritative; this gives instant feedback in the signup form.

export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

const IDENTIFIER_MIN_LENGTH = 4

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
  email?: string
  pseudo?: string
}

/** Returns a French error message, or null when the password is acceptable. */
export function validatePasswordRules(
  password: string,
  context: PasswordContext = {}
): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Le mot de passe ne doit pas dépasser ${PASSWORD_MAX_LENGTH} caractères`
  }

  const lower = password.toLowerCase()
  if (COMMON_PASSWORDS.has(lower)) {
    return 'Ce mot de passe est trop courant'
  }

  const localPart = context.email?.split('@')[0]?.toLowerCase() ?? ''
  if (localPart.length >= IDENTIFIER_MIN_LENGTH && lower.includes(localPart)) {
    return 'Le mot de passe ne doit pas contenir votre email'
  }

  const pseudo = context.pseudo?.toLowerCase() ?? ''
  if (pseudo.length >= IDENTIFIER_MIN_LENGTH && lower.includes(pseudo)) {
    return 'Le mot de passe ne doit pas contenir votre pseudo'
  }

  return null
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  // Tailwind background class for the strength bar.
  color: string
}

/**
 * Rough strength estimate for UX feedback only — not a gate. Rewards length and
 * character variety; a common password always scores 0.
 */
export function passwordStrength(password: string): PasswordStrength {
  const labels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Excellent'] as const
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500'
  ] as const

  const make = (score: 0 | 1 | 2 | 3 | 4): PasswordStrength => ({
    score,
    label: labels[score],
    color: colors[score]
  })

  if (!password) return make(0)
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return make(0)

  let score = 0
  if (password.length >= 12) score++
  if (password.length >= 16) score++
  if (password.length >= 20) score++

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) =>
    re.test(password)
  ).length
  if (classes >= 3) score++

  return make(Math.min(score, 4) as 0 | 1 | 2 | 3 | 4)
}
