import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app'
import Brand from '../models/Brand'

describe('Brand Routes - /api/v1/brands', () => {
  beforeEach(async () => {
    await Brand.create([
      { name: 'Yamaha', icon: 'yamaha.svg' },
      { name: 'Honda', icon: 'honda.svg' },
      { name: 'Kawasaki', icon: 'kawasaki.svg' }
    ])
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

  describe('GET /api/v1/brands/count', () => {
    it('should return total brand count', async () => {
      const res = await request(app).get('/api/v1/brands/count')

      expect(res.status).toBe(200)
      expect(res.body).toBe(3)
    })
  })
})
