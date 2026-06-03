import Ride from '../models/Ride'
import { type Request, Router } from 'express'
import { prepareQuery, type ReqQuery } from '../utils/find'
import { RideColor, ICreateRideBody } from '../types/ride'
import { Types } from 'mongoose'
import { attachUsers } from '../utils/attach'

const router = Router()

/**
 * @openapi
 * /rides:
 *   get:
 *     summary: Récupérer la liste des balades
 *     tags:
 *       - Rides
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
 *         name: deep
 *         schema:
 *           type: boolean
 *         description: Inclure les données des participants (populate)
 *     responses:
 *       200:
 *         description: Liste des balades
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rides:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ride'
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/',
  async (req: Request<unknown, unknown, unknown, ReqQuery>, res: any) => {
    const { project, sort, limit, deep } = prepareQuery(req.query)
    try {
      const rides = await Ride.find().select(project).sort(sort).limit(limit)
      const now = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' })
      )

      await Promise.all(
        rides.map(async (ride) => {
          if (ride.is_event && ride.date_event) {
            const eventDate = new Date(ride.date_event)

            if (ride.hour_event) {
              const [hours, minutes] = ride.hour_event.split(':').map(Number)
              eventDate.setHours(hours, minutes, 0, 0)
            }
            if (eventDate < now) {
              ride.is_event = false
              await ride.save()
            }
          }
        })
      )

      const ridesOut = rides.map((r) => r.toObject()) as any[]
      if (deep) {
        await attachUsers(ridesOut, 'participating_user')
      }

      res.status(200).json({ rides: ridesOut })
    } catch (error) {
      console.error('Error accessing ride route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

/**
 * @openapi
 * /rides/{id}/like:
 *   patch:
 *     summary: Liker ou unliker un balade
 *     tags:
 *       - Rides
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du balade
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Like mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 like:
 *                   type: integer
 *                   description: Nombre total de likes
 *                 isLiked:
 *                   type: boolean
 *                   description: Statut du like pour l'utilisateur
 *       400:
 *         description: userId manquant
 *       404:
 *         description: Balade non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.patch('/:id/like', async (req: Request<{ id: string }>, res: any) => {
  const { userId } = req.body
  const rideId = req.params.id

  if (!userId) return res.status(400).json({ error: 'User ID is required' })

  try {
    const ride = await Ride.findById(rideId)
    if (!ride) return res.status(404).json({ error: 'Ride not found' })

    const hasLiked = ride.liked_id.includes(userId.toString())

    const update = hasLiked
      ? { $pull: { liked_id: userId }, $inc: { like: -1 } }
      : { $addToSet: { liked_id: userId }, $inc: { like: 1 } }

    const updatedRide = await Ride.findByIdAndUpdate(rideId, update, {
      returnDocument: 'after'
    })

    if (!updatedRide) return res.status(404).json({ error: 'Update failed' })

    res.status(200).json({
      like: updatedRide.like,
      isLiked: !hasLiked
    })
  } catch (error) {
    console.error('Error liking ride:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @openapi
 * /rides/count:
 *   get:
 *     summary: Compter les balades créés sur les deux derniers mois
 *     tags:
 *       - Rides
 *     responses:
 *       200:
 *         description: Nombre de balades et évolution en pourcentage
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Nombre de balades créés sur le mois en cours
 *                 percent:
 *                   type: number
 *                   description: Évolution en % par rapport au mois précédent
 *       500:
 *         description: Erreur serveur
 */
router.get('/count', async (req, res) => {
  try {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const intermediate = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = now
    const countFirstPeriod = await Ride.countDocuments({
      createdAt: { $gte: start, $lt: intermediate }
    })
    const countSecondPeriod = await Ride.countDocuments({
      createdAt: { $gte: intermediate, $lt: end }
    })

    const percent =
      countFirstPeriod === 0
        ? countSecondPeriod * 100
        : ((countSecondPeriod - countFirstPeriod) / countFirstPeriod) * 100

    res.status(200).json({ count: countSecondPeriod, percent })
  } catch (error) {
    console.error('Error counting rides:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @openapi
 * /rides:
 *   post:
 *     summary: Créer un balade
 *     tags:
 *       - Rides
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - duration
 *               - distance
 *               - startTown
 *               - endTown
 *               - rideType
 *               - imageLink
 *               - userId
 *             properties:
 *               title:
 *                 type: string
 *                 description: Titre du balade
 *               description:
 *                 type: string
 *                 description: Description du balade
 *               duration:
 *                 type: number
 *                 description: Durée du balade (en minutes)
 *               distance:
 *                 type: number
 *                 description: Distance du balade (en km)
 *               startTown:
 *                 type: object
 *                 properties:
 *                   value:
 *                     type: string
 *                 description: Ville de départ
 *               endTown:
 *                 type: object
 *                 properties:
 *                   value:
 *                     type: string
 *                 description: Ville d'arrivée
 *               rideType:
 *                 type: string
 *                 description: Type de balade
 *               imageLink:
 *                 type: string
 *                 description: Lien vers l'image du balade
 *               userId:
 *                 type: string
 *                 description: ID de l'utilisateur créateur
 *               isEvent:
 *                 type: boolean
 *                 description: Indique si le balade est un événement
 *               dateEvent:
 *                 type: string
 *                 description: Date de l'événement (requis si isEvent est true)
 *               hourEvent:
 *                 type: string
 *                 description: Heure de l'événement (requis si isEvent est true)
 *               geom:
 *                 type: object
 *                 description: Géométrie GeoJSON (FeatureCollection)
 *     responses:
 *       201:
 *         description: Balade créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 ride:
 *                   $ref: '#/components/schemas/Ride'
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur serveur
 */
router.post(
  '/',
  async (
    req: Request<unknown, unknown, ICreateRideBody, ReqQuery>,
    res: any
  ) => {
    try {
      const {
        title,
        description,
        duration,
        distance,
        startTown,
        endTown,
        rideType,
        imageLink,
        userId,
        isEvent,
        dateEvent,
        hourEvent,
        geom
      } = req.body

      const colors = Object.values(RideColor)
      const randomColor = colors[Math.floor(Math.random() * colors.length)]

      const newRide = new Ride({
        title: title,
        description: description,
        color: randomColor,
        geom: geom,
        duration: duration,
        distance: distance,
        start_town: startTown?.value,
        end_town: endTown?.value,
        ride_type: rideType,
        user_id: userId,
        image_link: imageLink,
        is_event: isEvent,
        date_event: dateEvent,
        hour_event: hourEvent
      })

      const savedRide = await newRide.save()

      res.status(201).json({
        message: 'Ride created successfully',
        ride: savedRide
      })
    } catch (error) {
      console.error('Error creating ride:', error)
      res.status(400).json({ error: 'Failed to create ride' })
    }
  }
)

/**
 * @openapi
 * /rides/{id}/participate:
 *   patch:
 *     summary: Participer ou se désinscrire d'un événement
 *     tags:
 *       - Rides
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du balade
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Participation mise à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 participatingCount:
 *                   type: integer
 *                   description: Nombre total de participants
 *                 isParticipating:
 *                   type: boolean
 *                   description: Statut de participation de l'utilisateur
 *                 updatedParticipants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       image:
 *                         type: string
 *                       pseudo:
 *                         type: string
 *       400:
 *         description: userId manquant, format invalide ou balade non-événement
 *       404:
 *         description: Balade non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.patch(
  '/:id/participate',
  async (req: Request<{ id: string }>, res: any) => {
    const { userId } = req.body
    const rideId = req.params.id

    if (!userId) return res.status(400).json({ error: 'User ID is required' })
    if (!Types.ObjectId.isValid(userId))
      return res.status(400).json({ error: 'Invalid User ID format' })

    try {
      const ride = await Ride.findById(rideId)
      if (!ride) return res.status(404).json({ error: 'Ride not found' })

      if (!ride.is_event) {
        return res.status(400).json({ error: 'This ride is not an event' })
      }

      const isParticipating = ride.participating_user.some(
        (id) => id.toString() === userId.toString()
      )

      const update = isParticipating
        ? { $pull: { participating_user: userId } }
        : { $addToSet: { participating_user: userId } }

      const updatedRide = await Ride.findByIdAndUpdate(rideId, update, {
        returnDocument: 'after'
      }).lean()

      if (!updatedRide) return res.status(404).json({ error: 'Update failed' })

      await attachUsers([updatedRide as any], 'participating_user')

      res.status(200).json({
        participatingCount: updatedRide.participating_user.length,
        isParticipating: !isParticipating,
        updatedParticipants: updatedRide.participating_user
      })
    } catch (error) {
      console.error('Participation error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

export default router
