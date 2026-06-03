import Motorcycle from '../models/Motorcycle'
import { type Request, Response, Router } from 'express'
import { prepareQuery, type ReqQuery } from '../utils/find'
import { authenticateToken, requireAdmin } from '../utils/auth'
const router = Router()

/**
 * @openapi
 * /motorcycles:
 *   get:
 *     summary: Récupérer la liste des motos
 *     tags:
 *       - Motorcycles
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
 *     responses:
 *       200:
 *         description: Liste des motos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 motorcycles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Motorcycle'
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/',
  async (req: Request<unknown, unknown, unknown, ReqQuery>, res: Response) => {
    const { project, sort, limit, filter } = prepareQuery(req.query)
    try {
      const motorcycles = await Motorcycle.find()
        .where(filter)
        .select(project)
        .sort(sort)
        .limit(limit)
        .populate('brand')
      res.status(200).json({ motorcycles })
    } catch (error) {
      console.error('Error accessing motorcycle route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

/**
 * @openapi
 * /motorcycles:
 *   post:
 *     summary: Créer une moto
 *     tags:
 *       - Motorcycles
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MotorcycleInput'
 *     responses:
 *       201:
 *         description: Moto créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Motorcycle'
 *       500:
 *         description: Erreur serveur
 */
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const newMotorcycle = new Motorcycle(req.body)
    const savedMotorcycle = await newMotorcycle.save()
    res.status(201).json(savedMotorcycle)
  } catch (error) {
    console.error('Error creating motorcycle:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @openapi
 * /motorcycles/count:
 *   get:
 *     summary: Compter le nombre total de motos
 *     tags:
 *       - Motorcycles
 *     responses:
 *       200:
 *         description: Nombre total de motos
 *         content:
 *           application/json:
 *             schema:
 *               type: integer
 *               example: 42
 *       500:
 *         description: Erreur serveur
 */
router.get('/count', async (req: Request, res: Response) => {
  try {
    const totalMotorcycles: number = await Motorcycle.countDocuments()
    res.status(200).json(totalMotorcycles)
  } catch (error) {
    console.error('Error accessing motorcycle route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @openapi
 * /motorcycles/stats:
 *   get:
 *     summary: Récupérer la somme totale des chevaux-vapeur de toutes les motos
 *     tags:
 *       - Motorcycles
 *     responses:
 *       200:
 *         description: Total des chevaux-vapeur
 *         content:
 *           application/json:
 *             schema:
 *               type: number
 *               example: 12450
 *       500:
 *         description: Erreur serveur
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalHorsePower = await Motorcycle.aggregate([
      {
        $group: {
          _id: null,
          totalHorsePower: { $sum: '$horsePower' }
        }
      }
    ])
    res.status(200).json(totalHorsePower[0].totalHorsePower)
  } catch (error) {
    console.error('Error accessing motorcycle route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @openapi
 * /motorcycles/{id}:
 *   put:
 *     summary: Mettre à jour une moto
 *     tags:
 *       - Motorcycles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la moto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MotorcycleInput'
 *     responses:
 *       200:
 *         description: Moto mise à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 motorcycle:
 *                   $ref: '#/components/schemas/Motorcycle'
 *       404:
 *         description: Moto non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const updatedMotorcycle = await Motorcycle.findByIdAndUpdate(
      req.params.id,
      req.body
    ).populate('brand')
    if (!updatedMotorcycle) {
      return res.status(404).json({ error: 'Motorcycle not found' })
    }
    res.status(200).json({ motorcycle: updatedMotorcycle })
  } catch (error) {
    console.error('Error updating motorcycle:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @openapi
 * /motorcycles/{id}:
 *   delete:
 *     summary: Supprimer une moto
 *     tags:
 *       - Motorcycles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la moto
 *     responses:
 *       200:
 *         description: Moto supprimée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Motorcycle deleted successfully
 *       404:
 *         description: Moto non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const deletedMotorcycle = await Motorcycle.findByIdAndDelete(req.params.id)
    if (!deletedMotorcycle) {
      return res.status(404).json({ error: 'Motorcycle not found' })
    }
    res.status(200).json({ message: 'Motorcycle deleted successfully' })
  } catch (error) {
    console.error('Error deleting motorcycle:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @openapi
 * /motorcycles/max-stats:
 *   get:
 *     summary: Récupérer les valeurs maximales des caractéristiques des motos
 *     tags:
 *       - Motorcycles
 *     responses:
 *       200:
 *         description: Valeurs maximales des caractéristiques
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 maxYear:
 *                   type: integer
 *                   description: Année maximale
 *                 maxEngineSize:
 *                   type: number
 *                   description: Cylindrée maximale (cm³)
 *                 maxHorsePower:
 *                   type: number
 *                   description: Puissance maximale (ch)
 *                 maxTorque:
 *                   type: number
 *                   description: Couple maximal (Nm)
 *                 maxWeight:
 *                   type: number
 *                   description: Poids maximal (kg)
 *                 maxConsumption:
 *                   type: number
 *                   description: Consommation maximale (L/100km)
 *                 maxAcceleration:
 *                   type: number
 *                   description: Accélération maximale (0-100 km/h en s)
 *                 maxSpeedMax:
 *                   type: number
 *                   description: Vitesse maximale (km/h)
 *                 maxPrice:
 *                   type: number
 *                   description: Prix maximal (€)
 *       500:
 *         description: Erreur serveur
 */
router.get('/max-stats', async (req: Request, res: Response) => {
  try {
    const maxStats = await Motorcycle.aggregate([
      {
        $group: {
          _id: null,
          maxYear: { $max: '$year' },
          maxEngineSize: { $max: '$engine_size' },
          maxHorsePower: { $max: '$horsePower' },
          maxTorque: { $max: '$torque' },
          maxWeight: { $max: '$weight' },
          maxConsumption: { $max: '$consumption' },
          maxAcceleration: { $max: '$acceleration' },
          maxSpeedMax: { $max: '$speedMax' },
          maxPrice: { $max: '$price' }
        }
      }
    ])
    res.status(200).json(maxStats[0])
  } catch (error) {
    console.error('Error accessing motorcycle route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
