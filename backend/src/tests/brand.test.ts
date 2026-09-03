import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app'
import Brand from '../models/Brand'
import User from '../models/User'

describe('Brand Routes - /api/v1/brands', () => {
  let adminCookie: string
  let userCookie: string

  beforeEach(async () => {
    await Brand.create([
      { name: 'Yamaha', icon: 'yamaha.svg' },
      { name: 'Honda', icon: 'honda.svg' },
      { name: 'Kawasaki', icon: 'kawasaki.svg' }
    ])

    const admin = await User.create({
      firstname: 'Admin',
      lastname: 'User',
      pseudo: 'admin',
      email: 'admin@test.com',
      password: 'password123',
      isAdmin: true
    })
    adminCookie = `accessToken=${jwt.sign(
      { id: admin._id.toString(), email: admin.email },
      process.env.JWT_SECRET!
    )}`

    const user = await User.create({
      firstname: 'Regular',
      lastname: 'User',
      pseudo: 'regular',
      email: 'regular@test.com',
      password: 'password123',
      isAdmin: false
    })
    userCookie = `accessToken=${jwt.sign(
      { id: user._id.toString(), email: user.email },
      process.env.JWT_SECRET!
    )}`
  })

  describe('GET /api/v1/brands', () => {
    it('should return all brands', async () => {
      const res = await request(app).get('/api/v1/brands?project=all')

      expect(res.status).toBe(200)
      expect(res.body.brands).toBeInstanceOf(Array)
      expect(res.body.brands.length).toBe(3)
    })

    it('should respect limit parameter', async () => {
      const res = await request(app).get('/api/v1/brands?project=all&limit=2')

      expect(res.status).toBe(200)
      expect(res.body.brands.length).toBe(2)
    })

    it('should filter brands by name', async () => {
      const res = await request(app).get(
        '/api/v1/brands?project=all&filter={"name":"Honda"}'
      )

      expect(res.status).toBe(200)
      expect(res.body.brands.length).toBe(1)
      expect(res.body.brands[0].name).toBe('Honda')
    })
  })

  describe('POST /api/v1/brands', () => {
    it('should create a brand as admin and echo only the id', async () => {
      const res = await request(app)
        .post('/api/v1/brands')
        .set('Cookie', adminCookie)
        .send({ name: 'Ducati', icon: 'ducati.svg' })

      expect(res.status).toBe(201)
      expect(res.body._id).toBeTruthy()
      expect(res.body.name).toBeUndefined()
      expect(await Brand.countDocuments()).toBe(4)
    })

    it('should be idempotent by name (returns existing id, no duplicate)', async () => {
      const res = await request(app)
        .post('/api/v1/brands')
        .set('Cookie', adminCookie)
        .send({ name: 'Honda', icon: 'other.svg' })

      expect(res.status).toBe(200)
      expect(res.body._id).toBeTruthy()
      expect(await Brand.countDocuments()).toBe(3)
    })

    it('should reject a non-admin with 403', async () => {
      const res = await request(app)
        .post('/api/v1/brands')
        .set('Cookie', userCookie)
        .send({ name: 'Ducati', icon: 'ducati.svg' })

      expect(res.status).toBe(403)
      expect(await Brand.countDocuments()).toBe(3)
    })

    it('should reject an unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/v1/brands')
        .send({ name: 'Ducati', icon: 'ducati.svg' })

      expect(res.status).toBe(401)
    })

    it('should 400 when name or icon is missing', async () => {
      const res = await request(app)
        .post('/api/v1/brands')
        .set('Cookie', adminCookie)
        .send({ name: 'Ducati' })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/v1/brands/count', () => {
    it('should return total brand count', async () => {
      const res = await request(app).get('/api/v1/brands/count')

      expect(res.status).toBe(200)
      expect(res.body).toBe(3)
    })
  })
})
