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

    it('should filter only allowed fields (no password, no email)', async () => {
      const res = await request(app).get(
        '/api/v1/users?project=password,email,pseudo'
      )

      expect(res.status).toBe(200)
      const user = res.body.users[0]
      expect(user.password).toBeUndefined()
      expect(user.email).toBeUndefined()
      expect(user.pseudo).toBe(userData.pseudo)
    })

    it('should respect limit parameter', async () => {
      await User.create({
        ...userData,
        email: 'john2@test.com',
        pseudo: 'johnd2'
      })
      const res = await request(app).get('/api/v1/users?project=pseudo&limit=1')

      expect(res.status).toBe(200)
      expect(res.body.users.length).toBe(1)
    })

    it('should reject filters on private fields', async () => {
      const res = await request(app).get(
        `/api/v1/users?filter=${JSON.stringify({ isAdmin: true })}`
      )

      expect(res.status).toBe(400)
    })

    it('should allow filtering by _id', async () => {
      const res = await request(app).get(
        `/api/v1/users?filter=${JSON.stringify({ _id: userId })}&project=pseudo`
      )

      expect(res.status).toBe(200)
      expect(res.body.users.length).toBe(1)
      expect(res.body.users[0].pseudo).toBe(userData.pseudo)
    })

    it('should reject an invalid limit', async () => {
      const zero = await request(app).get('/api/v1/users?limit=0')
      expect(zero.status).toBe(400)

      const nan = await request(app).get('/api/v1/users?limit=abc')
      expect(nan.status).toBe(400)
    })
  })

  describe('POST /api/v1/users/account', () => {
    const newUser = {
      firstname: 'Jane',
      lastname: 'Roe',
      pseudo: 'janer',
      email: 'jane@test.com',
      password: 'secretpass',
      userType: 'confirmed' as const,
      ridingStartYear: 2010
    }

    it('should create a new account (201, no password, not admin)', async () => {
      const res = await request(app)
        .post('/api/v1/users/account')
        .send(newUser)

      expect(res.status).toBe(201)
      expect(res.body.users).toBeDefined()
      expect(res.body.users.email).toBe(newUser.email)
      expect(res.body.users.password).toBeUndefined()
      expect(res.body.users.isAdmin).toBe(false)

      const stored = await User.findOne({ email: newUser.email })
      expect(stored).not.toBeNull()
    })

    it('should reject a duplicate email with 409', async () => {
      const res = await request(app)
        .post('/api/v1/users/account')
        .send({ ...newUser, email: userData.email, pseudo: 'other' })

      expect(res.status).toBe(409)
      expect(res.body.error).toBe('User already exists')
    })

    it('should reject a missing email with 400', async () => {
      const rest: Partial<typeof newUser> = { ...newUser }
      delete rest.email
      const res = await request(app).post('/api/v1/users/account').send(rest)

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Email and password are required')
    })

    it('should reject a missing password with 400', async () => {
      const rest: Partial<typeof newUser> = { ...newUser }
      delete rest.password
      const res = await request(app).post('/api/v1/users/account').send(rest)

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Email and password are required')
    })

    it('should reject a non-string email with 400', async () => {
      const res = await request(app)
        .post('/api/v1/users/account')
        .send({ ...newUser, email: { $gt: '' } })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Email and password are required')
    })

    it('should reject a non-string password with 400', async () => {
      const res = await request(app)
        .post('/api/v1/users/account')
        .send({ ...newUser, password: { $gt: '' } })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Email and password are required')
    })

    it('should reject missing profile fields with 400 (not 500)', async () => {
      const rest: Partial<typeof newUser> = { ...newUser }
      delete rest.pseudo
      const res = await request(app).post('/api/v1/users/account').send(rest)

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Firstname, lastname and pseudo are required')
    })
  })

  describe('PUT /api/v1/users/account', () => {
    it('should update allowed fields (firstname, pseudo)', async () => {
      const res = await request(app)
        .put('/api/v1/users/account')
        .set('Cookie', authCookie)
        .send({ firstname: 'Johnny', pseudo: 'newpseudo' })

      expect(res.status).toBe(200)
      expect(res.body.users.firstname).toBe('Johnny')
      expect(res.body.users.pseudo).toBe('newpseudo')
      expect(res.body.users.password).toBeUndefined()
    })

    it('should reject a pseudo already taken by another user with 409', async () => {
      await User.create({
        ...userData,
        email: 'taken@test.com',
        pseudo: 'takenpseudo'
      })

      const res = await request(app)
        .put('/api/v1/users/account')
        .set('Cookie', authCookie)
        .send({ pseudo: 'takenpseudo' })

      expect(res.status).toBe(409)
      expect(res.body.error).toBe('Pseudo already taken')
    })

    it('should allow keeping your own pseudo', async () => {
      const res = await request(app)
        .put('/api/v1/users/account')
        .set('Cookie', authCookie)
        .send({ pseudo: userData.pseudo })

      expect(res.status).toBe(200)
      expect(res.body.users.pseudo).toBe(userData.pseudo)
    })

    it('should reject a non-string pseudo with 400', async () => {
      const res = await request(app)
        .put('/api/v1/users/account')
        .set('Cookie', authCookie)
        .send({ pseudo: { $ne: null } })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Pseudo must be a string')
    })

    it('should reject ridingStartYear before 1950 with 400', async () => {
      const res = await request(app)
        .put('/api/v1/users/account')
        .set('Cookie', authCookie)
        .send({ ridingStartYear: 1900 })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Riding start year must be between 1950')
    })

    it('should reject a falsy ridingStartYear (0) with 400', async () => {
      const res = await request(app)
        .put('/api/v1/users/account')
        .set('Cookie', authCookie)
        .send({ ridingStartYear: 0 })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Riding start year must be between 1950')
    })

    it('should reject a future ridingStartYear with 400', async () => {
      const future = new Date().getFullYear() + 1
      const res = await request(app)
        .put('/api/v1/users/account')
        .set('Cookie', authCookie)
        .send({ ridingStartYear: future })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Riding start year must be between 1950')
    })

    it('should reject a non-numeric ridingStartYear with 400', async () => {
      const res = await request(app)
        .put('/api/v1/users/account')
        .set('Cookie', authCookie)
        .send({ ridingStartYear: 'abc' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Riding start year must be between 1950')
    })

    it('should change the password so the user can log in with the new one', async () => {
      const newPassword = 'brandNewPass456'
      const res = await request(app)
        .put('/api/v1/users/account')
        .set('Cookie', authCookie)
        .send({ password: newPassword })

      expect(res.status).toBe(200)

      const login = await request(app)
        .post('/api/v1/auth')
        .send({ email: userData.email, password: newPassword })

      expect(login.status).toBe(200)
      expect(login.body.message).toBe('Connected')

      const oldLogin = await request(app)
        .post('/api/v1/auth')
        .send({ email: userData.email, password: userData.password })

      expect(oldLogin.status).toBe(401)
    })

    it('should ignore disallowed fields (email, isAdmin)', async () => {
      const res = await request(app)
        .put('/api/v1/users/account')
        .set('Cookie', authCookie)
        .send({ email: 'hacker@test.com', isAdmin: true, firstname: 'Changed' })

      expect(res.status).toBe(200)
      expect(res.body.users.firstname).toBe('Changed')

      const stored = await User.findById(userId)
      expect(stored?.email).toBe(userData.email)
      expect(stored?.isAdmin).toBe(false)
    })

    it('should return 401 without token', async () => {
      const res = await request(app)
        .put('/api/v1/users/account')
        .send({ firstname: 'Nope' })

      expect(res.status).toBe(401)
      expect(res.body.message).toBe('Non authentifié')
    })
  })

  describe('GET /api/v1/users/count', () => {
    it('should return total user count', async () => {
      const res = await request(app).get('/api/v1/users/count')

      expect(res.status).toBe(200)
      expect(res.body).toBe(1)
    })

    it('should reflect multiple users', async () => {
      await User.create({
        ...userData,
        email: 'second@test.com',
        pseudo: 'second'
      })
      await User.create({
        ...userData,
        email: 'third@test.com',
        pseudo: 'third'
      })

      const res = await request(app).get('/api/v1/users/count')

      expect(res.status).toBe(200)
      expect(res.body).toBe(3)
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

    it('should count the current month cumulative total as at least 1', async () => {
      const res = await request(app).get('/api/v1/users/stats/monthly')

      expect(res.status).toBe(200)
      const currentMonth = new Date().getMonth() + 1
      const entry = res.body.stats.find(
        (s: { month: number; total: number }) => s.month === currentMonth
      )
      expect(entry).toBeDefined()
      expect(entry.total).toBeGreaterThanOrEqual(1)
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
