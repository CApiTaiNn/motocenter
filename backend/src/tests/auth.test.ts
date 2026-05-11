import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app'
import User from '../models/User'
import { argon2PasswordHasher } from '../utils/hash'

describe('Auth Routes - /api/v1/auth', () => {
  const userData = {
    firstname: 'John',
    lastname: 'Doe',
    pseudo: 'johnd',
    email: 'john@test.com',
    password: 'password123',
    isAdmin: false
  }

  beforeEach(async () => {
    const hashedPassword = await argon2PasswordHasher.hash(userData.password)
    await User.create({ ...userData, password: hashedPassword })
  })

  describe('POST /api/v1/auth', () => {
    it('should login with valid credentials and set cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth')
        .send({ email: userData.email, password: userData.password })

      expect(res.status).toBe(200)
      expect(res.body.message).toBe('Connected')
      expect(res.headers['set-cookie']).toBeDefined()
      expect(res.headers['set-cookie'][0]).toContain('accessToken')
    })

    it('should return 401 with wrong email', async () => {
      const res = await request(app)
        .post('/api/v1/auth')
        .send({ email: 'wrong@test.com', password: userData.password })

      expect(res.status).toBe(401)
      expect(res.body.message).toBe('Email ou mot de passe incorrect')
    })

    it('should return 401 with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth')
        .send({ email: userData.email, password: 'wrongpass' })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/v1/auth/logout', () => {
    it('should clear the accessToken cookie', async () => {
      const res = await request(app).post('/api/v1/auth/logout')

      expect(res.status).toBe(200)
      expect(res.body.message).toBe('Disconnected')
      expect(res.headers['set-cookie'][0]).toContain('accessToken=;')
    })
  })
})
