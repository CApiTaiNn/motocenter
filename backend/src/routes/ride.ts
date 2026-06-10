import Ride from '../models/Ride'
import { type Request, Router } from 'express'
import { type ReqQuery } from '../utils/find'
import { RideColor, ICreateRideBody } from '../types/ride'
import { Types, isValidObjectId } from 'mongoose'
import { attachUsers } from '../utils/attach'
import {
  authenticateToken,
  optionalAuth,
  getAuthUser,
  assertOwnerOrAdmin
} from '../utils/auth'
import { fetchList } from '../utils/list'
import { summarizeReactionsMany } from '../utils/reactions'

const router = Router()

const RIDE_REACTIONS = [{ array: 'liked_id', flag: 'likedByMe' }]

// Whether an event's date/hour is already in the past (Europe/Paris). Computed
// on read instead of being persisted, so listing rides never mutates them.
function isEventExpired(ride: {
  is_event?: boolean
  date_event?: string
  hour_event?: string
}): boolean {
  if (!ride.is_event || !ride.date_event) return false
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' })
  )
  const eventDate = new Date(ride.date_event)
  if (ride.hour_event) {
    const [hours, minutes] = ride.hour_event.split(':').map(Number)
    eventDate.setHours(hours, minutes, 0, 0)
  }
  return eventDate < now
}

/**
 * @openapi
 * /rides:
 *   get:
 *     summary: Récupérer la liste des balades
 *     tags:
 *       - Rides
 *     responses:
 *       200:
 *         description: Liste des balades
 */
router.get(
  '/',
  optionalAuth,
  async (req: Request<unknown, unknown, unknown, ReqQuery>, res) => {
    const viewerId = req.user?.id
    const rides = await fetchList(
      Ride,
      req.query,
      { filterable: ['_id', 'is_event', 'ride_type', 'user_id', 'createdAt'] },
      {
        lean: true,
        attach: (docs, deep) =>
          deep
            ? attachUsers(docs, 'participating_user').then(() => {})
            : Promise.resolve()
      }
    )

    // Reflect event expiry in the response without persisting it (no
    // write-on-read): a past event is reported as is_event:false.
    for (const ride of rides) {
      if (isEventExpired(ride)) ride.is_event = false
    }
    summarizeReactionsMany(rides, viewerId, RIDE_REACTIONS)

    res.status(200).json({ rides })
  }
)

/**
 * @openapi
 * /rides/{id}/like:
 *   patch:
 *     summary: Liker ou unliker une balade
 *     tags:
 *       - Rides
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like mis à jour
 *       404:
 *         description: Balade non trouvée
 */
router.patch(
  '/:id/like',
  authenticateToken,
  async (req: Request<{ id: string }>, res) => {
    const { id: userId } = getAuthUser(req)
    const rideId = req.params.id

    if (!isValidObjectId(rideId)) {
      return res.status(404).json({ error: 'Ride not found' })
    }
    const ride = await Ride.findById(rideId)
    if (!ride) return res.status(404).json({ error: 'Ride not found' })

    const hasLiked = ride.liked_id.includes(userId)
    const update = hasLiked
      ? { $pull: { liked_id: userId } }
      : { $addToSet: { liked_id: userId } }

    const updatedRide = await Ride.findByIdAndUpdate(rideId, update, {
      returnDocument: 'after'
    })
    if (!updatedRide) return res.status(404).json({ error: 'Update failed' })

    // Recompute the counter from the authoritative array so concurrent toggles
    // can never drift `like` away from liked_id.length.
    updatedRide.like = updatedRide.liked_id.length
    await updatedRide.save()

    res.status(200).json({
      like: updatedRide.like,
      isLiked: updatedRide.liked_id.includes(userId)
    })
  }
)

/**
 * @openapi
 * /rides/count:
 *   get:
 *     summary: Compter les balades créées sur les deux derniers mois
 *     tags:
 *       - Rides
 *     responses:
 *       200:
 *         description: Nombre de balades et évolution en pourcentage
 */
router.get('/count', async (req, res) => {
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
})

/**
 * @openapi
 * /rides:
 *   post:
 *     summary: Créer une balade
 *     tags:
 *       - Rides
 *     responses:
 *       201:
 *         description: Balade créée avec succès
 *       400:
 *         description: Données invalides
 */
router.post(
  '/',
  authenticateToken,
  async (req: Request, res) => {
    const { id: userId } = getAuthUser(req)
    const {
      title,
      description,
      duration,
      distance,
      startTown,
      endTown,
      rideType,
      imageLink,
      isEvent,
      dateEvent,
      hourEvent,
      geom
    } = req.body as ICreateRideBody

    const colors = Object.values(RideColor)
    const randomColor = colors[Math.floor(Math.random() * colors.length)]

    const newRide = new Ride({
      title,
      description,
      color: randomColor,
      geom,
      duration,
      distance,
      start_town: startTown?.value,
      end_town: endTown?.value,
      ride_type: rideType,
      user_id: userId,
      image_link: imageLink,
      is_event: isEvent,
      date_event: dateEvent,
      hour_event: hourEvent
    })

    // A schema ValidationError bubbles to the central handler as a 400; only a
    // genuine fault becomes a 500 (instead of every error masquerading as 400).
    const savedRide = await newRide.save()
    res.status(201).json({ _id: savedRide._id })
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
 *     responses:
 *       200:
 *         description: Participation mise à jour
 *       400:
 *         description: userId manquant, format invalide ou balade non-événement
 *       404:
 *         description: Balade non trouvée
 */
router.patch(
  '/:id/participate',
  authenticateToken,
  async (req: Request<{ id: string }>, res) => {
    const { id: userId } = getAuthUser(req)
    const rideId = req.params.id

    if (!Types.ObjectId.isValid(userId))
      return res.status(400).json({ error: 'Invalid User ID format' })

    if (!isValidObjectId(rideId)) {
      return res.status(404).json({ error: 'Ride not found' })
    }

    const ride = await Ride.findById(rideId)
    if (!ride) return res.status(404).json({ error: 'Ride not found' })

    if (!ride.is_event || isEventExpired(ride)) {
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
  }
)

/**
 * @openapi
 * /rides/{id}:
 *   delete:
 *     summary: Supprimer une balade (créateur ou admin)
 *     tags:
 *       - Rides
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Balade supprimée
 *       403:
 *         description: Non autorisé (ni créateur ni admin)
 *       404:
 *         description: Balade non trouvée
 */
router.delete(
  '/:id',
  authenticateToken,
  async (req: Request<{ id: string }>, res) => {
    const { id: authUserId } = getAuthUser(req)
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Ride not found' })
    }
    const ride = await Ride.findById(req.params.id)
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' })
    }

    // Only the creator (or an admin) may delete a ride.
    await assertOwnerOrAdmin(ride.user_id, authUserId)

    await ride.deleteOne()
    res.status(204).end()
  }
)

export default router
