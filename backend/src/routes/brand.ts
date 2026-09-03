import Brand from '../models/Brand'
import { type Request, Response, Router } from 'express'
import { prepareQuery } from '../utils/find'
import { authenticateToken, requireAdmin } from '../utils/auth'

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
 * /brands:
 *   post:
 *     summary: Créer une marque (admin)
 *     tags:
 *       - Brands
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - icon
 *             properties:
 *               name:
 *                 type: string
 *               icon:
 *                 type: string
 *                 description: URL du logo de la marque
 *     responses:
 *       201:
 *         description: Marque créée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *       200:
 *         description: Marque déjà existante (renvoie l'id existant)
 *       400:
 *         description: Champs manquants
 *       500:
 *         description: Internal server error
 */
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { name, icon } = req.body as { name?: unknown; icon?: unknown }
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' })
    }
    if (typeof icon !== 'string' || !icon.trim()) {
      return res.status(400).json({ error: 'icon is required' })
    }

    // Idempotent by name: brands are a small shared taxonomy, so a re-import
    // that references an existing brand must reuse it, never duplicate it.
    const existing = await Brand.findOne({ name: name.trim() })
    if (existing) {
      return res.status(200).json({ _id: existing._id })
    }

    const brand = await new Brand({ name: name.trim(), icon: icon.trim() }).save()
    res.status(201).json({ _id: brand._id })
  }
)

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
