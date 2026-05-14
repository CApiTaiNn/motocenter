import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { beforeAll, afterAll, afterEach } from 'vitest'
import 'dotenv/config'

let mongoServer: MongoMemoryServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()
  process.env.JWT_SECRET = 'test-secret'
  process.env.PASSWORD_PEPPER = 'your_password_pepper'

  process.env.ARGON2_MEMORY_COST = '4096'
  process.env.ARGON2_TIME_COST = '3'
  process.env.ARGON2_PARALLELISM = '1'
  await mongoose.connect(uri)
})

afterEach(async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})
