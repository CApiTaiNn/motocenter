const REQUIRED_ENV_VARS = [
  'MONGO_URI',
  'JWT_SECRET',
  'PASSWORD_PEPPER',
  // Image uploads (/images route) fail at runtime without these, so fail fast
  // at boot instead of returning 500s later.
  'SUPABASE_PROJECT_URL',
  'SUPABASE_KEY',
] as const

// A weak JWT_SECRET or PASSWORD_PEPPER undermines the whole auth model, so warn
// loudly at boot rather than booting silently insecure. Not fatal, to avoid
// taking the service down if a deployed secret is short.
const MIN_SECRET_LENGTH = 32
const SECRET_ENV_VARS = ['JWT_SECRET', 'PASSWORD_PEPPER'] as const

export const validateEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
    process.exit(1)
  }

  const weak = SECRET_ENV_VARS.filter(
    (key) => (process.env[key] ?? '').length < MIN_SECRET_LENGTH
  )

  if (weak.length > 0) {
    console.warn(
      `WARNING: these secrets should be at least ${MIN_SECRET_LENGTH} characters for security: ${weak.join(', ')}`
    )
  }
}
