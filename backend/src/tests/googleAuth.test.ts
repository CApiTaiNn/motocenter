import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Control what the mocked Google client returns for each test.
let mockPayload: Record<string, unknown> | null = null
let verifyShouldThrow = false

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    async verifyIdToken() {
      if (verifyShouldThrow) throw new Error('invalid token')
      return { getPayload: () => mockPayload }
    }
  }
}))

import request from 'supertest'
import app from '../app'
import User from '../models/User'

describe('Auth Routes - POST /api/v1/auth/google', () => {
  const originalClientId = process.env.GOOGLE_CLIENT_ID

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com'
    verifyShouldThrow = false
    mockPayload = {
      email: 'rider@gmail.com',
      email_verified: true,
      sub: 'google-sub-123',
      given_name: 'Alex',
      family_name: 'Martin',
      name: 'Alex Martin',
      picture: 'https://example.com/a.png'
    }
  })

  afterEach(() => {
    process.env.GOOGLE_CLIENT_ID = originalClientId
  })

  it('creates a Google user and sets the session cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'id-token' })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Connected')
    expect(res.headers['set-cookie'][0]).toContain('accessToken')

    const user = await User.findOne({ email: 'rider@gmail.com' }).select(
      '+password +providerId'
    )
    expect(user).toBeTruthy()
    expect(user!.provider).toBe('google')
    expect(user!.providerId).toBe('google-sub-123')
    expect(user!.emailVerified).toBe(true)
    // Social accounts have no password.
    expect(user!.password).toBeUndefined()
  })

  it('logs in an existing account with the same email without duplicating it', async () => {
    await User.create({
      firstname: 'Alex',
      lastname: 'Martin',
      pseudo: 'existing',
      email: 'rider@gmail.com',
      password: 'a'.repeat(12)
    })

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'id-token' })

    expect(res.status).toBe(200)
    expect(await User.countDocuments({ email: 'rider@gmail.com' })).toBe(1)
  })

  it('rejects a missing credential with 400', async () => {
    const res = await request(app).post('/api/v1/auth/google').send({})
    expect(res.status).toBe(400)
  })

  it('rejects an unverified Google email with 401', async () => {
    mockPayload!.email_verified = false
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'id-token' })
    expect(res.status).toBe(401)
  })

  it('rejects an invalid token with 401', async () => {
    verifyShouldThrow = true
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'id-token' })
    expect(res.status).toBe(401)
  })

  it('returns 503 when Google sign-in is not configured', async () => {
    delete process.env.GOOGLE_CLIENT_ID
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'id-token' })
    expect(res.status).toBe(503)
  })
})
