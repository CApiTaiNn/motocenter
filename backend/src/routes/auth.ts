import jwt from 'jsonwebtoken'
import { Request, Response, Router } from 'express'
import User from '../models/User'
import { argon2PasswordHasher } from '../utils/hash'

const { verify } = argon2PasswordHasher

const router = Router()
/**
 * @openapi
 * /auth:
 *   post:
 *     summary: Connexion à MotoCenter
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@email.com
 *               password:
 *                 type: string
 *                 example: mypassword123
 *     responses:
 *       200:
 *         description: Connected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Connected
 *       401:
 *         description: Email ou mot de passe incorrect
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Email ou mot de passe incorrect
 *       500:
 *         description: Internal server error
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Strings only: an object like {"$gt":""} would otherwise reach the
    // Mongo query as an operator (NoSQL injection / user enumeration).
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res
        .status(401)
        .json({ message: 'Email ou mot de passe incorrect' })
    }

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

    const isProd = process.env.NODE_ENV === 'production'
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000
    })
    res.status(200).json({ message: 'Connected' })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Connexion à MotoCenter
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Connected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Connected
 */
router.post('/logout', (req: Request, res: Response) => {
  const isProd = process.env.NODE_ENV === 'production'
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax'
  })
  res.status(200).json({ message: 'Disconnected' })
})

export default router
