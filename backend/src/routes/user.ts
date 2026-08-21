import User from '../models/User'
import Post from '../models/Post'
import Message from '../models/Message'
import Ride from '../models/Ride'
import { IUser } from '../types/user'
import { authenticateToken, requireAdmin, getAuthUser } from '../utils/auth'
import { prepareQuery, ADMIN_MAX_LIMIT, type ReqQuery } from '../utils/find'
import { argon2PasswordHasher } from '../utils/hash'
import { sendWelcomeEmail } from '../utils/mail'
import { makeRateLimiter } from '../utils/rateLimit'
import { validatePassword } from '../utils/passwordPolicy'
import { generateToken } from '../utils/tokens'
import { type Request, Response, Router } from 'express'
import type { Types } from 'mongoose'

const { hash } = argon2PasswordHasher

const router = Router()

// Shared placeholder that inherits the content of deleted accounts, so posts,
// messages and rides others replied to stay readable instead of dangling.
const DELETED_PLACEHOLDER = {
  email: 'deleted-user@motocenter.invalid',
  pseudo: 'compte-supprimé',
  firstname: 'Compte',
  lastname: 'Supprimé'
}

// Get (or lazily create) the singleton placeholder user.
async function getDeletedPlaceholderId(): Promise<Types.ObjectId> {
  const existing = await User.findOne({
    email: DELETED_PLACEHOLDER.email
  }).select('_id')
  if (existing) return existing._id
  const created = await User.create({
    ...DELETED_PLACEHOLDER,
    password: await hash('deleted-account-no-login'),
    isAdmin: false,
    idMoto: ''
  })
  return created._id
}

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
  async (req: Request, res) => {
    const { project } = prepareQuery(req.query as ReqQuery)
    const { id } = getAuthUser(req)

    const users = await User.findById(id).select(project)
    res.status(200).json({ users })
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
// Throttle account creation to slow mass-registration / enumeration probing.
router.post('/account', makeRateLimiter(20), async (req: Request, res: Response) => {
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
  if (
    typeof firstname !== 'string' ||
    typeof lastname !== 'string' ||
    typeof pseudo !== 'string' ||
    !firstname ||
    !lastname ||
    !pseudo
  ) {
    return res
      .status(400)
      .json({ error: 'Firstname, lastname and pseudo are required' })
  }

  const passwordCheck = validatePassword(password, { email, pseudo })
  if (!passwordCheck.valid) {
    return res.status(400).json({ error: passwordCheck.message })
  }

  if (await User.findOne({ email })) {
    return res.status(409).json({ error: 'User already exists' })
  }

  // pseudo is the public display identity; enforce uniqueness at signup
  // (the schema's unique index is the backstop against races).
  if (await User.findOne({ pseudo })) {
    return res.status(409).json({ error: 'Pseudo already taken' })
  }

  // Email-verification token: store the hash, send the raw value in the link.
  const verification = generateToken()

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
    idMoto: '',
    emailVerified: false,
    emailVerificationToken: verification.hash,
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
  }

  const created = await User.insertOne(newUser)

  // Fire-and-forget welcome + verification email: delivery is best-effort and
  // must never block or fail signup (no-ops when Resend isn't configured).
  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  const verifyUrl = `${appUrl}/verify-email?token=${verification.raw}`
  void sendWelcomeEmail({ to: email, firstname, verifyUrl }).catch((err) =>
    console.error('Failed to send welcome email:', err)
  )

  // Minimal echo: the client only needs the new id (it re-fetches via login).
  res.status(201).json({ _id: created._id })
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
    const { id } = getAuthUser(req)

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

    if (updateData.password !== undefined) {
      const passwordCheck = validatePassword(updateData.password, {
        pseudo: updateData.pseudo
      })
      if (!passwordCheck.valid) {
        return res.status(400).json({ error: passwordCheck.message })
      }
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
    const { id } = getAuthUser(req)

    const user = await User.findById(id).select('_id')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const placeholderId = await getDeletedPlaceholderId()

    // Reassign authored content to the placeholder so it never dangles.
    await Post.updateMany({ user: id } as never, { user: placeholderId } as never)
    await Message.updateMany(
      { user: id } as never,
      { user: placeholderId } as never
    )
    await Ride.updateMany({ user_id: id }, { user_id: placeholderId.toString() })

    // Pull the user from every reaction/participation array, recomputing the
    // denormalised counters from the (string) arrays in the same update.
    await Ride.updateMany(
      { liked_id: id },
      [
        { $set: { liked_id: { $setDifference: ['$liked_id', [id]] } } },
        { $set: { like: { $size: '$liked_id' } } }
      ],
      { updatePipeline: true }
    )
    await Ride.updateMany(
      { participating_user: id },
      { $pull: { participating_user: id } }
    )
    await Message.updateMany(
      { $or: [{ usersLikeId: id }, { usersDislikeId: id }] },
      [
        {
          $set: {
            usersLikeId: { $setDifference: ['$usersLikeId', [id]] },
            usersDislikeId: { $setDifference: ['$usersDislikeId', [id]] }
          }
        },
        {
          $set: {
            like: { $size: '$usersLikeId' },
            dislike: { $size: '$usersDislikeId' }
          }
        }
      ],
      { updatePipeline: true }
    )
    await Post.updateMany(
      { userFavoritePost: id },
      { $pull: { userFavoritePost: id } }
    )

    await User.findByIdAndDelete(id)
    res.status(200).json({ message: 'User deleted successfully' })
  }
)

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Récupérer la liste complète des utilisateurs (réservé aux administrateurs)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         description: Champs à retourner (le mot de passe est toujours exclu)
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
 *       401:
 *         description: Token manquant ou invalide
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/',
  authenticateToken,
  requireAdmin,
  async (req: Request<unknown, unknown, unknown, ReqQuery>, res: Response) => {
    // Admin-only and trusted: no field allowlist, but the central operator
    // hardening still applies and admins keep the high limit their tables need.
    const { project, sort, limit, skip, filter } = prepareQuery(req.query, {
      maxLimit: ADMIN_MAX_LIMIT
    })

    // Admins may read any field, but never the password hash. Strip it from
    // the projection: with project=all (project === {}) fall back to an
    // explicit -password exclusion; otherwise drop an explicit request for it.
    const projection = { ...project }
    delete projection.password

    const query = User.find(filter).sort(sort).skip(skip).limit(limit)
    query.select(Object.keys(projection).length > 0 ? projection : '-password')
    const users = await query
    res.status(200).json({ users })
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
  const totalUsers: number = await User.countDocuments()
  res.status(200).json(totalUsers)
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
})

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Récupérer le profil public d'un utilisateur
 *     description: Champs publics uniquement (pseudo, userType, ridingStartYear, image). Utilisé pour afficher l'auteur d'une sortie.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant de l'utilisateur
 *     responses:
 *       200:
 *         description: Profil public de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Identifiant invalide
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', async (req: Request, res: Response) => {
  // Public profile data only — never email or other private fields.
  // A malformed ObjectId throws a CastError, which the central handler maps
  // to a 400.
  const users = await User.findById(req.params.id).select(
    'pseudo userType ridingStartYear image'
  )

  if (!users) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.status(200).json({ users })
})

export default router
