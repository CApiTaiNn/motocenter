import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app'
import Post from '../models/Post'
import User from '../models/User'
import Brand from '../models/Brand'
import Message from '../models/Message'
import Motorcycle from '../models/Motorcycle'
import { PostCategory } from '../constants/PostCategory'

describe('Post Routes - /api/v1/posts', () => {
  let userId: string
  let brandId: string
  let authCookie: string

  beforeEach(async () => {
    const user = await User.create({
      firstname: 'MotoCenter',
      lastname: 'Admin',
      pseudo: 'admin',
      email: 'admin@test.com',
      password: 'pass'
    })
    const brand = await Brand.create({ name: 'Yamaha', icon: 'yamaha.svg' })
    userId = user._id.toString()
    brandId = brand._id.toString()
    const token = jwt.sign(
      { id: userId, email: user.email },
      process.env.JWT_SECRET!
    )
    authCookie = `accessToken=${token}`
  })

  describe('GET /api/v1/posts', () => {
    it('should return posts list', async () => {
      await Post.create({
        title: 'Test post',
        content: 'Content',
        user: userId,
        brand: brandId,
        category: PostCategory.RACING
      })

      const res = await request(app).get('/api/v1/posts?project=all')

      expect(res.status).toBe(200)
      expect(res.body.posts).toBeInstanceOf(Array)
      expect(res.body.posts.length).toBe(1)
    })

    it('should deep populate user, brand, category', async () => {
      await Post.create({
        title: 'Deep post',
        content: 'Content',
        user: userId,
        brand: brandId,
        category: PostCategory.RACING
      })

      const res = await request(app).get('/api/v1/posts?project=all&deep=true')

      expect(res.status).toBe(200)
      expect(res.body.posts[0].brand.name).toBe('Yamaha')
      expect(res.body.posts[0].category).toBe(PostCategory.RACING)
      expect(res.body.posts[0].user.pseudo).toBe('admin')
    })
  })

  describe('GET /api/v1/posts/count', () => {
    it('should return count and percent', async () => {
      const res = await request(app).get('/api/v1/posts/count')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('count')
      expect(res.body).toHaveProperty('percent')
    })
  })

  describe('GET /api/v1/posts/:id/responses', () => {
    it('should return messages referencing a post', async () => {
      const post = await Post.create({
        title: 'Post with responses',
        content: 'Content',
        user: userId,
        brand: brandId,
        category: PostCategory.RACING
      })

      await Message.create({
        content: 'Reply to post',
        reference: post._id,
        referenceModel: 'Post',
        user: userId
      })

      const res = await request(app).get(
        `/api/v1/posts/${post._id}/responses?project=all`
      )

      expect(res.status).toBe(200)
      expect(res.body.messages).toBeInstanceOf(Array)
      expect(res.body.messages.length).toBe(1)
      expect(res.body.messages[0].content).toBe('Reply to post')
    })

    it('should return 404 for non-existent post', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      const res = await request(app).get(
        `/api/v1/posts/${fakeId}/responses?project=all`
      )

      expect(res.status).toBe(404)
    })

    it('should deep-attach the user on returned messages', async () => {
      const post = await Post.create({
        title: 'Post with deep responses',
        content: 'Content',
        user: userId,
        brand: brandId,
        category: PostCategory.RACING
      })

      await Message.create({
        content: 'Deep reply',
        reference: post._id,
        referenceModel: 'Post',
        user: userId
      })

      const res = await request(app).get(
        `/api/v1/posts/${post._id}/responses?project=all&deep=true`
      )

      expect(res.status).toBe(200)
      expect(res.body.messages.length).toBe(1)
      expect(res.body.messages[0].user._id).toBe(userId)
      expect(res.body.messages[0].user.pseudo).toBe('admin')
    })
  })

  describe('POST /api/v1/posts/add-view', () => {
    it('should increment view count', async () => {
      const post = await Post.create({
        title: 'Viewable post',
        content: 'Content',
        user: userId,
        brand: brandId,
        category: PostCategory.RACING
      })

      await request(app).post(
        `/api/v1/posts/add-view?filter={"id":"${post._id}"}`
      )

      const updated = await Post.findById(post._id)
      expect(updated!.views).toBe(1)
    })
  })

  describe('POST /api/v1/posts/add-favorite', () => {
    it('should return 401 without a token', async () => {
      const post = await Post.create({
        title: 'Fav post',
        content: 'Content',
        user: userId,
        brand: brandId,
        category: PostCategory.RACING
      })

      const res = await request(app)
        .post(`/api/v1/posts/add-favorite?filter={"_id":"${post._id}"}`)
        .send({})

      expect(res.status).toBe(401)
    })

    it('should toggle a favorite on then off', async () => {
      const post = await Post.create({
        title: 'Fav post',
        content: 'Content',
        user: userId,
        brand: brandId,
        category: PostCategory.RACING
      })

      const addRes = await request(app)
        .post(`/api/v1/posts/add-favorite?filter={"_id":"${post._id}"}`)
        .set('Cookie', authCookie)
        .send({})

      expect(addRes.status).toBe(200)
      expect(addRes.body.isAdded).toBe(true)
      const afterAdd = await Post.findById(post._id)
      expect(afterAdd!.userFavoritePost).toContain(userId)

      const removeRes = await request(app)
        .post(`/api/v1/posts/add-favorite?filter={"_id":"${post._id}"}`)
        .set('Cookie', authCookie)
        .send({})

      expect(removeRes.status).toBe(200)
      expect(removeRes.body.isAdded).toBe(false)
      const afterRemove = await Post.findById(post._id)
      expect(afterRemove!.userFavoritePost).not.toContain(userId)
    })
  })

  describe('POST /api/v1/posts', () => {
    it('should create a new post', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Cookie', authCookie)
        .send({
          title: 'New post',
          content: 'New content',
          brand: 'Yamaha',
          category: PostCategory.RACING,
          isNewMotoComment: true
        })

      expect(res.status).toBe(201)
      expect(res.body._id).toBeDefined()
    })

    it('should fail with non-existent brand', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Cookie', authCookie)
        .send({
          title: 'Bad post',
          content: 'Content',
          brand: 'NonExistent',
          category: PostCategory.RACING,
          isNewMotoComment: true
        })

      expect(res.status).toBe(400)
    })

    it('should fail with an invalid category', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Cookie', authCookie)
        .send({
          title: 'Bad category',
          content: 'Content',
          brand: 'Yamaha',
          category: 'not-a-real-category',
          isNewMotoComment: true
        })

      expect(res.status).toBe(400)
    })

    it('should link the created post to its motorcycle when motorcycleId is provided', async () => {
      const moto = await Motorcycle.create({
        name: 'MT-07',
        year: 2024,
        category: 'roadster',
        engine_size: 689,
        horsePower: 73,
        torque: 67,
        weight: 184,
        consumption: 4.5,
        price: 7699,
        brand: brandId
      })

      const res = await request(app)
        .post('/api/v1/posts')
        .set('Cookie', authCookie)
        .send({
          title: 'Model discussion',
          content: 'Content',
          brand: 'Yamaha',
          category: PostCategory.MODEL,
          isNewMotoComment: true,
          motorcycleId: moto._id.toString()
        })

      expect(res.status).toBe(201)
      const updatedMoto = await Motorcycle.findById(moto._id)
      expect(updatedMoto!.post!.toString()).toBe(res.body._id)
    })

    it('should author the post with the connected user when isNewMotoComment is false', async () => {
      const author = await User.create({
        firstname: 'Real',
        lastname: 'Author',
        pseudo: 'author',
        email: 'author@test.com',
        password: 'pass'
      })
      const authorToken = jwt.sign(
        { id: author._id.toString(), email: author.email },
        process.env.JWT_SECRET!
      )

      const res = await request(app)
        .post('/api/v1/posts')
        .set('Cookie', `accessToken=${authorToken}`)
        .send({
          title: 'Authored by me',
          content: 'Content',
          brand: 'Yamaha',
          category: PostCategory.OPINION,
          isNewMotoComment: false
        })

      expect(res.status).toBe(201)
      const created = await Post.findById(res.body._id)
      expect(created!.user.toString()).toBe(author._id.toString())
    })
  })

  describe('PUT /api/v1/posts', () => {
    it('should update an existing post and return 204', async () => {
      const post = await Post.create({
        title: 'Old title',
        content: 'Old content',
        user: userId,
        brand: brandId,
        category: PostCategory.RACING
      })

      const res = await request(app)
        .put(`/api/v1/posts?filter={"id":"${post._id}"}`)
        .set('Cookie', authCookie)
        .send({
          title: 'New title',
          content: 'New content',
          brand: 'Yamaha',
          category: PostCategory.RACING,
          user: userId
        })

      expect(res.status).toBe(204)
      expect(res.body).toEqual({})
      const updated = await Post.findById(post._id)
      expect(updated!.title).toBe('New title')
    })

    it('should return 404 for a non-existent post', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      const res = await request(app)
        .put(`/api/v1/posts?filter={"id":"${fakeId}"}`)
        .set('Cookie', authCookie)
        .send({
          title: 'Ghost',
          content: 'Ghost content',
          brand: 'Yamaha',
          category: PostCategory.RACING,
          user: userId
        })

      expect(res.status).toBe(404)
    })

    it('should return 403 when a non-owner non-admin edits a post', async () => {
      const post = await Post.create({
        title: 'Owned',
        content: 'Content',
        user: userId,
        brand: brandId,
        category: PostCategory.RACING
      })
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
        .put(`/api/v1/posts?filter={"id":"${post._id}"}`)
        .set('Cookie', `accessToken=${otherToken}`)
        .send({
          title: 'Hijacked',
          content: 'Nope',
          brand: 'Yamaha',
          category: PostCategory.RACING
        })

      expect(res.status).toBe(403)
    })

    it('should let an admin edit another user post (204)', async () => {
      const owner = await User.create({
        firstname: 'Owner',
        lastname: 'User',
        pseudo: 'owner',
        email: 'owner@test.com',
        password: 'pass',
        isAdmin: false
      })
      const post = await Post.create({
        title: 'Owned by someone',
        content: 'Content',
        user: owner._id,
        brand: brandId,
        category: PostCategory.RACING
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
        .put(`/api/v1/posts?filter={"id":"${post._id}"}`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({
          title: 'Edited by admin',
          content: 'New content',
          brand: 'Yamaha',
          category: PostCategory.OPINION
        })

      expect(res.status).toBe(204)
      const updated = await Post.findById(post._id)
      expect(updated!.title).toBe('Edited by admin')
      expect(updated!.category).toBe(PostCategory.OPINION)
    })

    it('should return 400 with an unknown brand', async () => {
      const post = await Post.create({
        title: 'Old',
        content: 'Content',
        user: userId,
        brand: brandId,
        category: PostCategory.RACING
      })

      const res = await request(app)
        .put(`/api/v1/posts?filter={"id":"${post._id}"}`)
        .set('Cookie', authCookie)
        .send({
          title: 'New',
          content: 'New content',
          brand: 'NonExistent',
          category: PostCategory.RACING
        })

      expect(res.status).toBe(400)
    })

    it('should return 400 with an invalid category', async () => {
      const post = await Post.create({
        title: 'Old',
        content: 'Content',
        user: userId,
        brand: brandId,
        category: PostCategory.RACING
      })

      const res = await request(app)
        .put(`/api/v1/posts?filter={"id":"${post._id}"}`)
        .set('Cookie', authCookie)
        .send({
          title: 'New',
          content: 'New content',
          brand: 'Yamaha',
          category: 'not-valid'
        })

      expect(res.status).toBe(400)
    })
  })

  describe('Auth required on mutations', () => {
    it('POST /posts returns 401 without a token', async () => {
      const res = await request(app).post('/api/v1/posts').send({
        title: 'X',
        content: 'Y',
        brand: 'Yamaha',
        category: PostCategory.RACING,
        isNewMotoComment: true
      })

      expect(res.status).toBe(401)
    })
  })
})
