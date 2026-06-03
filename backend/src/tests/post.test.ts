import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app'
import Post from '../models/Post'
import User from '../models/User'
import Brand from '../models/Brand'
import Message from '../models/Message'
import { PostCategory } from '../constants/PostCategory'

describe('Post Routes - /api/v1/posts', () => {
  let userId: string
  let brandId: string

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

  describe('POST /api/v1/posts', () => {
    it('should create a new post', async () => {
      const res = await request(app).post('/api/v1/posts').send({
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
      const res = await request(app).post('/api/v1/posts').send({
        title: 'Bad post',
        content: 'Content',
        brand: 'NonExistent',
        category: PostCategory.RACING,
        isNewMotoComment: true
      })

      expect(res.status).toBe(500)
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
        .send({
          title: 'Ghost',
          content: 'Ghost content',
          brand: 'Yamaha',
          category: PostCategory.RACING,
          user: userId
        })

      expect(res.status).toBe(404)
    })
  })
})
