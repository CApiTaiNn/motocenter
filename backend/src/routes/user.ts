import User from '../models/User'
import { IUser } from '../types/user'
import { authenticateToken } from '../utils/auth'
import { prepareQuery, type ReqQuery } from '../utils/find'
import { argon2PasswordHasher } from '../utils/hash'
import { type Request, Response, Router } from 'express'

const { hash } = argon2PasswordHasher

const router = Router()

/**
 * @openapi
 * /users/account:
 *   get:
 *     summary: Récupérer le compte de l'utilisateur connecté
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         description: Champs à retourner
 *     responses:
 *       200:
 *         description: Données de l'utilisateur connecté
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Token manquant ou invalide
 *       500:
 *         description: Erreur serveur
 */
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

/**
 * @openapi
 * /users/account:
 *   post:
 *     summary: Créer un compte utilisateur
 *     tags:
 *       - Users
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
 *                 format: email
 *                 description: Adresse email de l'utilisateur
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Mot de passe de l'utilisateur
 *               firstname:
 *                 type: string
 *                 description: Prénom de l'utilisateur
 *               lastname:
 *                 type: string
 *                 description: Nom de l'utilisateur
 *               pseudo:
 *                 type: string
 *                 description: Pseudo de l'utilisateur
 *               userType:
 *                 type: string
 *                 description: Type de l'utilisateur
 *               ridingStartYear:
 *                 type: integer
 *                 description: Année de début de pratique de la moto
 *               image:
 *                 type: string
 *                 description: URL de l'avatar de l'utilisateur
 *     responses:
 *       200:
 *         description: Compte créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Email ou mot de passe manquant
 *       409:
 *         description: Un utilisateur avec cet email existe déjà
 *       500:
 *         description: Erreur serveur
 */
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

  // Strings only: objects here would reach Mongo queries as operators.
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  // The model requires these; check here so a bad payload gets a 400
  // instead of a Mongoose validation 500.
  if (!firstname || !lastname || !pseudo) {
    return res
      .status(400)
      .json({ error: 'Firstname, lastname and pseudo are required' })
  }

  try {
    if (await User.findOne({ email })) {
      return res.status(409).json({ error: 'User already exists' })
    }

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

    const created = await User.insertOne(newUser)
    const users = created.toObject() as unknown as Record<string, unknown>
    delete users.password

    res.status(201).json({ users })
  } catch (error) {
    console.error('Error accessing user route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @openapi
 * /users/account:
 *   put:
 *     summary: Mettre à jour le compte de l'utilisateur connecté
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *                 description: Prénom de l'utilisateur
 *               lastname:
 *                 type: string
 *                 description: Nom de l'utilisateur
 *               pseudo:
 *                 type: string
 *                 description: Pseudo de l'utilisateur (doit être unique)
 *               userType:
 *                 type: string
 *                 description: Type de l'utilisateur
 *               ridingStartYear:
 *                 type: integer
 *                 description: Année de début de pratique (entre 1950 et l'année courante)
 *               image:
 *                 type: string
 *                 description: URL de l'avatar de l'utilisateur
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Nouveau mot de passe (sera hashé)
 *     responses:
 *       200:
 *         description: Compte mis à jour avec succès (mot de passe exclu de la réponse)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Année de début de pratique invalide
 *       401:
 *         description: Token manquant ou invalide
 *       404:
 *         description: Utilisateur non trouvé
 *       409:
 *         description: Pseudo déjà utilisé
 *       500:
 *         description: Erreur serveur
 */
router.put(
  '/account',
  authenticateToken,

  async (req: Request, res: Response) => {
    const { id } = req.user as { id: string }

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

    try {
      if (updateData.pseudo !== undefined && typeof updateData.pseudo !== 'string') {
        return res.status(400).json({ error: 'Pseudo must be a string' })
      }
      if (updateData.pseudo) {
        const existingUser = await User.findOne({
          pseudo: updateData.pseudo,
          _id: { $ne: id }
        })
        if (existingUser) {
          return res.status(409).json({ error: 'Pseudo already taken' })
        }
      }

      if (updateData.password) {
        updateData.password = await hash(updateData.password)
      }

      // !== undefined (not truthiness): 0 or '' must be validated, not
      // silently written through.
      if (updateData.ridingStartYear !== undefined) {
        const year = Number(updateData.ridingStartYear)
        const currentYear = new Date().getFullYear()
        if (isNaN(year) || year < 1950 || year > currentYear) {
          return res.status(400).json({
            error: `Riding start year must be between 1950 and ${currentYear}`
          })
        }
      }

      updateData.updatedAt = new Date()

      const users = await User.findByIdAndUpdate(id, updateData, {
        returnDocument: 'after',
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

/**
 * @openapi
 * /users/account:
 *   delete:
 *     summary: Supprimer le compte de l'utilisateur connecté
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compte supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User deleted successfully
 *       401:
 *         description: Token manquant ou invalide
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete(
  '/account',
  authenticateToken,
  async (req: Request, res: Response) => {
    const { id } = req.user as { id: string }

    try {
      const deletedUser = await User.findByIdAndDelete(id)

      if (!deletedUser) {
        return res.status(404).json({ error: 'User not found' })
      }

      res.status(200).json({ message: 'User deleted successfully' })
    } catch (error) {
      console.error('Error deleting user:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Récupérer la liste des utilisateurs (champs publics uniquement)
 *     tags:
 *       - Users
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         description: Champs à retourner (limités à email, pseudo, userType, ridingStartYear, image)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Tri des résultats
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Nombre maximum de résultats
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *         description: Filtres MongoDB
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/',
  async (req: Request<unknown, unknown, unknown, ReqQuery>, res: Response) => {
    // Public profile data only — never email or other private fields.
    const allowedFields = ['pseudo', 'userType', 'ridingStartYear', 'image']
    // This route is unauthenticated: only allow the filters the app needs
    // (ride authors by _id, admin signup stats by createdAt), so the user
    // collection can't be probed on private fields like email or isAdmin.
    const allowedFilterKeys = ['_id', 'createdAt']

    const { project, sort, limit, filter } = prepareQuery(req.query)

    const forbiddenKey = Object.keys(filter).find(
      (key) => !allowedFilterKeys.includes(key)
    )
    if (forbiddenKey) {
      return res
        .status(400)
        .json({ error: `Filtering users on ${forbiddenKey} is not allowed` })
    }

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

/**
 * @openapi
 * /users/count:
 *   get:
 *     summary: Compter le nombre total d'utilisateurs
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: Nombre total d'utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: integer
 *               example: 128
 *       500:
 *         description: Erreur serveur
 */
router.get('/count', async (req: Request, res: Response) => {
  try {
    const totalUsers: number = await User.countDocuments()
    res.status(200).json(totalUsers)
  } catch (error) {
    console.error('Error accessing user route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @openapi
 * /users/stats/monthly:
 *   get:
 *     summary: Récupérer l'évolution mensuelle cumulative du nombre d'utilisateurs pour l'année en cours
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: Statistiques mensuelles cumulatives
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: integer
 *                         description: Numéro du mois (1 à 12)
 *                       total:
 *                         type: integer
 *                         description: Nombre cumulé d'utilisateurs depuis l'origine jusqu'à ce mois
 *       500:
 *         description: Erreur serveur
 */
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
