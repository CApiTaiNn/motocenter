import Message from '../models/Message'
import { type Request, Response, Router } from 'express'
import { prepareQuery, type ReqQuery } from '../utils/find'
import { attachUser } from '../utils/attach'
import { authenticateToken, isAdminUser } from '../utils/auth'
import { isValidObjectId } from 'mongoose'

const router = Router()
/**
 * @openapi
 * /messages:
 *   get:
 *     summary: Récupérer la liste des messages
 *     tags:
 *       - Messages
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
 *         description: Inclure les données utilisateur (populate)
 *     responses:
 *       200:
 *         description: Liste des messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/',
  async (req: Request<unknown, unknown, unknown, ReqQuery>, res) => {
    const { project, sort, limit, skip, filter, deep } = prepareQuery(req.query)
    try {
      const messages = await Message.find(filter)
        .select(project)
        .sort(sort)
        .skip(skip).limit(limit)
        .lean()
      if (deep) {
        await attachUser(messages, 'user')
      }
      res.status(200).json({ messages })
    } catch (error) {
      console.error('Error accessing message route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
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
 *         description: ID du message
 *     responses:
 *       200:
 *         description: Liste des réponses
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
 *         description: Message non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id/responses', async (req, res) => {
  try {
    const message = await Message.findOne({ _id: req.params.id })
    if (!message) {
      return res.status(404).json({ error: 'Message not found' })
    }
    const messages = await Message.find({
      reference: message._id,
      referenceModel: 'Message'
    }).lean()

    await attachUser(messages, 'user')

    res.json({ messages })
  } catch (error) {
    console.error('Error accessing message route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @openapi
 * /messages:
 *   post:
 *     summary: Créer un message
 *     tags:
 *       - Messages
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Message'
 *     responses:
 *       201:
 *         description: Message créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Erreur serveur
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.user as { id: string }
    const { content, reference, referenceModel } = req.body
    const message = new Message({
      content,
      reference,
      referenceModel,
      user: userId
    })
    await message.save()
    res.status(201).json(message)
  } catch (error) {
    console.error('Error creating message:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @openapi
 * /messages:
 *   patch:
 *     summary: Like ou dislike un message
 *     tags:
 *       - Messages
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - messageId
 *               - like
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID de l'utilisateur
 *               messageId:
 *                 type: string
 *                 description: ID du message
 *               like:
 *                 type: boolean
 *                 description: true pour like, false pour dislike
 *     responses:
 *       200:
 *         description: Message mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 populatedMessage:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Paramètres manquants
 *       404:
 *         description: Message non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.patch('/', authenticateToken, async (req: Request, res: Response) => {
  const { messageId, like } = req.body
  const { id: userId } = req.user as { id: string }

  if (!messageId) {
    return res.status(400).json({ error: 'messageId is required' })
  }

  try {
    const message = await Message.findById(messageId)
    if (!message) return res.status(404).json({ error: 'Message not found' })

    const isAlreadyLiked = message.usersLikeId.includes(userId)
    const isAlreadyDisliked = message.usersDislikeId.includes(userId)

    let update = {}

    if (like) {
      if (isAlreadyLiked) {
        update = { $pull: { usersLikeId: userId } }
      } else {
        update = {
          $addToSet: { usersLikeId: userId },
          $pull: { usersDislikeId: userId }
        }
      }
    } else {
      if (isAlreadyDisliked) {
        update = { $pull: { usersDislikeId: userId } }
      } else {
        update = {
          $addToSet: { usersDislikeId: userId },
          $pull: { usersLikeId: userId }
        }
      }
    }

    await Message.findByIdAndUpdate(messageId, update)

    const finalMessage = await Message.findById(messageId)
    if (!finalMessage) {
      return res.status(404).json({ error: 'Message not found' })
    }
    finalMessage.like = finalMessage.usersLikeId.length
    finalMessage.dislike = finalMessage.usersDislikeId.length
    await finalMessage.save()
    const result = await Message.findById(messageId).lean()
    if (result) await attachUser([result], 'user')
    res.status(200).json({ populatedMessage: result })
  } catch (error) {
    console.error('Error updating message reaction:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
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
 *         description: ID du message
 *     responses:
 *       204:
 *         description: Message supprimé
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé (ni auteur ni admin)
 *       404:
 *         description: Message non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete(
  '/:id',
  authenticateToken,
  async (req: Request<{ id: string }>, res: Response) => {
    const { id: authUserId } = req.user as { id: string }
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(404).json({ error: 'Message not found' })
      }
      const message = await Message.findById(req.params.id)
      if (!message) {
        return res.status(404).json({ error: 'Message not found' })
      }

      // Only the author (or an admin) may delete a message.
      const isOwner = message.user?.toString() === authUserId
      if (!isOwner && !(await isAdminUser(authUserId))) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      // Cascade: remove direct responses so they don't become orphans.
      await Message.deleteMany({
        reference: message._id,
        referenceModel: 'Message'
      })
      await message.deleteOne()
      res.status(204).end()
    } catch (error) {
      console.error('Error deleting message:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

export default router
