import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// Shared spies so each test can assert / reconfigure the fake Supabase client.
const uploadMock = vi.fn()
const getPublicUrlMock = vi.fn()
const fromMock = vi.fn(() => ({
  upload: uploadMock,
  getPublicUrl: getPublicUrlMock
}))

vi.mock('../utils/supabase', () => ({
  getSupabase: () => ({
    storage: {
      from: fromMock
    }
  })
}))

// Imported after the mock is registered.
import app from '../app'

// Magic-byte buffers, padded so they pass the minimum-length checks.
const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const gifBuffer = Buffer.from('GIF89a', 'ascii')
const webpBuffer = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii')
])

describe('Image Routes - /api/v1/images', () => {
  beforeEach(() => {
    uploadMock.mockReset()
    getPublicUrlMock.mockReset()
    fromMock.mockClear()
    uploadMock.mockResolvedValue({ data: { path: 'x' }, error: null })
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: 'http://fake/x' }
    })
  })

  it('returns 400 when no file is uploaded', async () => {
    const res = await request(app).post('/api/v1/images')

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Please upload a file')
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
    expect(res.body.error).toBe('Unsupported file type')
  })

  it('rejects an oversize file (>5MB) with 413', async () => {
    const oversize = Buffer.alloc(5 * 1024 * 1024 + 1, 0)

    const res = await request(app)
      .post('/api/v1/images')
      .attach('file', oversize, {
        filename: 'big.png',
        contentType: 'image/png'
      })

    expect(res.status).toBe(413)
  })

  it('accepts a PNG by magic bytes and returns the public url', async () => {
    const res = await request(app)
      .post('/api/v1/images')
      .attach('file', pngBuffer, {
        filename: 'real.png',
        contentType: 'image/png'
      })

    expect(res.status).toBe(200)
    expect(res.body.url).toBe('http://fake/x')
    expect(uploadMock).toHaveBeenCalledTimes(1)
    const [fileName, , options] = uploadMock.mock.calls[0]
    expect(fileName).toMatch(/\.png$/)
    expect(options.contentType).toBe('image/png')
  })

  it('accepts a GIF by magic bytes and returns the public url', async () => {
    const res = await request(app)
      .post('/api/v1/images')
      .attach('file', gifBuffer, {
        filename: 'real.gif',
        contentType: 'image/gif'
      })

    expect(res.status).toBe(200)
    expect(res.body.url).toBe('http://fake/x')
    const [fileName, , options] = uploadMock.mock.calls[0]
    expect(fileName).toMatch(/\.gif$/)
    expect(options.contentType).toBe('image/gif')
  })

  it('accepts a WEBP by magic bytes and returns the public url', async () => {
    const res = await request(app)
      .post('/api/v1/images')
      .attach('file', webpBuffer, {
        filename: 'real.webp',
        contentType: 'image/webp'
      })

    expect(res.status).toBe(200)
    expect(res.body.url).toBe('http://fake/x')
    const [fileName, , options] = uploadMock.mock.calls[0]
    expect(fileName).toMatch(/\.webp$/)
    expect(options.contentType).toBe('image/webp')
  })

  it('returns 500 when the Supabase upload errors', async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: new Error('storage exploded')
    })

    const res = await request(app)
      .post('/api/v1/images')
      .attach('file', pngBuffer, {
        filename: 'real.png',
        contentType: 'image/png'
      })

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Image upload failed')
  })
})
