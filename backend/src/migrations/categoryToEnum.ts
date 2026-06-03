/**
 * One-shot migration: convert Post.category from a Category ObjectId reference
 * to a PostCategory enum key (string).
 *
 * Reads the legacy `categories` collection directly (the Category model no
 * longer exists), builds an _id -> enum-key map by matching the legacy French
 * name, then rewrites every post's `category` field.
 *
 * Run once with: npx ts-node src/migrations/categoryToEnum.ts
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { PostCategory } from '../constants/PostCategory'

// Legacy Category name -> new enum key
const NAME_TO_KEY: Record<string, PostCategory> = {
  Réparation: PostCategory.REPAIR,
  Entretien: PostCategory.MAINTENANCE,
  Course: PostCategory.RACING,
  Opinion: PostCategory.OPINION,
  Modèle: PostCategory.MODEL
}

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string)
  const db = mongoose.connection.db
  if (!db) throw new Error('No database connection')

  const categories = await db.collection('categories').find().toArray()
  const idToKey = new Map<string, PostCategory>()
  for (const cat of categories) {
    const key = NAME_TO_KEY[cat.name as string]
    if (key) idToKey.set(cat._id.toString(), key)
    else console.warn(`No enum mapping for legacy category "${cat.name}"`)
  }

  const posts = mongoose.connection.collection('posts')
  let migrated = 0
  let skipped = 0

  const cursor = posts.find({})
  for await (const post of cursor) {
    // Already a string key (idempotent re-run) -> skip
    if (typeof post.category === 'string') {
      skipped++
      continue
    }
    const key = post.category ? idToKey.get(post.category.toString()) : undefined
    if (!key) {
      console.warn(`Post ${post._id}: unmapped category ${post.category}, skipped`)
      skipped++
      continue
    }
    await posts.updateOne({ _id: post._id }, { $set: { category: key } })
    migrated++
  }

  console.log(`Migration done: ${migrated} migrated, ${skipped} skipped`)
  await mongoose.disconnect()
  process.exit(0)
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
