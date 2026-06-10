import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app'
import Brand from '../models/Brand'
import Motorcycle from '../models/Motorcycle'
import User from '../models/User'

describe('Motorcycle Routes - /api/v1/motorcycles', () => {
  let brandId: string
  let brandSnapshot: { _id: unknown; name: string; icon: string }
  let adminCookie: string
  let userCookie: string

  const motoData = {
    name: 'MT-07',
    year: 2024,
    category: 'roadster',
    engine_size: 689,
    horsePower: 73,
    torque: 67,
    weight: 184,
    consumption: 4.5,
    price: 7699
  }

  beforeEach(async () => {
    const brand = await Brand.create({ name: 'Yamaha', icon: 'yamaha.svg' })
    brandId = brand._id.toString()
    brandSnapshot = { _id: brand._id, name: brand.name, icon: brand.icon }

    const admin = await User.create({
      firstname: 'Admin',
      lastname: 'User',
      pseudo: 'admin',
      email: 'admin@test.com',
      password: 'password123',
      isAdmin: true
    })
    const token = jwt.sign(
      { id: admin._id.toString(), email: admin.email },
      process.env.JWT_SECRET!
    )
    adminCookie = `accessToken=${token}`

    const user = await User.create({
      firstname: 'Regular',
      lastname: 'User',
      pseudo: 'regular',
      email: 'regular@test.com',
      password: 'password123',
      isAdmin: false
    })
    const userToken = jwt.sign(
      { id: user._id.toString(), email: user.email },
      process.env.JWT_SECRET!
    )
    userCookie = `accessToken=${userToken}`
  })

  describe('POST /api/v1/motorcycles', () => {
    it('should create a new motorcycle and echo only the id', async () => {
      const res = await request(app)
        .post('/api/v1/motorcycles')
        .set('Cookie', adminCookie)
        .send({ ...motoData, brand: brandId })

      expect(res.status).toBe(201)
      expect(res.body._id).toBeTruthy()
      expect(res.body.name).toBeUndefined()

      const stored = await Motorcycle.findById(res.body._id)
      expect(stored!.name).toBe('MT-07')
      expect(stored!.horsePower).toBe(73)
    })

    it('should fail without required fields', async () => {
      // No brand at all -> rejected up front by the brand resolution.
      const res = await request(app)
        .post('/api/v1/motorcycles')
        .set('Cookie', adminCookie)
        .send({ name: 'Incomplete' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Unknown brand')
    })
  })

  describe('GET /api/v1/motorcycles', () => {
    beforeEach(async () => {
      await Motorcycle.create({
        ...motoData,
        brand: brandSnapshot,
        is_public: true
      })
    })

    it('should return public motorcycles to anonymous callers', async () => {
      const res = await request(app).get('/api/v1/motorcycles?project=all')

      expect(res.status).toBe(200)
      expect(res.body.motorcycles).toBeInstanceOf(Array)
      expect(res.body.motorcycles.length).toBe(1)
      expect(res.body.motorcycles[0].brand.name).toBe('Yamaha')
    })

    it('should respect limit', async () => {
      await Motorcycle.create({
        ...motoData,
        name: 'MT-09',
        brand: brandSnapshot,
        is_public: true
      })
      const res = await request(app).get(
        '/api/v1/motorcycles?project=all&limit=1'
      )

      expect(res.status).toBe(200)
      expect(res.body.motorcycles.length).toBe(1)
    })

    it('should hide non-public motorcycles from anonymous and non-admin callers', async () => {
      await Motorcycle.create({
        ...motoData,
        name: 'Secret',
        brand: brandSnapshot,
        is_public: false
      })

      const anon = await request(app).get('/api/v1/motorcycles?project=all')
      expect(anon.body.motorcycles.length).toBe(1)
      expect(anon.body.motorcycles[0].name).toBe('MT-07')

      const user = await request(app)
        .get('/api/v1/motorcycles?project=all')
        .set('Cookie', userCookie)
      expect(user.body.motorcycles.length).toBe(1)
      expect(user.body.motorcycles[0].name).toBe('MT-07')
    })

    it('should return all motorcycles (public and non-public) to an admin', async () => {
      await Motorcycle.create({
        ...motoData,
        name: 'Secret',
        brand: brandSnapshot,
        is_public: false
      })

      const res = await request(app)
        .get('/api/v1/motorcycles?project=all')
        .set('Cookie', adminCookie)
      expect(res.body.motorcycles.length).toBe(2)
    })

    it('should not let a non-admin reveal drafts via an is_public filter', async () => {
      await Motorcycle.create({
        ...motoData,
        name: 'Secret',
        brand: brandSnapshot,
        is_public: false
      })

      const res = await request(app)
        .get(
          `/api/v1/motorcycles?project=all&filter=${JSON.stringify({ is_public: false })}`
        )
        .set('Cookie', userCookie)

      // The forced is_public:true wins, so the draft stays hidden.
      expect(res.body.motorcycles.every((m: any) => m.name !== 'Secret')).toBe(
        true
      )
    })
  })

  describe('GET /api/v1/motorcycles/count', () => {
    it('should return 0 when no motorcycles', async () => {
      const res = await request(app).get('/api/v1/motorcycles/count')

      expect(res.status).toBe(200)
      expect(res.body).toBe(0)
    })

    it('should return correct count', async () => {
      await Motorcycle.create({ ...motoData, brand: brandSnapshot })
      const res = await request(app).get('/api/v1/motorcycles/count')

      expect(res.status).toBe(200)
      expect(res.body).toBe(1)
    })
  })

  describe('GET /api/v1/motorcycles/stats', () => {
    it('should return total horsePower sum', async () => {
      await Motorcycle.create({ ...motoData, brand: brandSnapshot })
      await Motorcycle.create({
        ...motoData,
        name: 'R1',
        horsePower: 200,
        brand: brandSnapshot
      })

      const res = await request(app).get('/api/v1/motorcycles/stats')

      expect(res.status).toBe(200)
      expect(res.body).toBe(273)
    })
  })

  describe('GET /api/v1/motorcycles/max-stats', () => {
    it('should return max values for numeric fields', async () => {
      await Motorcycle.create({ ...motoData, brand: brandSnapshot })
      await Motorcycle.create({
        ...motoData,
        name: 'R1',
        horsePower: 200,
        price: 20000,
        brand: brandSnapshot
      })

      const res = await request(app).get('/api/v1/motorcycles/max-stats')

      expect(res.status).toBe(200)
      expect(res.body.maxHorsePower).toBe(200)
      expect(res.body.maxPrice).toBe(20000)
    })
  })

  describe('PUT /api/v1/motorcycles/:id', () => {
    it('should update a motorcycle and return no content', async () => {
      const moto = await Motorcycle.create({ ...motoData, brand: brandSnapshot })

      const res = await request(app)
        .put(`/api/v1/motorcycles/${moto._id}`)
        .set('Cookie', adminCookie)
        .send({ name: 'MT-07 Updated' })

      expect(res.status).toBe(204)
      expect(res.body).toEqual({})

      const updated = await Motorcycle.findById(moto._id)
      expect(updated!.name).toBe('MT-07 Updated')
    })

    it('should return 404 for non-existent id', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      const res = await request(app)
        .put(`/api/v1/motorcycles/${fakeId}`)
        .set('Cookie', adminCookie)
        .send({ name: 'Ghost' })

      expect(res.status).toBe(404)
    })

    it('should ignore createdAt, _id and unknown fields (mass-assignment guard)', async () => {
      const moto = await Motorcycle.create({ ...motoData, brand: brandSnapshot })
      const originalId = moto._id.toString()
      const originalCreatedAt = moto.createdAt!.toISOString()
      const fakeId = '507f1f77bcf86cd799439011'

      const res = await request(app)
        .put(`/api/v1/motorcycles/${moto._id}`)
        .set('Cookie', adminCookie)
        .send({
          name: 'MT-07 Renamed',
          _id: fakeId,
          createdAt: '2000-01-01T00:00:00.000Z',
          hackerField: 'pwned'
        })

      expect(res.status).toBe(204)

      const updated = await Motorcycle.findById(originalId)
      expect(updated!.name).toBe('MT-07 Renamed')
      expect(updated).not.toBeNull()
      expect(updated!._id.toString()).toBe(originalId)
      expect(updated!.createdAt!.toISOString()).toBe(originalCreatedAt)
      expect((updated!.toObject() as Record<string, unknown>).hackerField).toBeUndefined()
    })
  })

  describe('DELETE /api/v1/motorcycles/:id', () => {
    it('should delete a motorcycle', async () => {
      const moto = await Motorcycle.create({ ...motoData, brand: brandSnapshot })

      const res = await request(app)
        .delete(`/api/v1/motorcycles/${moto._id}`)
        .set('Cookie', adminCookie)

      expect(res.status).toBe(200)
      expect(res.body.message).toBe('Motorcycle deleted successfully')

      const deleted = await Motorcycle.findById(moto._id)
      expect(deleted).toBeNull()
    })

    it('should return 404 for non-existent id', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      const res = await request(app)
        .delete(`/api/v1/motorcycles/${fakeId}`)
        .set('Cookie', adminCookie)

      expect(res.status).toBe(404)
    })
  })

  describe('Stats on an empty collection', () => {
    it('GET /stats returns 0 when there are no motorcycles', async () => {
      const res = await request(app).get('/api/v1/motorcycles/stats')

      expect(res.status).toBe(200)
      expect(res.body).toBe(0)
    })

    it('GET /max-stats returns {} when there are no motorcycles', async () => {
      const res = await request(app).get('/api/v1/motorcycles/max-stats')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({})
    })
  })

  describe('Admin authorization on mutation routes', () => {
    it('POST should return 401 without a token', async () => {
      const res = await request(app)
        .post('/api/v1/motorcycles')
        .send({ ...motoData, brand: brandId })

      expect(res.status).toBe(401)
    })

    it('POST should return 403 for a non-admin user', async () => {
      const res = await request(app)
        .post('/api/v1/motorcycles')
        .set('Cookie', userCookie)
        .send({ ...motoData, brand: brandId })

      expect(res.status).toBe(403)
    })

    it('PUT should return 401 without a token', async () => {
      const moto = await Motorcycle.create({ ...motoData, brand: brandSnapshot })
      const res = await request(app)
        .put(`/api/v1/motorcycles/${moto._id}`)
        .send({ name: 'Hacked' })

      expect(res.status).toBe(401)
    })

    it('PUT should return 403 for a non-admin user', async () => {
      const moto = await Motorcycle.create({ ...motoData, brand: brandSnapshot })
      const res = await request(app)
        .put(`/api/v1/motorcycles/${moto._id}`)
        .set('Cookie', userCookie)
        .send({ name: 'Hacked' })

      expect(res.status).toBe(403)
    })

    it('DELETE should return 401 without a token', async () => {
      const moto = await Motorcycle.create({ ...motoData, brand: brandSnapshot })
      const res = await request(app).delete(`/api/v1/motorcycles/${moto._id}`)

      expect(res.status).toBe(401)
    })

    it('DELETE should return 403 for a non-admin user', async () => {
      const moto = await Motorcycle.create({ ...motoData, brand: brandSnapshot })
      const res = await request(app)
        .delete(`/api/v1/motorcycles/${moto._id}`)
        .set('Cookie', userCookie)

      expect(res.status).toBe(403)
    })
  })
})
