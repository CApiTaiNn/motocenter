import Message from '../models/Message'
import { type Request, Response, Router } from 'express'
import { prepareQuery, type ReqQuery } from '../utils/find'
import { attachUser } from '../utils/attach'

const router = Router()
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
    if (finalMessage) {
      finalMessage.like = finalMessage.usersLikeId.length
      finalMessage.dislike = finalMessage.usersDislikeId.length
      await finalMessage.save()
      const result = await Message.findById(messageId).lean()
      if (result) await attachUser([result], 'user')
      res.status(200).json({ populatedMessage: result })
    }
  } catch (error: any) {
    console.error('ERREUR MONGODB:', error.message)
    res.status(500).json({ error: 'Erreur serveur', details: error.message })
  }
})

export default router
