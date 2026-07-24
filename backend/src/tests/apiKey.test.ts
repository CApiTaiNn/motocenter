import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app'
import User from '../models/User'
import ApiKey from '../models/ApiKey'
import { hashApiKey } from '../utils/auth'

// Exercises the x-api-key auth path added to authenticateToken. Uses a
// protected admin route (POST /api/v1/brands) as the target.
describe('API key auth (x-api-key)', () => {
  const adminKey = 'mc_admintestkey'
  const userKey = 'mc_usertestkey'

  beforeEach(async () => {
    const admin = await User.create({
      firstname: 'Admin',
      lastname: 'User',
      pseudo: 'admin',
      email: 'admin@test.com',
      password: 'password123',
      isAdmin: true
    })
    const user = await User.create({
      firstname: 'Regular',
      lastname: 'User',
      pseudo: 'regular',
      email: 'regular@test.com',
      password: 'password123',
      isAdmin: false
    })
    await ApiKey.create([
      { hash: hashApiKey(adminKey), user: admin._id, label: 'admin' },
      { hash: hashApiKey(userKey), user: user._id, label: 'user' }
    ])
  })

  it('authenticates an admin via x-api-key and authorizes the write', async () => {
    const res = await request(app)
      .post('/api/v1/brands')
      .set('x-api-key', adminKey)
      .send({ name: 'Ducati', icon: 'ducati.svg' })

    expect(res.status).toBe(201)
    expect(res.body._id).toBeTruthy()
  })

  it('stores only the hash, never the raw key', async () => {
    const stored = await ApiKey.findOne({ hash: hashApiKey(adminKey) })
    expect(stored).toBeTruthy()
    expect(JSON.stringify(stored)).not.toContain(adminKey)
  })

  it('records lastUsedAt after a request', async () => {
    await request(app)
      .post('/api/v1/brands')
      .set('x-api-key', adminKey)
      .send({ name: 'Ducati', icon: 'ducati.svg' })

    const stored = await ApiKey.findOne({ hash: hashApiKey(adminKey) })
    expect(stored!.lastUsedAt).toBeTruthy()
  })

  it("rejects a non-admin's key with 403 on an admin route", async () => {
    const res = await request(app)
      .post('/api/v1/brands')
      .set('x-api-key', userKey)
      .send({ name: 'Ducati', icon: 'ducati.svg' })

    expect(res.status).toBe(403)
  })

  it('rejects an unknown key with 401', async () => {
    const res = await request(app)
      .post('/api/v1/brands')
      .set('x-api-key', 'mc_nope')
      .send({ name: 'Ducati', icon: 'ducati.svg' })

    expect(res.status).toBe(401)
  })

  it('rejects a revoked key with 401', async () => {
    await ApiKey.deleteMany({ hash: hashApiKey(adminKey) })
    const res = await request(app)
      .post('/api/v1/brands')
      .set('x-api-key', adminKey)
      .send({ name: 'Ducati', icon: 'ducati.svg' })

    expect(res.status).toBe(401)
  })
})
