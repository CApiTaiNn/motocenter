import Ride from '../models/Ride'
import { type Request, Router } from 'express'
import { prepareQuery, type ReqQuery } from '../utils/find'
import { RideColor, ICreateRideBody, IRide } from '../types/ride'
import { Types } from 'mongoose'
import { attachUsers } from '../utils/attach'

const router = Router()

router.get(
  '/',
  async (req: Request<unknown, unknown, unknown, ReqQuery>, res: any) => {
    const { project, sort, limit, deep } = prepareQuery(req.query)
    try {
      const rides = await Ride.find().select(project).sort(sort).limit(limit)
      const now = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' })
      )

      // Promise pour être sûr que toutes les modif sont faites avant de renvoyer les données
      await Promise.all(
        rides.map(async (ride) => {
          if (ride.is_event && ride.date_event) {
            const eventDate = new Date(ride.date_event)

            if (ride.hour_event) {
              const [hours, minutes] = ride.hour_event.split(':').map(Number)
              eventDate.setHours(hours, minutes, 0, 0)
            }
            // Si la date de l'événement est passé
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
      new: true
    })

    if (!updatedRide) return res.status(404).json({ error: 'Update failed' })

    res.status(200).json({
      like: updatedRide.like,
      isLiked: !hasLiked
    })
  } catch (error: any) {
    console.error('MONGODB ERROR:', error.message)
    res
      .status(500)
      .json({ error: 'Internal server error', details: error.message })
  }
})

router.get('/count', async (req, res) => {
  try {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const intermediate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date()
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
      res.status(400).json({
        error: 'Failed to create ride',
        details: error
      })
    }
  }
)

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
        new: true
      }).lean()

      if (!updatedRide) return res.status(404).json({ error: 'Update failed' })

      await attachUsers([updatedRide as any], 'participating_user')

      res.status(200).json({
        participatingCount: updatedRide.participating_user.length,
        isParticipating: !isParticipating,
        updatedParticipants: updatedRide.participating_user
      })
    } catch (error: any) {
      console.error('Participation error:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      })
    }
  }
)

export default router
