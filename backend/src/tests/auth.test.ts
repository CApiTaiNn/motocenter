import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app'
import User from '../models/User'
import { argon2PasswordHasher } from '../utils/hash'
import { hashToken } from '../utils/tokens'

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

    it('should reject NoSQL operator payloads instead of querying them', async () => {
      const res = await request(app)
        .post('/api/v1/auth')
        .send({ email: { $gt: '' }, password: userData.password })

      expect(res.status).toBe(401)
      expect(res.body.message).toBe('Email ou mot de passe incorrect')
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

  describe('POST /api/v1/auth/forgot-password', () => {
    it('returns 200 for an unknown email without leaking existence', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nobody@test.com' })

      expect(res.status).toBe(200)
    })

    it('stores a reset token for a known email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: userData.email })

      expect(res.status).toBe(200)
      const user = await User.findOne({ email: userData.email }).select(
        '+passwordResetToken +passwordResetExpires'
      )
      expect(user!.passwordResetToken).toBeTruthy()
      expect(user!.passwordResetExpires!.getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('POST /api/v1/auth/reset-password', () => {
    const setResetToken = async (raw: string, expires: Date) => {
      await User.updateOne(
        { email: userData.email },
        { passwordResetToken: hashToken(raw), passwordResetExpires: expires }
      )
    }

    it('sets a new password and lets the user log in with it', async () => {
      await setResetToken('rawtoken1', new Date(Date.now() + 60_000))

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'rawtoken1', password: 'brandNewPass456' })

      expect(res.status).toBe(200)

      const login = await request(app)
        .post('/api/v1/auth')
        .send({ email: userData.email, password: 'brandNewPass456' })
      expect(login.status).toBe(200)

      const oldLogin = await request(app)
        .post('/api/v1/auth')
        .send({ email: userData.email, password: userData.password })
      expect(oldLogin.status).toBe(401)
    })

    it('rejects a weak password even with a valid token', async () => {
      await setResetToken('rawtoken2', new Date(Date.now() + 60_000))

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'rawtoken2', password: 'short' })

      expect(res.status).toBe(400)
    })

    it('rejects an expired token with 400', async () => {
      await setResetToken('rawtoken3', new Date(Date.now() - 60_000))

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'rawtoken3', password: 'brandNewPass456' })

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Invalid or expired token')
    })

    it('rejects an unknown token with 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'doesnotexist', password: 'brandNewPass456' })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/v1/auth/verify-email', () => {
    it('marks the email verified with a valid token', async () => {
      await User.updateOne(
        { email: userData.email },
        {
          emailVerificationToken: hashToken('verify1'),
          emailVerificationExpires: new Date(Date.now() + 60_000)
        }
      )

      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: 'verify1' })

      expect(res.status).toBe(200)
      const user = await User.findOne({ email: userData.email })
      expect(user!.emailVerified).toBe(true)
    })

    it('rejects an invalid token with 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: 'nope' })

      expect(res.status).toBe(400)
    })
  })
})
