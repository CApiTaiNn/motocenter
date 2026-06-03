import Message from '../models/Message'
import { type Request, Response, Router } from 'express'
import { prepareQuery, type ReqQuery } from '../utils/find'
import { attachUser } from '../utils/attach'

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
    const { project, sort, limit, filter, deep } = prepareQuery(req.query)
    try {
      const messages = await Message.find(filter)
        .select(project)
        .sort(sort)
        .limit(limit)
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
router.post('/', async (req: Request, res: Response) => {
  try {
    const message = new Message(req.body)
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
router.patch('/', async (req: Request, res: Response) => {
  const { userId, messageId, like } = req.body

  if (!userId || !messageId) {
    return res.status(400).json({ error: 'userId and messageId are required' })
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

export default router
