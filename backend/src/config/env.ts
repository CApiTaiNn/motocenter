const REQUIRED_ENV_VARS = [
  'MONGO_URI',
  'JWT_SECRET',
  'PASSWORD_PEPPER',
  // Image uploads (/images route) fail at runtime without these, so fail fast
  // at boot instead of returning 500s later.
  'SUPABASE_PROJECT_URL',
  'SUPABASE_KEY',
] as const

export const validateEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
    process.exit(1)
  }
}
