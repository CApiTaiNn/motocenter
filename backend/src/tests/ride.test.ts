import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../app'
import Ride from '../models/Ride'

describe('Ride Routes - /api/v1/rides', () => {
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
  })

  describe('GET /api/v1/rides/count', () => {
    it('should return recent rides count', async () => {
      await Ride.create(rideData)

      const res = await request(app).get('/api/v1/rides/count')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('count')
      expect(typeof res.body.count).toBe('number')
    })
  })

  describe('POST /api/v1/rides', () => {
    it('should create a new ride', async () => {
      const res = await request(app)
        .post('/api/v1/rides')
        .send({
          title: 'New ride',
          description: 'Description',
          duration: 60,
          distance: 40,
          startTown: { value: 'Rennes' },
          endTown: { value: 'Nantes' },
          rideType: 'highway',
          userId: '507f1f77bcf86cd799439011',
          imageLink: 'https://example.com/ride.jpg',
          geom: rideData.geom
        })

      expect(res.status).toBe(201)
      expect(res.body.ride.title).toBe('New ride')
      expect(res.body.ride.color).toBeDefined()
      expect(res.body.ride.start_town).toBe('Rennes')
      expect(res.body.ride.end_town).toBe('Nantes')
    })

    it('should fail without required fields', async () => {
      const res = await request(app)
        .post('/api/v1/rides')
        .send({ title: 'Incomplete' })

      expect(res.status).toBe(400)
    })
  })
})
