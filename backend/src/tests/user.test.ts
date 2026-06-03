import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app'
import User from '../models/User'

describe('User Routes - /api/v1/users', () => {
  const userData = {
    firstname: 'John',
    lastname: 'Doe',
    pseudo: 'johnd',
    email: 'john@test.com',
    password: 'password123',
    userType: 'beginner' as const
  }

  let userId: string
  let authCookie: string

  beforeEach(async () => {
    const user = await User.create(userData)
    userId = user._id.toString()
    const token = jwt.sign(
      { id: userId, email: userData.email },
      process.env.JWT_SECRET!
    )
    authCookie = `accessToken=${token}`
  })

  describe('GET /api/v1/users/account', () => {
    it('should return authenticated user info', async () => {
      const res = await request(app)
        .get('/api/v1/users/account?project=all')
        .set('Cookie', authCookie)

      expect(res.status).toBe(200)
      expect(res.body.users).toBeDefined()
      expect(res.body.users.email).toBe(userData.email)
      expect(res.body.users.password).toBeUndefined()
    })

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/users/account')

      expect(res.status).toBe(401)
      expect(res.body.message).toBe('Non authentifié')
    })

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/users/account')
        .set('Cookie', 'accessToken=invalid-token')

      expect(res.status).toBe(401)
      expect(res.body.message).toBe('Token invalide')
    })
  })

  describe('GET /api/v1/users', () => {
    it('should return users list', async () => {
      const res = await request(app).get('/api/v1/users?project=email,pseudo')

      expect(res.status).toBe(200)
      expect(res.body.users).toBeInstanceOf(Array)
      expect(res.body.users.length).toBe(1)
    })

    it('should filter only allowed fields (no password)', async () => {
      const res = await request(app).get('/api/v1/users?project=password,email')

      expect(res.status).toBe(200)
      const user = res.body.users[0]
      expect(user.password).toBeUndefined()
      expect(user.email).toBe(userData.email)
    })

    it('should respect limit parameter', async () => {
      await User.create({
        ...userData,
        email: 'john2@test.com',
        pseudo: 'johnd2'
      })
      const res = await request(app).get('/api/v1/users?project=email&limit=1')

      expect(res.status).toBe(200)
      expect(res.body.users.length).toBe(1)
    })
  })

  describe('GET /api/v1/users/count', () => {
    it('should return total user count', async () => {
      const res = await request(app).get('/api/v1/users/count')

      expect(res.status).toBe(200)
      expect(res.body).toBe(1)
    })
  })

  describe('GET /api/v1/users/stats/monthly', () => {
    it('should return monthly stats', async () => {
      const res = await request(app).get('/api/v1/users/stats/monthly')

      expect(res.status).toBe(200)
      expect(res.body.stats).toBeInstanceOf(Array)
      expect(res.body.stats.length).toBe(12)
      expect(res.body.stats[0]).toHaveProperty('month')
      expect(res.body.stats[0]).toHaveProperty('total')
    })
  })

  describe('Query hardening', () => {
    it('rejects a $where filter with 400', async () => {
      const res = await request(app).get(
        `/api/v1/users?filter=${encodeURIComponent('{"$where":"1==1"}')}`
      )

      expect(res.status).toBe(400)
    })

    it('rejects a malformed filter with 400', async () => {
      const res = await request(app).get('/api/v1/users?filter=not-json')

      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/v1/users/account', () => {
    it('should delete the authenticated user account', async () => {
      const res = await request(app)
        .delete('/api/v1/users/account')
        .set('Cookie', authCookie)

      expect(res.status).toBe(200)
      expect(res.body.message).toBe('User deleted successfully')

      const deleted = await User.findById(userId)
      expect(deleted).toBeNull()
    })

    it('should return 401 without token', async () => {
      const res = await request(app).delete('/api/v1/users/account')

      expect(res.status).toBe(401)
      expect(res.body.message).toBe('Non authentifié')
    })

    it('should return 404 if the user no longer exists', async () => {
      await User.findByIdAndDelete(userId)

      const res = await request(app)
        .delete('/api/v1/users/account')
        .set('Cookie', authCookie)

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('User not found')
    })
  })
})
