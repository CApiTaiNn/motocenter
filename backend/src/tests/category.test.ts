import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app'
import Category from '../models/Category'

describe('Category Routes - /api/v1/categories', () => {
  beforeEach(async () => {
    await Category.create([
      { name: 'Sport', icon: 'sport.svg' },
      { name: 'Touring', icon: 'touring.svg' }
    ])
  })

  describe('GET /api/v1/categories', () => {
    it('should return all categories', async () => {
      const res = await request(app).get('/api/v1/categories?project=all')

      expect(res.status).toBe(200)
      expect(res.body.categories).toBeInstanceOf(Array)
      expect(res.body.categories.length).toBe(2)
    })

    it('should respect limit parameter', async () => {
      const res = await request(app).get(
        '/api/v1/categories?project=all&limit=1'
      )

      expect(res.status).toBe(200)
      expect(res.body.categories.length).toBe(1)
    })

    it('should project specific fields', async () => {
      const res = await request(app).get('/api/v1/categories?project=name')

      expect(res.status).toBe(200)
      expect(res.body.categories[0].name).toBeDefined()
      expect(res.body.categories[0].icon).toBeUndefined()
    })
  })
})
