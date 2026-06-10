import Motorcycle from '../models/Motorcycle'
import Brand, { toBrandSnapshot } from '../models/Brand'
import Post from '../models/Post'
import Message from '../models/Message'
import { type Request, Response, Router } from 'express'
import { isValidObjectId } from 'mongoose'
import {
  prepareQuery,
  ADMIN_MAX_LIMIT,
  PUBLIC_MAX_LIMIT,
  type ReqQuery
} from '../utils/find'
import { authenticateToken, requireAdmin, optionalAuth, isAdminUser } from '../utils/auth'
const router = Router()

// Resolve the client-sent brand (an id string, or an object carrying _id)
// to the embedded snapshot. Never trusts a client-built snapshot.
const resolveBrandSnapshot = async (value: unknown) => {
  const brandId =
    typeof value === 'string' ? value : (value as { _id?: string } | null)?._id
  if (!brandId || !isValidObjectId(brandId)) return null
  const brand = await Brand.findById(brandId)
  return brand ? toBrandSnapshot(brand) : null
}

// Fields an admin may set through the API — everything except _id/createdAt,
// so the raw body is never mass-assigned into the document.
const EDITABLE_FIELDS = [
  'brand',
  'name',
  'year',
  'category',
  'engine_size',
  'horsePower',
  'torque',
  'weight',
  'consumption',
  'soundLink',
  'imageUrl',
  'isAvailableA2',
  'is_public',
  'acceleration',
  'speedMax',
  'numberOfComparison',
  'withAllField',
  'price',
  'post'
] as const

const pickEditableFields = (body: Record<string, unknown>) =>
  Object.fromEntries(
    EDITABLE_FIELDS.filter((field) => body[field] !== undefined).map(
      (field) => [field, body[field]]
    )
  )

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
  optionalAuth,
  async (req: Request<unknown, unknown, unknown, ReqQuery>, res: Response) => {
    // Non-public motorcycles are drafts: only admins may list them, and only
    // admins get the high limit the management table needs.
    const userId = req.user?.id
    const isAdmin = userId ? await isAdminUser(userId) : false

    const { project, sort, limit, skip, filter } = prepareQuery(req.query, {
      filterable: [
        '_id',
        'brand._id',
        'category',
        'isAvailableA2',
        'is_public',
        'year'
      ],
      maxLimit: isAdmin ? ADMIN_MAX_LIMIT : PUBLIC_MAX_LIMIT
    })

    // For anyone but an admin, force is_public:true last so a client-supplied
    // filter can't override the restriction.
    const effectiveFilter = isAdmin ? filter : { ...filter, is_public: true }

    // brand is embedded on the document — no populate needed.
    const motorcycles = await Motorcycle.find(effectiveFilter)
      .select(project)
      .sort(sort)
      .skip(skip)
      .limit(limit)
    res.status(200).json({ motorcycles })
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
  const fields = pickEditableFields(req.body)
  const brand = await resolveBrandSnapshot(fields.brand)
  if (!brand) {
    return res.status(400).json({ error: 'Unknown brand' })
  }
  fields.brand = brand
  const newMotorcycle = new Motorcycle(fields)
  const savedMotorcycle = await newMotorcycle.save()
  res.status(201).json({ _id: savedMotorcycle._id })
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
  const totalMotorcycles: number = await Motorcycle.countDocuments()
  res.status(200).json(totalMotorcycles)
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
  const totalHorsePower = await Motorcycle.aggregate([
    {
      $group: {
        _id: null,
        totalHorsePower: { $sum: '$horsePower' }
      }
    }
  ])
  res.status(200).json(totalHorsePower[0]?.totalHorsePower ?? 0)
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
  if (!isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Motorcycle not found' })
  }
  const fields = pickEditableFields(req.body)
  if (fields.brand !== undefined) {
    const brand = await resolveBrandSnapshot(fields.brand)
    if (!brand) {
      return res.status(400).json({ error: 'Unknown brand' })
    }
    fields.brand = brand
  }
  const updatedMotorcycle = await Motorcycle.findByIdAndUpdate(
    req.params.id,
    fields,
    { returnDocument: 'after', runValidators: true }
  )
  if (!updatedMotorcycle) {
    return res.status(404).json({ error: 'Motorcycle not found' })
  }
  res.status(204).end()
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
  if (!isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Motorcycle not found' })
  }
  const deletedMotorcycle = await Motorcycle.findByIdAndDelete(req.params.id)
  if (!deletedMotorcycle) {
    return res.status(404).json({ error: 'Motorcycle not found' })
  }
  // Cascade: the linked discussion thread is owned by this motorcycle, so
  // drop it and its messages instead of leaving an orphaned post.
  if (deletedMotorcycle.post) {
    await Message.deleteMany({
      reference: deletedMotorcycle.post,
      referenceModel: 'Post'
    })
    await Post.findByIdAndDelete(deletedMotorcycle.post)
  }
  res.status(200).json({ message: 'Motorcycle deleted successfully' })
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
        maxAcceleration: { $max: '$acceleration.time_0_100' },
        maxSpeedMax: { $max: '$speedMax' },
        maxPrice: { $max: '$price' }
      }
    }
  ])
  res.status(200).json(maxStats[0] ?? {})
})

export default router
