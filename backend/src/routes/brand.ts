import Brand from '../models/Brand'
import { type Request, Response, Router } from 'express'
import { prepareQuery, type ReqQuery } from '../utils/find'

const router = Router()
router.get(
  '/',
  async (req: Request<unknown, unknown, unknown, ReqQuery>, res) => {
    const { project, sort, limit, filter } = prepareQuery(req.query)
    try {
      const brands = await Brand.find(filter)
        .select(project)
        .sort(sort)
        .limit(limit)
      res.status(200).json({ brands })
    } catch (error) {
      console.error('Error accessing brand route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

router.get('/count', async (req: Request, res: Response) => {
  try {
    const totalBrands: number = await Brand.countDocuments()
    res.status(200).json(totalBrands)
  } catch (error) {
    console.error('Error accessing brand route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
