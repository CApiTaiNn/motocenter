import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../app'

describe('Image Routes - /api/v1/images', () => {
  it('returns 400 when no file is uploaded', async () => {
    const res = await request(app).post('/api/v1/images')

    expect(res.status).toBe(400)
  })

  it('rejects a non-image file by its magic bytes (400)', async () => {
    // A .png filename + image/png mimetype, but the bytes are plain text.
    const res = await request(app)
      .post('/api/v1/images')
      .attach('file', Buffer.from('this is not an image'), {
        filename: 'evil.png',
        contentType: 'image/png'
      })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Unsupported file type')
  })
})
