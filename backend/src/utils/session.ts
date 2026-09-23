import jwt from 'jsonwebtoken'
import type { Response } from 'express'

// The minimum a caller must supply to open a session. `tokenVersion` is the
// revocation counter checked on every request (see utils/auth.ts).
interface SessionUser {
  _id: unknown
  email: string
  tokenVersion?: number
}

// Sign a 24h JWT for the user and set it as the httpOnly session cookie. Shared
// by password login, Google sign-in and the "re-issue after password change"
// path, so every entry point produces an identical session.
export const issueSession = (res: Response, user: SessionUser) => {
  const token = jwt.sign(
    { id: user._id, email: user.email, tv: user.tokenVersion ?? 0 },
    process.env.JWT_SECRET!,
    { expiresIn: '24h', algorithm: 'HS256' }
  )
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie('accessToken', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  })
}
