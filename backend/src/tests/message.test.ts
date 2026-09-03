import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app'
import Message from '../models/Message'
import User from '../models/User'
import Post from '../models/Post'
import Brand from '../models/Brand'
import { PostCategory } from '../constants/PostCategory'

describe('Message Routes - /api/v1/messages', () => {
  let userId: string
  let postId: string
  let authCookie: string

  beforeEach(async () => {
    const user = await User.create({
      firstname: 'John',
      lastname: 'Doe',
      pseudo: 'johnd',
      email: 'john@test.com',
      password: 'pass'
    })
    const brand = await Brand.create({ name: 'Yamaha', icon: 'yamaha.svg' })
    const brandSnapshot = { _id: brand._id, name: brand.name, icon: brand.icon }
    const post = await Post.create({
      title: 'Test Post',
      content: 'Content',
      user: user._id,
      brand: brandSnapshot,
      category: PostCategory.RACING
    })
    userId = user._id.toString()
    postId = post._id.toString()
    const token = jwt.sign(
      { id: userId, email: user.email },
      process.env.JWT_SECRET!
    )
    authCookie = `accessToken=${token}`
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

  describe('GET /api/v1/messages/:id/responses', () => {
    it('should return responses for a message', async () => {
      const parent = await Message.create({ content: 'Parent', user: userId })
      await Message.create({
        content: 'A response',
        user: userId,
        reference: parent._id,
        referenceModel: 'Message'
      })

      const res = await request(app).get(
        `/api/v1/messages/${parent._id.toString()}/responses`
      )

      expect(res.status).toBe(200)
      expect(res.body.messages).toBeInstanceOf(Array)
      expect(res.body.messages.length).toBe(1)
      expect(res.body.messages[0].content).toBe('A response')
    })

    it('should return 404 for an unknown message', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      const res = await request(app).get(
        `/api/v1/messages/${fakeId}/responses`
      )

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Message not found')
    })
  })

  describe('POST /api/v1/messages', () => {
    it('should create a new message', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Cookie', authCookie)
        .send({
          content: 'New message',
          reference: postId,
          referenceModel: 'Post'
        })

      expect(res.status).toBe(201)
      // Minimal response: just the id.
      expect(res.body._id).toBeTruthy()
      expect(res.body.content).toBeUndefined()

      // The message is persisted with the author derived from the token.
      const stored = await Message.findById(res.body._id)
      expect(stored!.content).toBe('New message')
      expect(stored!.user!.toString()).toBe(userId)
    })

    it('should return 401 without a token', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .send({ content: 'Nope', reference: postId, referenceModel: 'Post' })

      expect(res.status).toBe(401)
    })

    it('should fail without content', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Cookie', authCookie)
        .send({})

      // Missing content is a client error: validated up front as a 400.
      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /api/v1/messages', () => {
    it('should like a message', async () => {
      const msg = await Message.create({ content: 'Likeable', user: userId })

      const res = await request(app)
        .patch('/api/v1/messages')
        .set('Cookie', authCookie)
        .send({ userId, messageId: msg._id.toString(), like: true })

      expect(res.status).toBe(200)
      expect(res.body.populatedMessage.like).toBe(1)
      // Raw reactor arrays are never exposed; a per-viewer boolean is.
      expect(res.body.populatedMessage.likedByMe).toBe(true)
      expect(res.body.populatedMessage.usersLikeId).toBeUndefined()
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
        .set('Cookie', authCookie)
        .send({ userId, messageId: msg._id.toString(), like: true })

      expect(res.status).toBe(200)
      expect(res.body.populatedMessage.like).toBe(0)
      expect(res.body.populatedMessage.likedByMe).toBe(false)
    })

    it('should dislike a message', async () => {
      const msg = await Message.create({ content: 'Dislikeable', user: userId })

      const res = await request(app)
        .patch('/api/v1/messages')
        .set('Cookie', authCookie)
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
        .set('Cookie', authCookie)
        .send({ userId, messageId: msg._id.toString(), like: false })

      expect(res.status).toBe(200)
      expect(res.body.populatedMessage.like).toBe(0)
      expect(res.body.populatedMessage.dislike).toBe(1)
    })

    it('should return 400 without required fields', async () => {
      const res = await request(app)
        .patch('/api/v1/messages')
        .set('Cookie', authCookie)
        .send({})

      expect(res.status).toBe(400)
    })

    it('should return 404 for non-existent message', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      const res = await request(app)
        .patch('/api/v1/messages')
        .set('Cookie', authCookie)
        .send({ userId, messageId: fakeId, like: true })

      expect(res.status).toBe(404)
    })

    it('should return 401 without a token', async () => {
      const msg = await Message.create({ content: 'Guarded', user: userId })

      const res = await request(app)
        .patch('/api/v1/messages')
        .send({ userId, messageId: msg._id.toString(), like: true })

      expect(res.status).toBe(401)
    })

    it('should toggle dislike off', async () => {
      const msg = await Message.create({
        content: 'Disliked',
        user: userId,
        usersDislikeId: [userId],
        dislike: 1
      })

      const res = await request(app)
        .patch('/api/v1/messages')
        .set('Cookie', authCookie)
        .send({ userId, messageId: msg._id.toString(), like: false })

      expect(res.status).toBe(200)
      expect(res.body.populatedMessage.dislike).toBe(0)
      expect(res.body.populatedMessage.dislikedByMe).toBe(false)
    })
  })

  describe('DELETE /api/v1/messages/:id', () => {
    it('should return 401 without a token', async () => {
      const msg = await Message.create({ content: 'To delete', user: userId })

      const res = await request(app).delete(`/api/v1/messages/${msg._id}`)

      expect(res.status).toBe(401)
    })

    it('should return 404 for an unknown id', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      const res = await request(app)
        .delete(`/api/v1/messages/${fakeId}`)
        .set('Cookie', authCookie)

      expect(res.status).toBe(404)
    })

    it('should return 403 when a non-owner non-admin deletes a message', async () => {
      const msg = await Message.create({ content: 'Owned', user: userId })
      const other = await User.create({
        firstname: 'Other',
        lastname: 'User',
        pseudo: 'other',
        email: 'other@test.com',
        password: 'pass',
        isAdmin: false
      })
      const otherToken = jwt.sign(
        { id: other._id.toString(), email: other.email },
        process.env.JWT_SECRET!
      )

      const res = await request(app)
        .delete(`/api/v1/messages/${msg._id}`)
        .set('Cookie', `accessToken=${otherToken}`)

      expect(res.status).toBe(403)
      expect(await Message.findById(msg._id)).not.toBeNull()
    })

    it('owner delete should cascade direct responses but spare unrelated messages (204)', async () => {
      const parent = await Message.create({ content: 'Parent', user: userId })
      await Message.create({
        content: 'Response',
        user: userId,
        reference: parent._id,
        referenceModel: 'Message'
      })
      const unrelated = await Message.create({
        content: 'Unrelated',
        user: userId
      })

      const res = await request(app)
        .delete(`/api/v1/messages/${parent._id}`)
        .set('Cookie', authCookie)

      expect(res.status).toBe(204)
      expect(await Message.findById(parent._id)).toBeNull()
      expect(
        await Message.countDocuments({
          reference: parent._id,
          referenceModel: 'Message'
        })
      ).toBe(0)
      expect(await Message.findById(unrelated._id)).not.toBeNull()
    })

    it('should let an admin delete another user message (204)', async () => {
      const owner = await User.create({
        firstname: 'Owner',
        lastname: 'User',
        pseudo: 'owner',
        email: 'owner@test.com',
        password: 'pass',
        isAdmin: false
      })
      const msg = await Message.create({
        content: 'Owned by someone',
        user: owner._id
      })
      const admin = await User.create({
        firstname: 'Super',
        lastname: 'Admin',
        pseudo: 'superadmin',
        email: 'superadmin@test.com',
        password: 'pass',
        isAdmin: true
      })
      const adminToken = jwt.sign(
        { id: admin._id.toString(), email: admin.email },
        process.env.JWT_SECRET!
      )

      const res = await request(app)
        .delete(`/api/v1/messages/${msg._id}`)
        .set('Cookie', `accessToken=${adminToken}`)

      expect(res.status).toBe(204)
      expect(await Message.findById(msg._id)).toBeNull()
    })
  })
})
