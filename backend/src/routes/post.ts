import { Request, Router } from 'express'
import { prepareQuery, ReqQuery } from '../utils/find'
import Post from '../models/Post'
import Message from '../models/Message'
import Brand from '../models/Brand'
import User from '../models/User'
import Category from '../models/Category'
import { attachUser } from '../utils/attach'

const router = Router()
router.get(
  '/',
  async (req: Request<unknown, unknown, unknown, ReqQuery>, res: any) => {
    const { project, sort, deep, limit, filter } = prepareQuery(req.query)
    try {
      let query = Post.find(filter).select(project).sort(sort).limit(limit)
      if (deep) {
        query = query.populate('brand').populate('category')
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

router.get('/count', async (req, res) => {
  try {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const intermediate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date()
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

router.post('/add-view', async (req, res) => {
  const { filter } = prepareQuery(req.query)
  try {
    await Post.updateOne({ _id: filter.id }, { $inc: { views: 1 } })
    res.status(204).json()
  } catch (error) {
    console.error('Error accessing message route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/add-favorite', async (req, res) => {
  const { filter } = prepareQuery(req.query)
  const { userId } = req.body
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

router.post('/', async (req, res) => {
  try {
    const body = req.body
    const brand = await Brand.findOne({ name: body.brand })
    const category = await Category.findOne({ name: body.category })
    let user = await User.findOne({ firstname: 'MotoCenter' })
    if (body.isNewMotoComment === false) {
      user = await User.findOne({ _id: body.user })
    }

    if (!brand || !category || !user) {
      return res.status(500).json({ error: 'Internal server error' })
    }
    const postCreated = await Post.insertOne({
      title: body.title,
      content: body.content,
      user: user,
      brand: brand,
      category: category,
      image: body.url
    })
    res.status(201).json({ _id: postCreated._id })
  } catch (error) {
    console.error('Error accessing message route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/', async (req, res) => {
  const { filter } = prepareQuery(req.query)
  try {
    const body = req.body
    const brand = await Brand.findOne({ name: body.brand })
    const category = await Category.findOne({ name: body.category })
    const user = await User.findOne({ _id: body.user })

    if (!brand || !category || !user) {
      return res.status(500).json({ error: 'Internal server error' })
    }

    const updatePost = await Post.findByIdAndUpdate(filter.id, {
      title: body.title,
      content: body.content,
      category: category._id,
      user: user._id,
      brand: brand._id,
      url: body.url
    })
    if (!updatePost) {
      return res.status(500).json()
    }
    res.status(204).json({ error: 'Internal server error' })
  } catch (error) {
    console.error('Error updating motorcycle:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
