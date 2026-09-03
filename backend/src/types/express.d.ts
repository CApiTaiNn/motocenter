import type { AuthUser } from './auth'

declare global {
  namespace Express {
    interface Request {
      // Set by authenticateToken/optionalAuth once a valid JWT is verified.
      user?: AuthUser
    }
  }
}

export {}
