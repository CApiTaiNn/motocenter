import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app'
import Ride from '../models/Ride'
import User from '../models/User'
import { RideColor } from '../types/ride'

describe('Ride Routes - /api/v1/rides', () => {
  let userId: string
  let authCookie: string

  beforeEach(async () => {
    const user = await User.create({
      firstname: 'Rider',
      lastname: 'One',
      pseudo: 'rider1',
      email: 'rider@test.com',
      password: 'pass'
    })
    userId = user._id.toString()
    const token = jwt.sign(
      { id: userId, email: user.email },
      process.env.JWT_SECRET!
    )
    authCookie = `accessToken=${token}`
  })

  const rideData = {
    title: 'Balade en Bretagne',
    description: 'Superbe route côtière',
    color: '#ff0000',
    duration: 120,
    distance: 85,
    start_town: 'Vannes',
    end_town: 'Quiberon',
    ride_type: 'coastal',
    user_id: '507f1f77bcf86cd799439011',
    image_link: 'https://example.com/ride.jpg',
    geom: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [-2.75, 47.65],
              [-3.12, 47.48]
            ]
          },
          properties: {}
        }
      ]
    }
  }

  describe('GET /api/v1/rides', () => {
    it('should return rides list', async () => {
      await Ride.create(rideData)

      const res = await request(app).get('/api/v1/rides?project=all')

      expect(res.status).toBe(200)
      expect(res.body.rides).toBeInstanceOf(Array)
      expect(res.body.rides.length).toBe(1)
      expect(res.body.rides[0].title).toBe('Balade en Bretagne')
    })

    it('should return empty array when no rides', async () => {
      const res = await request(app).get('/api/v1/rides?project=all')

      expect(res.status).toBe(200)
      expect(res.body.rides).toEqual([])
    })

    it('should project only requested fields', async () => {
      await Ride.create(rideData)

      const res = await request(app).get('/api/v1/rides?project=title')

      expect(res.status).toBe(200)
      expect(res.body.rides.length).toBe(1)
      expect(res.body.rides[0].title).toBe('Balade en Bretagne')
      // Not requested -> absent from projection
      expect(res.body.rides[0].distance).toBeUndefined()
      expect(res.body.rides[0].start_town).toBeUndefined()
    })

    it('should sort and limit results', async () => {
      await Ride.create({ ...rideData, title: 'First' })
      await Ride.create({ ...rideData, title: 'Second' })
      await Ride.create({ ...rideData, title: 'Third' })

      const res = await request(app).get(
        `/api/v1/rides?project=title&limit=2&sort=${encodeURIComponent(
          JSON.stringify({ title: 1 })
        )}`
      )

      expect(res.status).toBe(200)
      expect(res.body.rides.length).toBe(2)
      expect(res.body.rides[0].title).toBe('First')
      expect(res.body.rides[1].title).toBe('Second')
    })

    it('should attach participating users when deep=true', async () => {
      const ride = await Ride.create({
        ...rideData,
        is_event: true,
        date_event: '2999-01-01',
        hour_event: '10:00',
        participating_user: [userId]
      })

      const res = await request(app).get('/api/v1/rides?project=all&deep=true')

      expect(res.status).toBe(200)
      const out = res.body.rides.find(
        (r: any) => r._id === ride._id.toString()
      )
      expect(out.participating_user).toBeInstanceOf(Array)
      expect(out.participating_user.length).toBe(1)
      // attachUsers replaces the ObjectId with USER_PUBLIC_FIELDS (_id pseudo image)
      expect(out.participating_user[0]._id).toBe(userId)
      expect(out.participating_user[0].pseudo).toBe('rider1')
      expect(out.participating_user[0].password).toBeUndefined()
    })

    it('should report a past event as is_event=false without persisting it', async () => {
      const ride = await Ride.create({
        ...rideData,
        is_event: true,
        date_event: '2000-01-01',
        hour_event: '10:00'
      })

      const res = await request(app).get('/api/v1/rides?project=all')

      expect(res.status).toBe(200)
      const out = res.body.rides.find(
        (r: any) => r._id === ride._id.toString()
      )
      // Expiry is computed on read, so the response shows false…
      expect(out.is_event).toBe(false)

      // …but the document is never mutated during a GET (no write-on-read).
      const reloaded = await Ride.findById(ride._id)
      expect(reloaded!.is_event).toBe(true)
    })
  })

  describe('GET /api/v1/rides/count', () => {
    it('should return recent rides count', async () => {
      await Ride.create(rideData)

      const res = await request(app).get('/api/v1/rides/count')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('count')
      expect(typeof res.body.count).toBe('number')
    })

    it('should compute count and percent against previous month', async () => {
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5)
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 5)

      // 1 ride previous month, 2 rides current month -> +100%
      await Ride.create({ ...rideData, createdAt: prevMonth })
      await Ride.create({ ...rideData, createdAt: thisMonth })
      await Ride.create({ ...rideData, createdAt: thisMonth })

      const res = await request(app).get('/api/v1/rides/count')

      expect(res.status).toBe(200)
      expect(res.body.count).toBe(2)
      expect(res.body.percent).toBe(100)
    })

    it('should return percent = count*100 when previous month is empty', async () => {
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5)

      await Ride.create({ ...rideData, createdAt: thisMonth })
      await Ride.create({ ...rideData, createdAt: thisMonth })

      const res = await request(app).get('/api/v1/rides/count')

      expect(res.status).toBe(200)
      expect(res.body.count).toBe(2)
      expect(res.body.percent).toBe(200)
    })
  })

  describe('POST /api/v1/rides', () => {
    const validBody = {
      title: 'New ride',
      description: 'Description',
      duration: 60,
      distance: 40,
      startTown: { value: 'Rennes' },
      endTown: { value: 'Nantes' },
      rideType: 'highway',
      userId: 'ignored-client-value',
      imageLink: 'https://example.com/ride.jpg',
      geom: rideData.geom
    }

    it('should create a new ride and echo only the id', async () => {
      const res = await request(app)
        .post('/api/v1/rides')
        .set('Cookie', authCookie)
        .send(validBody)

      expect(res.status).toBe(201)
      expect(res.body._id).toBeTruthy()
      expect(res.body.ride).toBeUndefined()

      const ride = await Ride.findById(res.body._id)
      expect(ride!.title).toBe('New ride')
      expect(ride!.start_town).toBe('Rennes')
      expect(ride!.end_town).toBe('Nantes')
    })

    it('should derive user_id from the token, not the request body', async () => {
      const res = await request(app)
        .post('/api/v1/rides')
        .set('Cookie', authCookie)
        .send(validBody)

      expect(res.status).toBe(201)
      // user_id comes from the JWT, never from body.userId
      const ride = await Ride.findById(res.body._id)
      expect(ride!.user_id).toBe(userId)
    })

    it('should auto-assign a color from the RideColor palette', async () => {
      const res = await request(app)
        .post('/api/v1/rides')
        .set('Cookie', authCookie)
        .send(validBody)

      expect(res.status).toBe(201)
      const ride = await Ride.findById(res.body._id)
      expect(Object.values(RideColor)).toContain(ride!.color)
    })

    it('should default like/liked_id/participating_user/is_event', async () => {
      const res = await request(app)
        .post('/api/v1/rides')
        .set('Cookie', authCookie)
        .send(validBody)

      expect(res.status).toBe(201)
      const ride = await Ride.findById(res.body._id)
      expect(ride!.like).toBe(0)
      expect(ride!.liked_id).toEqual([])
      expect(ride!.participating_user).toEqual([])
      expect(ride!.is_event).toBe(false)
    })

    it('should return 401 without a token', async () => {
      const res = await request(app)
        .post('/api/v1/rides')
        .send({ title: 'No auth' })

      expect(res.status).toBe(401)
    })

    it('should fail without required fields', async () => {
      const res = await request(app)
        .post('/api/v1/rides')
        .set('Cookie', authCookie)
        .send({ title: 'Incomplete' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Validation failed')
    })

    it('should fail when an event has an empty date/hour string', async () => {
      const res = await request(app)
        .post('/api/v1/rides')
        .set('Cookie', authCookie)
        .send({
          ...validBody,
          isEvent: true,
          dateEvent: '',
          hourEvent: ''
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Validation failed')
    })

    it('should fail when an event omits date/hour entirely', async () => {
      const res = await request(app)
        .post('/api/v1/rides')
        .set('Cookie', authCookie)
        .send({
          ...validBody,
          isEvent: true
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Validation failed')
    })

    it('should create an event with a date/hour', async () => {
      const res = await request(app)
        .post('/api/v1/rides')
        .set('Cookie', authCookie)
        .send({
          ...validBody,
          isEvent: true,
          dateEvent: '2999-01-01',
          hourEvent: '10:00'
        })

      expect(res.status).toBe(201)
      const ride = await Ride.findById(res.body._id)
      expect(ride!.is_event).toBe(true)
      expect(ride!.date_event).toBe('2999-01-01')
      expect(ride!.hour_event).toBe('10:00')
    })
  })

  describe('PATCH /api/v1/rides/:id/like', () => {
    it('should return 401 without a token', async () => {
      const ride = await Ride.create(rideData)

      const res = await request(app).patch(
        `/api/v1/rides/${ride._id}/like`
      )

      expect(res.status).toBe(401)
    })

    it('should toggle like then unlike', async () => {
      const ride = await Ride.create(rideData)

      const liked = await request(app)
        .patch(`/api/v1/rides/${ride._id}/like`)
        .set('Cookie', authCookie)

      expect(liked.status).toBe(200)
      expect(liked.body.isLiked).toBe(true)
      expect(liked.body.like).toBe(1)

      const afterLike = await Ride.findById(ride._id)
      expect(afterLike!.liked_id).toContain(userId)
      expect(afterLike!.like).toBe(1)

      const unliked = await request(app)
        .patch(`/api/v1/rides/${ride._id}/like`)
        .set('Cookie', authCookie)

      expect(unliked.status).toBe(200)
      expect(unliked.body.isLiked).toBe(false)
      expect(unliked.body.like).toBe(0)

      const afterUnlike = await Ride.findById(ride._id)
      expect(afterUnlike!.liked_id).not.toContain(userId)
      expect(afterUnlike!.like).toBe(0)
    })

    it('should return 404 for an unknown ride id', async () => {
      const res = await request(app)
        .patch('/api/v1/rides/507f1f77bcf86cd799439099/like')
        .set('Cookie', authCookie)

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Ride not found')
    })
  })

  describe('PATCH /api/v1/rides/:id/participate', () => {
    const eventData = {
      ...rideData,
      is_event: true,
      date_event: '2999-01-01',
      hour_event: '10:00'
    }

    it('should return 401 without a token', async () => {
      const ride = await Ride.create(eventData)

      const res = await request(app).patch(
        `/api/v1/rides/${ride._id}/participate`
      )

      expect(res.status).toBe(401)
    })

    it('should toggle join then leave', async () => {
      const ride = await Ride.create(eventData)

      const joined = await request(app)
        .patch(`/api/v1/rides/${ride._id}/participate`)
        .set('Cookie', authCookie)

      expect(joined.status).toBe(200)
      expect(joined.body.isParticipating).toBe(true)
      expect(joined.body.participatingCount).toBe(1)
      expect(joined.body.updatedParticipants.length).toBe(1)
      expect(joined.body.updatedParticipants[0]._id).toBe(userId)
      expect(joined.body.updatedParticipants[0].pseudo).toBe('rider1')

      const afterJoin = await Ride.findById(ride._id)
      expect(afterJoin!.participating_user.map(String)).toContain(userId)

      const left = await request(app)
        .patch(`/api/v1/rides/${ride._id}/participate`)
        .set('Cookie', authCookie)

      expect(left.status).toBe(200)
      expect(left.body.isParticipating).toBe(false)
      expect(left.body.participatingCount).toBe(0)
      expect(left.body.updatedParticipants).toEqual([])

      const afterLeave = await Ride.findById(ride._id)
      expect(afterLeave!.participating_user.map(String)).not.toContain(userId)
    })

    it('should return 400 when the ride is not an event', async () => {
      const ride = await Ride.create(rideData)

      const res = await request(app)
        .patch(`/api/v1/rides/${ride._id}/participate`)
        .set('Cookie', authCookie)

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('This ride is not an event')
    })

    it('should return 404 for an unknown ride id', async () => {
      const res = await request(app)
        .patch('/api/v1/rides/507f1f77bcf86cd799439099/participate')
        .set('Cookie', authCookie)

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Ride not found')
    })

    it('should return 400 when the token user id is not a valid ObjectId', async () => {
      const ride = await Ride.create(eventData)
      const badToken = jwt.sign(
        { id: 'not-an-object-id', email: 'x@test.com' },
        process.env.JWT_SECRET!
      )

      const res = await request(app)
        .patch(`/api/v1/rides/${ride._id}/participate`)
        .set('Cookie', `accessToken=${badToken}`)

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Invalid User ID format')
    })

    it('should return 404 for an invalid ride ObjectId', async () => {
      const res = await request(app)
        .patch('/api/v1/rides/not-a-valid-id/participate')
        .set('Cookie', authCookie)

      // A malformed id is guarded up front as "not found", not a 500.
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/v1/rides/:id', () => {
    it('should return 401 without a token', async () => {
      const ride = await Ride.create({ ...rideData, user_id: userId })

      const res = await request(app).delete(`/api/v1/rides/${ride._id}`)

      expect(res.status).toBe(401)
    })

    it('should return 404 for an unknown ride id', async () => {
      const res = await request(app)
        .delete('/api/v1/rides/507f1f77bcf86cd799439099')
        .set('Cookie', authCookie)

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Ride not found')
    })

    it('should return 404 for an invalid (non-ObjectId) ride id', async () => {
      const res = await request(app)
        .delete('/api/v1/rides/not-a-valid-id')
        .set('Cookie', authCookie)

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Ride not found')
    })

    it('should return 403 when a non-creator non-admin deletes', async () => {
      // Ride owned by someone other than the authenticated user.
      const ride = await Ride.create({
        ...rideData,
        user_id: '507f1f77bcf86cd799439011'
      })

      const res = await request(app)
        .delete(`/api/v1/rides/${ride._id}`)
        .set('Cookie', authCookie)

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('Forbidden')

      const stillThere = await Ride.findById(ride._id)
      expect(stillThere).not.toBeNull()
    })

    it('should let the creator delete their ride (204) and remove it', async () => {
      const ride = await Ride.create({ ...rideData, user_id: userId })

      const res = await request(app)
        .delete(`/api/v1/rides/${ride._id}`)
        .set('Cookie', authCookie)

      expect(res.status).toBe(204)
      expect(res.body).toEqual({})

      const gone = await Ride.findById(ride._id)
      expect(gone).toBeNull()
    })

    it('should let an admin delete someone else’s ride (204)', async () => {
      const admin = await User.create({
        firstname: 'Admin',
        lastname: 'User',
        pseudo: 'admin1',
        email: 'admin@test.com',
        password: 'pass',
        isAdmin: true
      })
      const adminToken = jwt.sign(
        { id: admin._id.toString(), email: admin.email },
        process.env.JWT_SECRET!
      )

      // Ride owned by the original (non-admin) user.
      const ride = await Ride.create({ ...rideData, user_id: userId })

      const res = await request(app)
        .delete(`/api/v1/rides/${ride._id}`)
        .set('Cookie', `accessToken=${adminToken}`)

      expect(res.status).toBe(204)

      const gone = await Ride.findById(ride._id)
      expect(gone).toBeNull()
    })
  })
})
