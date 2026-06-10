import Message from '../models/Message'
import { type Request, Response, Router } from 'express'
import { type ReqQuery } from '../utils/find'
import { attachUser } from '../utils/attach'
import {
  authenticateToken,
  optionalAuth,
  getAuthUser,
  assertOwnerOrAdmin
} from '../utils/auth'
import { fetchList } from '../utils/list'
import { summarizeReactions, summarizeReactionsMany } from '../utils/reactions'
import { requireString, requireOneOf } from '../utils/validate'
import { isValidObjectId } from 'mongoose'

const router = Router()

// Reaction arrays never leave the API as raw id lists; collapse to per-viewer
// booleans + the existing like/dislike counts.
const MESSAGE_REACTIONS = [
  { array: 'usersLikeId', flag: 'likedByMe' },
  { array: 'usersDislikeId', flag: 'dislikedByMe' }
]

/**
 * @openapi
 * /messages:
 *   get:
 *     summary: Récupérer la liste des messages
 *     tags:
 *       - Messages
 *     responses:
 *       200:
 *         description: Liste des messages
 */
router.get(
  '/',
  optionalAuth,
  async (req: Request<unknown, unknown, unknown, ReqQuery>, res) => {
    const viewerId = req.user?.id
    const messages = await fetchList(
      Message,
      req.query,
      { filterable: ['_id', 'reference', 'referenceModel', 'user'] },
      {
        lean: true,
        attach: (docs, deep) =>
          deep ? attachUser(docs, 'user').then(() => {}) : Promise.resolve()
      }
    )
    summarizeReactionsMany(messages, viewerId, MESSAGE_REACTIONS)
    res.status(200).json({ messages })
  }
)

/**
 * @openapi
 * /messages/{id}/responses:
 *   get:
 *     summary: Récupérer les réponses d’un message
 *     tags:
 *       - Messages
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des réponses
 *       404:
 *         description: Message non trouvé
 */
router.get('/:id/responses', optionalAuth, async (req, res) => {
  const viewerId = req.user?.id
  if (!isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Message not found' })
  }
  const message = await Message.findOne({ _id: req.params.id })
  if (!message) {
    return res.status(404).json({ error: 'Message not found' })
  }
  const messages = await Message.find({
    reference: message._id,
    referenceModel: 'Message'
  })
    // Only the fields the thread UI renders — not reference/referenceModel/__v.
    .select('content user createdAt like dislike usersLikeId usersDislikeId')
    .lean()

  await attachUser(messages, 'user')
  summarizeReactionsMany(messages, viewerId, MESSAGE_REACTIONS)

  res.json({ messages })
})

/**
 * @openapi
 * /messages:
 *   post:
 *     summary: Créer un message
 *     tags:
 *       - Messages
 *     responses:
 *       201:
 *         description: Message créé
 *       400:
 *         description: Données invalides
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const { id: userId } = getAuthUser(req)
  const { content, reference, referenceModel } = req.body

  // Validate up front so a bad payload is a 400, not a Mongoose 500.
  requireString(content, 'content')
  if (reference !== undefined || referenceModel !== undefined) {
    if (!isValidObjectId(reference)) {
      return res.status(400).json({ error: 'Invalid reference' })
    }
    requireOneOf(referenceModel, ['Post', 'Message'] as const, 'referenceModel')
  }

  const message = new Message({
    content,
    reference,
    referenceModel,
    user: userId
  })
  await message.save()
  // Minimal echo: clients only check success and re-fetch the thread.
  res.status(201).json({ _id: message._id })
})

/**
 * @openapi
 * /messages:
 *   patch:
 *     summary: Like ou dislike un message
 *     tags:
 *       - Messages
 *     responses:
 *       200:
 *         description: Message mis à jour
 *       400:
 *         description: Paramètres manquants
 *       404:
 *         description: Message non trouvé
 */
router.patch('/', authenticateToken, async (req: Request, res: Response) => {
  const { messageId, like } = req.body
  const { id: userId } = getAuthUser(req)

  if (!isValidObjectId(messageId)) {
    return res.status(400).json({ error: 'messageId is required' })
  }

  const message = await Message.findById(messageId)
  if (!message) return res.status(404).json({ error: 'Message not found' })

  const isAlreadyLiked = message.usersLikeId.includes(userId)
  const isAlreadyDisliked = message.usersDislikeId.includes(userId)

  let update: Record<string, unknown>

  if (like) {
    update = isAlreadyLiked
      ? { $pull: { usersLikeId: userId } }
      : {
          $addToSet: { usersLikeId: userId },
          $pull: { usersDislikeId: userId }
        }
  } else {
    update = isAlreadyDisliked
      ? { $pull: { usersDislikeId: userId } }
      : {
          $addToSet: { usersDislikeId: userId },
          $pull: { usersLikeId: userId }
        }
  }

  await Message.findByIdAndUpdate(messageId, update)

  // Recompute the denormalised counters from the authoritative arrays so they
  // can't drift, then serialise without leaking the raw arrays.
  const finalMessage = await Message.findById(messageId)
  if (!finalMessage) {
    return res.status(404).json({ error: 'Message not found' })
  }
  finalMessage.like = finalMessage.usersLikeId.length
  finalMessage.dislike = finalMessage.usersDislikeId.length
  await finalMessage.save()

  const result = await Message.findById(messageId).lean()
  if (result) {
    delete (result as { __v?: number }).__v
    await attachUser([result], 'user')
    summarizeReactions(result, userId, MESSAGE_REACTIONS)
  }
  res.status(200).json({ populatedMessage: result })
})

/**
 * @openapi
 * /messages/{id}:
 *   delete:
 *     summary: Supprimer un message (auteur ou admin) et ses réponses
 *     tags:
 *       - Messages
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Message supprimé
 *       403:
 *         description: Non autorisé (ni auteur ni admin)
 *       404:
 *         description: Message non trouvé
 */
router.delete(
  '/:id',
  authenticateToken,
  async (req: Request<{ id: string }>, res: Response) => {
    const { id: authUserId } = getAuthUser(req)
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Message not found' })
    }
    const message = await Message.findById(req.params.id)
    if (!message) {
      return res.status(404).json({ error: 'Message not found' })
    }

    // Only the author (or an admin) may delete a message.
    await assertOwnerOrAdmin(message.user?.toString(), authUserId)

    // Cascade: remove direct responses so they don't become orphans.
    await Message.deleteMany({
      reference: message._id,
      referenceModel: 'Message'
    })
    await message.deleteOne()
    res.status(204).end()
  }
)

export default router
