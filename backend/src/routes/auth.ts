import jwt from 'jsonwebtoken'
import { Request, Response, Router } from 'express'
import User from '../models/User'
import { argon2PasswordHasher } from '../utils/hash'

const { verify } = argon2PasswordHasher

const router = Router()
router.post('/', async (req: Request<unknown, unknown>, res: Response) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email }).select('+password')

    if (!user || !(await verify(password, user.password))) {
      return res
        .status(401)
        .json({ message: 'Email ou mot de passe incorrect' })
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    )

    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    })
    res.status(200).json({ message: 'Connected' })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  })
  res.status(200).json({ message: 'Disconnected' })
})

export default router
