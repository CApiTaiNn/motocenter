import { type Request, Router } from 'express'
import { prepareQuery, type ReqQuery } from '../utils/find'
import Category from '../models/Category'

const router = Router()
/**
 * @openapi
 * /categories:
 *   get:
 *     summary: Récupérer la liste des catégories
 *     tags:
 *       - Categories
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
 *     responses:
 *       200:
 *         description: Liste des catégories
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
