import jwt from 'jsonwebtoken'
import User from '../models/User'

export const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.accessToken

  if (!token) return res.status(401).json({ message: 'Non authentifié' })

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in the environment variables')
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ message: 'Token invalide' })
  }
}

// For owner-or-admin checks inside handlers (requireAdmin can't express
// "or owner"). Always re-reads isAdmin from the DB, never from the JWT.
export const isAdminUser = async (userId: string): Promise<boolean> => {
  const user = await User.findById(userId).select('isAdmin')
  return user?.isAdmin === true
}

export const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const { id } = (req.user as { id: string }) ?? {}
    if (!id) return res.status(401).json({ message: 'Non authentifié' })

    const user = await User.findById(id).select('isAdmin')
    if (!user?.isAdmin) {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' })
    }

    next()
  } catch (error) {
    console.error('Error checking admin role:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
