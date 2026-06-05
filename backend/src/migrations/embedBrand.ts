/**
 * One-shot migration: convert Post.brand and Motorcycle.brand from a Brand
 * ObjectId reference to an embedded snapshot { _id, name, icon }.
 *
 * Idempotent: documents whose brand is already an object are skipped, so
 * re-runs are safe. Docs pointing at a missing brand are warned and skipped.
 *
 * Run once with: npx ts-node src/migrations/embedBrand.ts
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import type { Db, ObjectId } from 'mongodb'

interface BrandDoc {
  _id: ObjectId
  name: string
  icon: string
}

export const embedBrands = async (db: Db) => {
  const brands = (await db
    .collection('brands')
    .find()
    .toArray()) as unknown as BrandDoc[]
  const brandById = new Map(
    brands.map((brand) => [
      brand._id.toString(),
      { _id: brand._id, name: brand.name, icon: brand.icon }
    ])
  )

  let migrated = 0
  let skipped = 0

  for (const collectionName of ['posts', 'motorcycles']) {
    const collection = db.collection(collectionName)
    const cursor = collection.find({})
    for await (const doc of cursor) {
      // Already an embedded snapshot (idempotent re-run) -> skip
      if (
        doc.brand &&
        typeof doc.brand === 'object' &&
        'name' in (doc.brand as object)
      ) {
        skipped++
        continue
      }
      const snapshot = doc.brand
        ? brandById.get(doc.brand.toString())
        : undefined
      if (!snapshot) {
        console.warn(
          `${collectionName} ${doc._id}: unknown brand ${doc.brand}, skipped`
        )
        skipped++
        continue
      }
      await collection.updateOne(
        { _id: doc._id },
        { $set: { brand: snapshot } }
      )
      migrated++
    }
  }

  return { migrated, skipped }
}

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string)
  const db = mongoose.connection.db
  if (!db) throw new Error('No database connection')

  const { migrated, skipped } = await embedBrands(db)

  console.log(`Migration done: ${migrated} migrated, ${skipped} skipped`)
  await mongoose.disconnect()
  process.exit(0)
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
}
