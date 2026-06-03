import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app'
import Brand from '../models/Brand'
import Motorcycle from '../models/Motorcycle'
import User from '../models/User'

describe('Motorcycle Routes - /api/v1/motorcycles', () => {
  let brandId: string
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
    it('should create a new motorcycle', async () => {
      const res = await request(app)
        .post('/api/v1/motorcycles')
        .set('Cookie', adminCookie)
        .send({ ...motoData, brand: brandId })

      expect(res.status).toBe(201)
      expect(res.body.name).toBe('MT-07')
      expect(res.body.horsePower).toBe(73)
    })

    it('should fail without required fields', async () => {
      const res = await request(app)
        .post('/api/v1/motorcycles')
        .set('Cookie', adminCookie)
        .send({ name: 'Incomplete' })

      expect(res.status).toBe(500)
    })
  })

  describe('GET /api/v1/motorcycles', () => {
    beforeEach(async () => {
      await Motorcycle.create({ ...motoData, brand: brandId })
    })

    it('should return motorcycles with populated brand', async () => {
      const res = await request(app).get('/api/v1/motorcycles?project=all')

      expect(res.status).toBe(200)
      expect(res.body.motorcycles).toBeInstanceOf(Array)
      expect(res.body.motorcycles.length).toBe(1)
      expect(res.body.motorcycles[0].brand.name).toBe('Yamaha')
    })

    it('should respect limit', async () => {
      await Motorcycle.create({ ...motoData, name: 'MT-09', brand: brandId })
      const res = await request(app).get(
        '/api/v1/motorcycles?project=all&limit=1'
      )

      expect(res.status).toBe(200)
      expect(res.body.motorcycles.length).toBe(1)
    })
  })

  describe('GET /api/v1/motorcycles/count', () => {
    it('should return 0 when no motorcycles', async () => {
      const res = await request(app).get('/api/v1/motorcycles/count')

      expect(res.status).toBe(200)
      expect(res.body).toBe(0)
    })

    it('should return correct count', async () => {
      await Motorcycle.create({ ...motoData, brand: brandId })
      const res = await request(app).get('/api/v1/motorcycles/count')

      expect(res.status).toBe(200)
      expect(res.body).toBe(1)
    })
  })

  describe('GET /api/v1/motorcycles/stats', () => {
    it('should return total horsePower sum', async () => {
      await Motorcycle.create({ ...motoData, brand: brandId })
      await Motorcycle.create({
        ...motoData,
        name: 'R1',
        horsePower: 200,
        brand: brandId
      })

      const res = await request(app).get('/api/v1/motorcycles/stats')

      expect(res.status).toBe(200)
      expect(res.body).toBe(273)
    })
  })

  describe('GET /api/v1/motorcycles/max-stats', () => {
    it('should return max values for numeric fields', async () => {
      await Motorcycle.create({ ...motoData, brand: brandId })
      await Motorcycle.create({
        ...motoData,
        name: 'R1',
        horsePower: 200,
        price: 20000,
        brand: brandId
      })

      const res = await request(app).get('/api/v1/motorcycles/max-stats')

      expect(res.status).toBe(200)
      expect(res.body.maxHorsePower).toBe(200)
      expect(res.body.maxPrice).toBe(20000)
    })
  })

  describe('PUT /api/v1/motorcycles/:id', () => {
    it('should update a motorcycle', async () => {
      const moto = await Motorcycle.create({ ...motoData, brand: brandId })

      const res = await request(app)
        .put(`/api/v1/motorcycles/${moto._id}`)
        .set('Cookie', adminCookie)
        .send({ name: 'MT-07 Updated' })

      expect(res.status).toBe(200)
      expect(res.body.motorcycle).toBeDefined()
    })

    it('should return 404 for non-existent id', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      const res = await request(app)
        .put(`/api/v1/motorcycles/${fakeId}`)
        .set('Cookie', adminCookie)
        .send({ name: 'Ghost' })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/v1/motorcycles/:id', () => {
    it('should delete a motorcycle', async () => {
      const moto = await Motorcycle.create({ ...motoData, brand: brandId })

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
      const moto = await Motorcycle.create({ ...motoData, brand: brandId })
      const res = await request(app)
        .put(`/api/v1/motorcycles/${moto._id}`)
        .send({ name: 'Hacked' })

      expect(res.status).toBe(401)
    })

    it('PUT should return 403 for a non-admin user', async () => {
      const moto = await Motorcycle.create({ ...motoData, brand: brandId })
      const res = await request(app)
        .put(`/api/v1/motorcycles/${moto._id}`)
        .set('Cookie', userCookie)
        .send({ name: 'Hacked' })

      expect(res.status).toBe(403)
    })

    it('DELETE should return 401 without a token', async () => {
      const moto = await Motorcycle.create({ ...motoData, brand: brandId })
      const res = await request(app).delete(`/api/v1/motorcycles/${moto._id}`)

      expect(res.status).toBe(401)
    })

    it('DELETE should return 403 for a non-admin user', async () => {
      const moto = await Motorcycle.create({ ...motoData, brand: brandId })
      const res = await request(app)
        .delete(`/api/v1/motorcycles/${moto._id}`)
        .set('Cookie', userCookie)

      expect(res.status).toBe(403)
    })
  })
})
