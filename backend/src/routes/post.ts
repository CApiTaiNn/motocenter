import { Request, Router } from 'express'
import { prepareQuery, ReqQuery } from '../utils/find'
import Post from '../models/Post'
import Message from '../models/Message'
import Brand from '../models/Brand'
import User from '../models/User'
import Motorcycle from '../models/Motorcycle'
import { PostCategory } from '../constants/PostCategory'
import { attachUser } from '../utils/attach'
import { authenticateToken } from '../utils/auth'

const router = Router()

const isValidCategory = (value: unknown): value is PostCategory =>
  Object.values(PostCategory).includes(value as PostCategory)

/**
 * @openapi
 * /posts:
 *   get:
 *     summary: Récupérer la liste des posts
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         description: Champs à retourner
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
 *       - in: query
 *         name: deep
 *         schema:
 *           type: boolean
 *         description: Inclure les données utilisateur, marque et catégorie (populate)
 *     responses:
 *       200:
 *         description: Liste des posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/',
  async (req: Request<unknown, unknown, unknown, ReqQuery>, res: any) => {
    const { project, sort, deep, limit, filter } = prepareQuery(req.query)
    try {
      let query = Post.find(filter).select(project).sort(sort).limit(limit)
      if (deep) {
        query = query.populate('brand')
      }
      const posts = await query.lean()
      if (deep) {
        await attachUser(posts, 'user')
      }
      res.status(200).json({ posts })
    } catch (error) {
      console.error('Error accessing message route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

/**
 * @openapi
 * /posts/count:
 *   get:
 *     summary: Compter les posts créés sur les deux derniers mois
 *     tags:
 *       - Posts
 *     responses:
 *       200:
 *         description: Nombre de posts et évolution en pourcentage
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Nombre de posts créés sur le mois en cours
 *                 percent:
 *                   type: number
 *                   description: Évolution en % par rapport au mois précédent
 *       500:
 *         description: Erreur serveur
 */
router.get('/count', async (req, res) => {
  try {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const intermediate = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = now
    const countFirstPeriod = await Post.countDocuments({
      createdAt: { $gte: start, $lt: intermediate }
    })
    const countSecondPeriod = await Post.countDocuments({
      createdAt: { $gte: intermediate, $lt: end }
    })

    const percent =
      countFirstPeriod === 0
        ? countSecondPeriod * 100
        : ((countSecondPeriod - countFirstPeriod) / countFirstPeriod) * 100

    res.status(200).json({ count: countSecondPeriod, percent })
  } catch (error) {
    console.error('Error counting posts:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @openapi
 * /posts/{id}/responses:
 *   get:
 *     summary: Récupérer les messages associés à un post
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du post
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         description: Champs à retourner
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
 *         name: deep
 *         schema:
 *           type: boolean
 *         description: Inclure les données utilisateur (populate)
 *     responses:
 *       200:
 *         description: Liste des messages du post
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       404:
 *         description: Post non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/:id/responses',
  async (req: Request<{ id: string }, unknown, unknown, ReqQuery>, res) => {
    const { project, sort, deep, limit } = prepareQuery(req.query)
    try {
      const post = await Post.findOne({ _id: req.params.id })
      if (!post) {
        return res.status(404).json({ error: 'Post not found' })
      }
      const messages = await Message.find({
        // TODO: mettre filter
        reference: post._id,
        referenceModel: 'Post'
      })
        .select(project)
        .sort(sort)
        .limit(limit)
        .lean()

      if (deep) {
        await attachUser(messages, 'user')
      }

      res.json({ messages })
    } catch (error) {
      console.error('Error accessing message route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

/**
 * @openapi
 * /posts/add-view:
 *   post:
 *     summary: Incrémenter le compteur de vues d'un post
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: query
 *         name: filter
 *         required: true
 *         schema:
 *           type: string
 *         description: Filtre contenant l'id du post (ex. {"id":"..."})
 *     responses:
 *       204:
 *         description: Vue ajoutée avec succès
 *       500:
 *         description: Erreur serveur
 */
router.post('/add-view', async (req, res) => {
  const { filter } = prepareQuery(req.query)
  try {
    await Post.updateOne({ _id: filter.id }, { $inc: { views: 1 } })
    res.status(204).end()
  } catch (error) {
    console.error('Error accessing message route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @openapi
 * /posts/add-favorite:
 *   post:
 *     summary: Ajouter ou retirer un post des favoris d'un utilisateur
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: query
 *         name: filter
 *         required: true
 *         schema:
 *           type: string
 *         description: Filtre contenant l'_id du post (ex. {"_id":"..."})
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Statut du favori mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isAdded:
 *                   type: boolean
 *                   description: true si ajouté aux favoris, false si retiré
 *       404:
 *         description: Post non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post('/add-favorite', authenticateToken, async (req: Request, res) => {
  const { filter } = prepareQuery(req.query)
  const { id: userId } = req.user as { id: string }
  try {
    const post = await Post.findById(filter._id)

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    const favorites = post.userFavoritePost || []
    const isFavorited = favorites.includes(userId)

    const update = isFavorited
      ? { $pull: { userFavoritePost: userId } }
      : { $addToSet: { userFavoritePost: userId } }

    await Post.updateOne({ _id: filter._id }, update)

    res.status(200).json({ isAdded: !isFavorited })
  } catch (error) {
    console.error('Error accessing message route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @openapi
 * /posts:
 *   post:
 *     summary: Créer un post
 *     tags:
 *       - Posts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - brand
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *                 description: Titre du post
 *               content:
 *                 type: string
 *                 description: Contenu du post
 *               brand:
 *                 type: string
 *                 description: Nom de la marque associée
 *               category:
 *                 type: string
 *                 description: Nom de la catégorie associée
 *               user:
 *                 type: string
 *                 description: ID de l'utilisateur (ignoré si isNewMotoComment est false)
 *               isNewMotoComment:
 *                 type: boolean
 *                 description: Si false, utilise l'utilisateur MotoCenter par défaut
 *               url:
 *                 type: string
 *                 description: URL de l'image du post
 *     responses:
 *       201:
 *         description: Post créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: ID du post créé
 *       500:
 *         description: Erreur serveur
 */
router.post('/', authenticateToken, async (req: Request, res) => {
  try {
    const body = req.body
    const { id: authUserId } = req.user as { id: string }
    const brand = await Brand.findOne({ name: body.brand })

    // Forum posts are authored by the connected user; auto-generated
    // motorcycle discussions are authored by the MotoCenter system user.
    const user =
      body.isNewMotoComment === false
        ? await User.findById(authUserId)
        : await User.findOne({ firstname: 'MotoCenter' })

    if (!brand || !user) {
      return res.status(400).json({ error: 'Unknown brand or user' })
    }
    if (!isValidCategory(body.category)) {
      return res.status(400).json({ error: 'Invalid category' })
    }
    const postCreated = await Post.insertOne({
      title: body.title,
      content: body.content,
      user: user,
      brand: brand,
      category: body.category,
      image: body.url
    })

    // Attach the post to its motorcycle (model discussions) server-side,
    // so clients don't need write access to the admin-only motorcycle route.
    if (body.motorcycleId) {
      await Motorcycle.updateOne(
        { _id: body.motorcycleId },
        { post: postCreated._id }
      )
    }

    res.status(201).json({ _id: postCreated._id })
  } catch (error) {
    console.error('Error creating post:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @openapi
 * /posts:
 *   put:
 *     summary: Mettre à jour un post existant
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant du post à mettre à jour
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - brand
 *               - category
 *               - user
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               url:
 *                 type: string
 *                 description: URL de l'image du post
 *               brand:
 *                 type: string
 *                 description: Nom de la marque
 *               category:
 *                 type: string
 *                 description: Nom de la catégorie
 *               user:
 *                 type: string
 *                 description: ID de l’utilisateur
 *     responses:
 *       204:
 *         description: Post mis à jour avec succès
 *       500:
 *         description: Erreur serveur
 */
router.put('/', authenticateToken, async (req: Request, res) => {
  const { filter } = prepareQuery(req.query)
  const { id: authUserId } = req.user as { id: string }
  try {
    const body = req.body
    const existing = await Post.findById(filter.id)
    if (!existing) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Only the author (or an admin) may edit a post.
    const requester = await User.findById(authUserId)
    const isOwner = existing.user?.toString() === authUserId
    if (!isOwner && !requester?.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const brand = await Brand.findOne({ name: body.brand })
    if (!brand) {
      return res.status(400).json({ error: 'Unknown brand' })
    }
    if (!isValidCategory(body.category)) {
      return res.status(400).json({ error: 'Invalid category' })
    }

    await Post.findByIdAndUpdate(
      filter.id,
      {
        title: body.title,
        content: body.content,
        category: body.category,
        brand: brand._id,
        image: body.url
      },
      { runValidators: true }
    )
    res.status(204).end()
  } catch (error) {
    console.error('Error updating post:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
