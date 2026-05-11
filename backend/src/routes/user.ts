import User from '../models/User'
import { IUser } from '../types/user'
import { authenticateToken } from '../utils/auth'
import { prepareQuery, type ReqQuery } from '../utils/find'
import { argon2PasswordHasher } from '../utils/hash'
import { type Request, Response, Router } from 'express'

const { hash } = argon2PasswordHasher

const router = Router()
router.get(
  '/account',
  authenticateToken,
  async (req: Request<unknown, unknown, unknown, ReqQuery>, res: Response) => {
    const { project } = prepareQuery(req.query)
    const { id } = req.user as { id: string }

    try {
      const users = await User.findById(id).select(project)
      res.status(200).json({ users })
    } catch (error) {
      console.error('Error accessing user route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

router.post('/account', async (req: Request, res: Response) => {
  const {
    email,
    password,
    firstname,
    lastname,
    pseudo,
    userType,
    ridingStartYear,
    image
  } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  if (await User.findOne({ email })) {
    return res.status(409).json({ error: 'User already exists' })
  }

  try {
    const newUser: IUser = {
      email,
      password: await hash(password),
      firstname,
      lastname,
      pseudo,
      userType,
      image,
      ridingStartYear,
      createdAt: new Date(),
      isAdmin: false,
      idMoto: ''
    }

    const users = await User.insertOne(newUser)

    res.status(200).json({ users })
  } catch (error) {
    console.error('Error accessing user route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put(
  '/account',
  authenticateToken,

  async (req: Request, res: Response) => {
    const { id } = req.user as { id: string }
    const {
      firstname,
      lastname,
      pseudo,
      userType,
      ridingStartYear,
      image,
      password
    } = req.body

    const allowedFields = [
      'firstname',
      'lastname',
      'pseudo',
      'userType',
      'ridingStartYear',
      'image',
      'password'
    ]

    const updateData: any = {}
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field]
      }
    })

    if (updateData.pseudo) {
      const existingUser = await User.findOne({
        pseudo: updateData.pseudo,
        _id: { $ne: id }
      })
      if (existingUser) {
        return res.status(409).json({ error: 'Pseudo already taken' })
      }
    }

    if (updateData.ridingStartYear) {
      const year = Number(updateData.ridingStartYear)
      const currentYear = new Date().getFullYear()
      if (isNaN(year) || year < 1950 || year > currentYear) {
        return res.status(400).json({
          error: `Riding start year must be between 1950 and ${currentYear}`
        })
      }
    }

    try {
      updateData.updatedAt = new Date()

      const users = await User.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true
      }).select('-password') // Ne pas retourner le mot de passe

      if (!users) {
        return res.status(404).json({ error: 'User not found' })
      }

      res.status(200).json({ users })
    } catch (error) {
      console.error('Error updating user:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

router.get(
  '/',
  async (req: Request<unknown, unknown, unknown, ReqQuery>, res: Response) => {
    const allowedFields = [
      'email',
      'pseudo',
      'userType',
      'ridingStartYear',
      'image'
    ]

    const { project, sort, limit, filter } = prepareQuery(req.query)

    const safeProject = Object.fromEntries(
      Object.entries(project).filter(([key]) => allowedFields.includes(key))
    )

    const finalProject =
      Object.keys(safeProject).length > 0 ? safeProject : { _id: 1 }

    try {
      const users = await User.find(filter)
        .select(finalProject)
        .sort(sort)
        .limit(limit)
      res.status(200).json({ users })
    } catch (error) {
      console.error('Error accessing user route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

router.get('/count', async (req: Request, res: Response) => {
  try {
    const totalUsers: number = await User.countDocuments()
    res.status(200).json(totalUsers)
  } catch (error) {
    console.error('Error accessing user route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/stats/monthly', async (req: Request, res: Response) => {
  try {
    const currentYear = new Date().getFullYear()

    const baseCount = await User.countDocuments({
      createdAt: { $lt: new Date(currentYear, 0, 1) }
    })

    const monthly = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])

    let cumulative = baseCount
    const stats = Array.from({ length: 12 }, (_, i) => {
      const found = monthly.find((m) => m._id === i + 1)
      cumulative += found?.count ?? 0
      return { month: i + 1, total: cumulative }
    })

    res.status(200).json({ stats })
  } catch (error) {
    console.error('Error accessing user route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
