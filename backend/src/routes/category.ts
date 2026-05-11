import { type Request, Router } from 'express'
import { prepareQuery, type ReqQuery } from '../utils/find'
import Category from '../models/Category'

const router = Router()
router.get(
  '/',
  async (req: Request<unknown, unknown, unknown, ReqQuery>, res) => {
    const { project, sort, limit } = prepareQuery(req.query)
    try {
      const categories = await Category.find()
        .select(project)
        .sort(sort)
        .limit(limit)
      res.status(200).json({ categories })
    } catch (error) {
      console.error('Error accessing message route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

export default router
