import { Request, Router } from 'express'
import { prepareQuery, ReqQuery } from '../utils/find'
import Post from '../models/Post'
import Message from '../models/Message'
import Brand, { toBrandSnapshot } from '../models/Brand'
import User from '../models/User'
import Motorcycle from '../models/Motorcycle'
import { PostCategory } from '../constants/PostCategory'
import { attachUser } from '../utils/attach'
import {
  authenticateToken,
  optionalAuth,
  getAuthUser,
  assertOwnerOrAdmin
} from '../utils/auth'
import { makeRateLimiter } from '../utils/rateLimit'
import { fetchList } from '../utils/list'
import { summarizeReactionsMany } from '../utils/reactions'
import { requireString, requireOneOf } from '../utils/validate'
import { argon2PasswordHasher } from '../utils/hash'
import { isValidObjectId, type Types } from 'mongoose'

const router = Router()

const POST_CATEGORIES = Object.values(PostCategory)

// The system author of motorcycle discussion threads. Resolved by firstname,
// and lazily created if missing so the feature never 400s on a DB that wasn't
// seeded with it.
async function getSystemUserId(): Promise<Types.ObjectId> {
  const existing = await User.findOne({ firstname: 'MotoCenter' }).select('_id')
  if (existing) return existing._id
  const created = await User.create({
    firstname: 'MotoCenter',
    lastname: 'Officiel',
    pseudo: 'MotoCenter',
    email: 'system@motocenter.invalid',
    password: await argon2PasswordHasher.hash('system-account-no-login'),
    isAdmin: false,
    idMoto: ''
  })
  return created._id
}

// Reaction arrays must never expose *who* favorited a post; collapse to a
// per-viewer boolean on every read.
const POST_REACTIONS = [{ array: 'userFavoritePost', flag: 'favoritedByMe' }]

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
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *       - in: query
 *         name: deep
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Liste des posts
 */
router.get(
  '/',
  optionalAuth,
  async (req: Request<unknown, unknown, unknown, ReqQuery>, res) => {
    const viewerId = req.user?.id
    // brand is embedded on the document; only users need resolving.
    const posts = await fetchList(
      Post,
      req.query,
      {
        // Forum browsing: filter by author/brand/category/date, plus the
        // search bar (regex on title only, escaped server-side).
        filterable: [
          '_id',
          'id',
          'createdAt',
          'brand._id',
          'category',
          'title',
          'user'
        ],
        regexFields: ['title']
      },
      {
        lean: true,
        attach: (docs, deep) =>
          deep ? attachUser(docs, 'user').then(() => {}) : Promise.resolve()
      }
    )
    summarizeReactionsMany(posts, viewerId, POST_REACTIONS)
    res.status(200).json({ posts })
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
 */
router.get('/count', async (req, res) => {
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
})

/**
 * @openapi
 * /posts/favorites:
 *   get:
 *     summary: Récupérer les posts favoris de l'utilisateur connecté
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des posts favoris du caller
 *       401:
 *         description: Non authentifié
 */
// Server-side favorites lookup: returns only the caller's favorited posts,
// so the client no longer has to download every post and filter locally
// (and the favoriting users of other posts are never disclosed).
router.get('/favorites', authenticateToken, async (req, res) => {
  const { id } = getAuthUser(req)
  const posts = await Post.find({ userFavoritePost: id })
    .select('image content title createdAt views brand user category')
    .lean()
  await attachUser(posts, 'user')
  for (const post of posts as unknown as Record<string, unknown>[]) {
    post.favoritedByMe = true
  }
  res.status(200).json({ posts })
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
 *     responses:
 *       200:
 *         description: Liste des messages du post
 *       404:
 *         description: Post non trouvé
 */
router.get(
  '/:id/responses',
  optionalAuth,
  async (req: Request<{ id: string }, unknown, unknown, ReqQuery>, res) => {
    const viewerId = req.user?.id
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Post not found' })
    }
    const { project, sort, deep, limit, skip } = prepareQuery(req.query)
    const post = await Post.findById(req.params.id)
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }
    const messages = await Message.find({
      reference: post._id,
      referenceModel: 'Post'
    })
      // Always fetch the reaction arrays so per-viewer flags can be derived,
      // even if the client projection omitted them.
      .select(project)
      .select('+usersLikeId +usersDislikeId')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()

    if (deep) {
      await attachUser(messages, 'user')
    }
    summarizeReactionsMany(messages, viewerId, [
      { array: 'usersLikeId', flag: 'likedByMe' },
      { array: 'usersDislikeId', flag: 'dislikedByMe' }
    ])

    res.json({ messages })
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
 *     responses:
 *       204:
 *         description: Vue ajoutée avec succès
 */
// Anonymous visitors legitimately generate views, so no auth — but throttle
// so the counter can't be inflated in bulk.
router.post('/add-view', makeRateLimiter(60), async (req, res) => {
  const { filter } = prepareQuery(req.query)
  // filter.id must be a plain id string: reject operator objects so the
  // counter can't be incremented on an arbitrary matched document.
  const id = typeof filter.id === 'string' ? filter.id : null
  if (!id || !isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid post id' })
  }
  await Post.updateOne({ _id: id }, { $inc: { views: 1 } })
  res.status(204).end()
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
 *     responses:
 *       200:
 *         description: Statut du favori mis à jour
 *       404:
 *         description: Post non trouvé
 */
router.post('/add-favorite', authenticateToken, async (req: Request, res) => {
  const { filter } = prepareQuery(req.query)
  const { id: userId } = getAuthUser(req)
  const id = typeof filter._id === 'string' ? filter._id : null
  if (!id || !isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid post id' })
  }

  const post = await Post.findById(id)
  if (!post) {
    return res.status(404).json({ error: 'Post not found' })
  }

  const isFavorited = (post.userFavoritePost || []).includes(userId)
  const update = isFavorited
    ? { $pull: { userFavoritePost: userId } }
    : { $addToSet: { userFavoritePost: userId } }

  await Post.updateOne({ _id: id }, update)

  res.status(200).json({ isAdded: !isFavorited })
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
 *     responses:
 *       201:
 *         description: Post créé avec succès
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Moto non trouvée
 */
router.post('/', authenticateToken, async (req: Request, res) => {
  const body = req.body
  const { id: authUserId } = getAuthUser(req)

  // Motorcycle discussion thread: a system-owned container post linked to a
  // motorcycle. Authored by the MotoCenter system user, with title/content
  // derived server-side from the motorcycle — so it can't be abused to publish
  // arbitrary content under the official account (the old impersonation bug).
  if (body.isNewMotoComment === true) {
    if (!isValidObjectId(body.motorcycleId)) {
      return res.status(400).json({ error: 'Invalid motorcycle id' })
    }
    const motorcycle = await Motorcycle.findById(body.motorcycleId)
    if (!motorcycle) {
      return res.status(404).json({ error: 'Motorcycle not found' })
    }
    // Idempotent: a motorcycle already has at most one discussion. Return the
    // existing one instead of creating a duplicate or hijacking the link.
    if (motorcycle.post) {
      return res.status(200).json({ _id: motorcycle.post })
    }
    const brand = await Brand.findOne({ name: motorcycle.brand?.name })
    if (!brand) {
      return res.status(400).json({ error: 'Unknown brand' })
    }
    const systemUserId = await getSystemUserId()
    const postCreated = await Post.insertOne({
      title: motorcycle.name,
      content: `Discussion autour de la ${brand.name} ${motorcycle.name}`,
      // Mongoose casts the ObjectId to the User ref at write time.
      user: systemUserId as never,
      brand: toBrandSnapshot(brand),
      category: PostCategory.MODEL,
      isNewMotoComment: true
    })
    // Only set the link when the motorcycle has none, so a concurrent request
    // can't overwrite an existing discussion pointer.
    await Motorcycle.updateOne(
      { _id: motorcycle._id, post: { $exists: false } },
      { post: postCreated._id }
    )
    return res.status(201).json({ _id: postCreated._id })
  }

  // Normal forum post: always authored by the connected user.
  const title = requireString(body.title, 'title')
  const content = requireString(body.content, 'content')
  const category = requireOneOf(body.category, POST_CATEGORIES, 'category')
  const brand = await Brand.findOne({ name: body.brand })
  const author = await User.findById(authUserId)
  if (!brand || !author) {
    return res.status(400).json({ error: 'Unknown brand or user' })
  }

  const postCreated = await Post.insertOne({
    title,
    content,
    user: author,
    brand: toBrandSnapshot(brand),
    category,
    image: body.url
  })

  res.status(201).json({ _id: postCreated._id })
})

/**
 * @openapi
 * /posts:
 *   put:
 *     summary: Mettre à jour un post existant (auteur ou admin)
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
 *         description: Post mis à jour avec succès
 *       403:
 *         description: Non autorisé (ni auteur ni admin)
 *       404:
 *         description: Post non trouvé
 */
router.put('/', authenticateToken, async (req: Request, res) => {
  const { filter } = prepareQuery(req.query)
  const { id: authUserId } = getAuthUser(req)
  const body = req.body

  if (!isValidObjectId(filter.id)) {
    return res.status(404).json({ error: 'Post not found' })
  }
  const existing = await Post.findById(filter.id)
  if (!existing) {
    return res.status(404).json({ error: 'Post not found' })
  }

  // Only the author (or an admin) may edit a post.
  await assertOwnerOrAdmin(existing.user?.toString(), authUserId)

  const title = requireString(body.title, 'title')
  const content = requireString(body.content, 'content')
  const category = requireOneOf(body.category, POST_CATEGORIES, 'category')
  const brand = await Brand.findOne({ name: body.brand })
  if (!brand) {
    return res.status(400).json({ error: 'Unknown brand' })
  }

  await Post.findByIdAndUpdate(
    filter.id,
    {
      title,
      content,
      category,
      brand: toBrandSnapshot(brand),
      image: body.url
    },
    { runValidators: true }
  )
  res.status(204).end()
})

/**
 * @openapi
 * /posts/{id}:
 *   delete:
 *     summary: Supprimer un post (auteur ou admin), ses messages et son lien moto
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Post supprimé
 *       403:
 *         description: Non autorisé (ni auteur ni admin)
 *       404:
 *         description: Post non trouvé
 */
router.delete(
  '/:id',
  authenticateToken,
  async (req: Request<{ id: string }>, res) => {
    const { id: authUserId } = getAuthUser(req)
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Post not found' })
    }
    const post = await Post.findById(req.params.id)
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Only the author (or an admin) may delete a post.
    await assertOwnerOrAdmin(post.user?.toString(), authUserId)

    // Cascade: drop the post's messages and detach it from its motorcycle.
    await Message.deleteMany({ reference: post._id, referenceModel: 'Post' })
    await Motorcycle.updateMany(
      { post: post._id.toString() },
      { $unset: { post: 1 } }
    )
    await post.deleteOne()
    res.status(204).end()
  }
)

export default router
