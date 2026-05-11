import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app'
import Message from '../models/Message'
import User from '../models/User'
import Post from '../models/Post'
import Brand from '../models/Brand'
import Category from '../models/Category'

describe('Message Routes - /api/v1/messages', () => {
  let userId: string
  let postId: string

  beforeEach(async () => {
    const user = await User.create({
      firstname: 'John',
      lastname: 'Doe',
      pseudo: 'johnd',
      email: 'john@test.com',
      password: 'pass'
    })
    const brand = await Brand.create({ name: 'Yamaha', icon: 'yamaha.svg' })
    const category = await Category.create({ name: 'Sport', icon: 'sport.svg' })
    const post = await Post.create({
      title: 'Test Post',
      content: 'Content',
      user: user._id,
      brand: brand._id,
      category: category._id
    })
    userId = user._id.toString()
    postId = post._id.toString()
  })

  describe('GET /api/v1/messages', () => {
    it('should return messages list', async () => {
      await Message.create({ content: 'Hello', user: userId })

      const res = await request(app).get('/api/v1/messages?project=all')

      expect(res.status).toBe(200)
      expect(res.body.messages).toBeInstanceOf(Array)
      expect(res.body.messages.length).toBe(1)
    })

    it('should deep populate user', async () => {
      await Message.create({ content: 'Hello', user: userId })

      const res = await request(app).get(
        '/api/v1/messages?project=all&deep=true'
      )

      expect(res.status).toBe(200)
      expect(res.body.messages[0].user.pseudo).toBe('johnd')
    })
  })

  describe('POST /api/v1/messages', () => {
    it('should create a new message', async () => {
      const res = await request(app).post('/api/v1/messages').send({
        content: 'New message',
        reference: postId,
        referenceModel: 'Post',
        user: userId
      })

      expect(res.status).toBe(201)
      expect(res.body.content).toBe('New message')
    })

    it('should fail without content', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .send({ user: userId })

      expect(res.status).toBe(500)
    })
  })

  describe('PATCH /api/v1/messages', () => {
    it('should like a message', async () => {
      const msg = await Message.create({ content: 'Likeable', user: userId })

      const res = await request(app)
        .patch('/api/v1/messages')
        .send({ userId, messageId: msg._id.toString(), like: true })

      expect(res.status).toBe(200)
      expect(res.body.populatedMessage.like).toBe(1)
      expect(res.body.populatedMessage.usersLikeId).toContain(userId)
    })

    it('should toggle like off', async () => {
      const msg = await Message.create({
        content: 'Liked',
        user: userId,
        usersLikeId: [userId],
        like: 1
      })

      const res = await request(app)
        .patch('/api/v1/messages')
        .send({ userId, messageId: msg._id.toString(), like: true })

      expect(res.status).toBe(200)
      expect(res.body.populatedMessage.like).toBe(0)
      expect(res.body.populatedMessage.usersLikeId).not.toContain(userId)
    })

    it('should dislike a message', async () => {
      const msg = await Message.create({ content: 'Dislikeable', user: userId })

      const res = await request(app)
        .patch('/api/v1/messages')
        .send({ userId, messageId: msg._id.toString(), like: false })

      expect(res.status).toBe(200)
      expect(res.body.populatedMessage.dislike).toBe(1)
    })

    it('should switch from like to dislike', async () => {
      const msg = await Message.create({
        content: 'Switch',
        user: userId,
        usersLikeId: [userId],
        like: 1
      })

      const res = await request(app)
        .patch('/api/v1/messages')
        .send({ userId, messageId: msg._id.toString(), like: false })

      expect(res.status).toBe(200)
      expect(res.body.populatedMessage.like).toBe(0)
      expect(res.body.populatedMessage.dislike).toBe(1)
    })

    it('should return 400 without required fields', async () => {
      const res = await request(app).patch('/api/v1/messages').send({})

      expect(res.status).toBe(400)
    })

    it('should return 404 for non-existent message', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      const res = await request(app)
        .patch('/api/v1/messages')
        .send({ userId, messageId: fakeId, like: true })

      expect(res.status).toBe(404)
    })
  })
})
