import Brand from '../models/Brand'
import { type Request, Response, Router } from 'express'
import { prepareQuery } from '../utils/find'

const router = Router()

/**
 * @openapi
 * /brands:
 *   get:
 *     summary: Récupérer la liste des marques
 *     tags:
 *       - Brands
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
 *         description: Filtres Mongo
 *     responses:
 *       200:
 *         description: Liste des marques
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 brands:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req: Request, res: Response) => {
  const { project, sort, limit, skip, filter } = prepareQuery(req.query, {
    filterable: ['_id', 'name']
  })
  const brands = await Brand.find(filter)
    .select(project)
    .sort(sort)
    .skip(skip)
    .limit(limit)
  res.status(200).json({ brands })
})

/**
 * @openapi
 * /brands/count:
 *   get:
 *     summary: Récupérer le nombre de marque
 *     tags:
 *       - Brands
 *     responses:
 *       200:
 *         description: Liste des marques
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 brands:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 */
router.get('/count', async (req: Request, res: Response) => {
  const totalBrands: number = await Brand.countDocuments()
  res.status(200).json(totalBrands)
})

export default router
