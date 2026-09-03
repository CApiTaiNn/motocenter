import { randomBytes, createHash } from 'crypto'

// One-time tokens for email verification and password reset. We send the raw
// token in the email link but store only its SHA-256 hash, so a database leak
// can't be used to verify emails or reset passwords. SHA-256 (not argon2) is
// the right tool here: the token is already high-entropy random, so slow
// hashing adds nothing.

export interface GeneratedToken {
  raw: string
  hash: string
}

export const hashToken = (raw: string): string =>
  createHash('sha256').update(raw).digest('hex')

export const generateToken = (): GeneratedToken => {
  const raw = randomBytes(32).toString('hex')
  return { raw, hash: hashToken(raw) }
}
