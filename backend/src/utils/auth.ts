import jwt, { type JwtPayload } from 'jsonwebtoken'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import User from '../models/User'
import type { AuthUser } from '../types/auth'
import { HttpError } from './errors'

// Narrow a verified JWT payload to our AuthUser shape. Returns null for the
// string form or a payload missing the `id` claim, so callers never trust an
// unexpected token structure.
const toAuthUser = (decoded: string | JwtPayload): AuthUser | null => {
  if (typeof decoded === 'string' || typeof decoded.id !== 'string') return null
  return {
    id: decoded.id,
    email: typeof decoded.email === 'string' ? decoded.email : undefined
  }
}

const verifyToken = (token: string): AuthUser | null => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in the environment variables')
  }
  return toAuthUser(jwt.verify(token, process.env.JWT_SECRET))
}

export const authenticateToken: RequestHandler = (req, res, next) => {
  const token = req.cookies?.accessToken

  if (!token) return res.status(401).json({ message: 'Non authentifié' })

  try {
    const user = verifyToken(token)
    if (!user) return res.status(401).json({ message: 'Token invalide' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ message: 'Token invalide' })
  }
}

// Like authenticateToken but never rejects: sets req.user when a valid token
// is present, otherwise proceeds anonymously. For routes that serve both
// public and authenticated callers with different data (e.g. is_public gating).
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.accessToken
  if (token) {
    try {
      const user = verifyToken(token)
      if (user) req.user = user
    } catch {
      // Invalid or expired token: treat the request as anonymous.
    }
  }
  next()
}

// Typed accessor for the authenticated principal. Use inside handlers mounted
// behind authenticateToken, where req.user is guaranteed to be set.
export const getAuthUser = (req: Request): AuthUser => {
  if (!req.user) throw new HttpError(401, 'Non authentifié')
  return req.user
}

// For owner-or-admin checks inside handlers (requireAdmin can't express
// "or owner"). Always re-reads isAdmin from the DB, never from the JWT.
export const isAdminUser = async (userId: string): Promise<boolean> => {
  const user = await User.findById(userId).select('isAdmin')
  return user?.isAdmin === true
}

// Shared owner-or-admin authorization. `ownerId` is the resource owner's id
// (null/undefined for an unowned resource); throws 403 unless the caller owns
// the resource or is an admin. Replaces the check copy-pasted across routes.
export const assertOwnerOrAdmin = async (
  ownerId: string | null | undefined,
  userId: string
): Promise<void> => {
  if (ownerId && ownerId === userId) return
  if (await isAdminUser(userId)) return
  throw new HttpError(403, 'Forbidden')
}

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.user?.id
    if (!id) return res.status(401).json({ message: 'Non authentifié' })

    const user = await User.findById(id).select('isAdmin')
    if (!user?.isAdmin) {
      return res
        .status(403)
        .json({ message: 'Accès réservé aux administrateurs' })
    }

    next()
  } catch (error) {
    console.error('Error checking admin role:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
