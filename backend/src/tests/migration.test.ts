import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import type { Db } from 'mongodb'
import { embedBrands } from '../migrations/embedBrand'
import Message from '../models/Message'
import Post from '../models/Post'
import Motorcycle from '../models/Motorcycle'
import User from '../models/User'

const getDb = (): Db => {
  const db = mongoose.connection.db
  if (!db) throw new Error('No database connection')
  return db
}

describe('migrations/embedBrand embedBrands', () => {
  it('embeds the brand snapshot on legacy post and motorcycle docs', async () => {
    const db = getDb()

    // LEGACY data inserted via raw collections so the new schema (which
    // expects an embedded snapshot) does not coerce/reject the ObjectId ref.
    const brandId = new mongoose.Types.ObjectId()
    await db.collection('brands').insertOne({
      _id: brandId,
      name: 'Yamaha',
      icon: 'yamaha.svg'
    })
    const postId = new mongoose.Types.ObjectId()
    await db.collection('posts').insertOne({
      _id: postId,
      title: 'Legacy post',
      content: 'x',
      category: 'general',
      brand: brandId
    })
    const motoId = new mongoose.Types.ObjectId()
    await db.collection('motorcycles').insertOne({
      _id: motoId,
      name: 'MT-07',
      brand: brandId
    })

    const result = await embedBrands(db)

    expect(result).toEqual({ migrated: 2, skipped: 0 })

    const expectedSnapshot = {
      _id: brandId,
      name: 'Yamaha',
      icon: 'yamaha.svg'
    }
    const post = await db.collection('posts').findOne({ _id: postId })
    expect(post!.brand).toEqual(expectedSnapshot)
    const moto = await db.collection('motorcycles').findOne({ _id: motoId })
    expect(moto!.brand).toEqual(expectedSnapshot)
  })

  it('is idempotent: a second run migrates nothing and skips the snapshots', async () => {
    const db = getDb()

    const brandId = new mongoose.Types.ObjectId()
    await db.collection('brands').insertOne({
      _id: brandId,
      name: 'Honda',
      icon: 'honda.svg'
    })
    await db.collection('posts').insertOne({
      _id: new mongoose.Types.ObjectId(),
      title: 'Legacy post',
      content: 'x',
      category: 'general',
      brand: brandId
    })
    await db.collection('motorcycles').insertOne({
      _id: new mongoose.Types.ObjectId(),
      name: 'CB500',
      brand: brandId
    })

    const first = await embedBrands(db)
    expect(first).toEqual({ migrated: 2, skipped: 0 })

    const second = await embedBrands(db)
    expect(second).toEqual({ migrated: 0, skipped: 2 })
  })

  it('skips a doc pointing at a missing brand and leaves it unchanged', async () => {
    const db = getDb()

    const missingBrandId = new mongoose.Types.ObjectId()
    const postId = new mongoose.Types.ObjectId()
    await db.collection('posts').insertOne({
      _id: postId,
      title: 'Orphan post',
      content: 'x',
      category: 'general',
      brand: missingBrandId
    })

    const result = await embedBrands(db)

    expect(result).toEqual({ migrated: 0, skipped: 1 })

    const post = await db.collection('posts').findOne({ _id: postId })
    // brand is still the raw ObjectId reference, untouched.
    expect(post!.brand).toBeInstanceOf(mongoose.Types.ObjectId)
    expect(post!.brand.toString()).toBe(missingBrandId.toString())
  })
})

describe('model index declarations', () => {
  it('Message declares the (reference, referenceModel) compound index', () => {
    const indexes = Message.schema.indexes().map(([fields]) => fields)
    expect(indexes).toContainEqual({ reference: 1, referenceModel: 1 })
  })

  it('Post declares the createdAt and brand._id indexes', () => {
    const indexes = Post.schema.indexes().map(([fields]) => fields)
    expect(indexes).toContainEqual({ createdAt: -1 })
    expect(indexes).toContainEqual({ 'brand._id': 1 })
  })

  it('Motorcycle declares the brand._id index', () => {
    const indexes = Motorcycle.schema.indexes().map(([fields]) => fields)
    expect(indexes).toContainEqual({ 'brand._id': 1 })
  })

  it('User declares the pseudo index', () => {
    const indexes = User.schema.indexes().map(([fields]) => fields)
    expect(indexes).toContainEqual({ pseudo: 1 })
  })
})
