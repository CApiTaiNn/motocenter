import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prepareQuery } from '../utils/find'
import { HttpError } from '../utils/errors'
import { argon2PasswordHasher } from '../utils/hash'
import { attachUser, attachUsers } from '../utils/attach'
import { validateEnv } from '../config/env'
import User from '../models/User'

describe('utils/supabase getSupabase', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('returns a client when env vars are present and caches it', async () => {
    vi.resetModules()
    process.env.SUPABASE_PROJECT_URL = 'http://localhost:54321'
    process.env.SUPABASE_KEY = 'test-supabase-key'

    const { getSupabase } = await import('../utils/supabase')
    const first = getSupabase()
    const second = getSupabase()

    expect(first).toBeTruthy()
    expect(first).toBe(second)
  })

  it('throws when env vars are missing', async () => {
    const saved = { ...process.env }
    try {
      vi.resetModules()
      delete process.env.SUPABASE_PROJECT_URL
      delete process.env.SUPABASE_KEY

      const { getSupabase } = await import('../utils/supabase')
      expect(() => getSupabase()).toThrow(/Supabase is not configured/)
    } finally {
      process.env = saved
    }
  })
})

describe('utils/find prepareQuery', () => {
  it('returns empty projection for project=all', () => {
    const { project } = prepareQuery({ project: 'all' })
    expect(project).toEqual({})
  })

  it('trims a comma-separated project list', () => {
    const { project } = prepareQuery({ project: 'firstname, lastname ' })
    expect(project).toEqual({ firstname: 1, lastname: 1 })
  })

  it('uses the default projection when none is given', () => {
    const { project } = prepareQuery({})
    expect(project).toEqual({ _id: 1 })
  })

  it('parses a sort parameter', () => {
    const { sort } = prepareQuery({ sort: '{"createdAt":1}' })
    expect(sort).toEqual({ createdAt: 1 })
  })

  it('uses the default sort when none is given', () => {
    const { sort } = prepareQuery({})
    expect(sort).toEqual({ createdAt: -1 })
  })

  it('parses a valid filter', () => {
    const { filter } = prepareQuery({ filter: '{"content":"hi"}' })
    expect(filter).toEqual({ content: 'hi' })
  })

  it('rejects a filter using a forbidden $where operator (400)', () => {
    expect(() => prepareQuery({ filter: '{"$where":"1"}' })).toThrow(HttpError)
    try {
      prepareQuery({ filter: '{"$where":"1"}' })
    } catch (e) {
      expect((e as HttpError).status).toBe(400)
    }
  })

  it('rejects an invalid JSON filter (400)', () => {
    try {
      prepareQuery({ filter: 'not json' })
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(HttpError)
      expect((e as HttpError).status).toBe(400)
      expect((e as HttpError).message).toBe('Invalid filter parameter')
    }
  })

  it('rejects an invalid JSON sort (400)', () => {
    try {
      prepareQuery({ sort: '{bad json' })
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(HttpError)
      expect((e as HttpError).status).toBe(400)
      expect((e as HttpError).message).toBe('Invalid sort parameter')
    }
  })

  it('caps the limit at the hard maximum', () => {
    const { limit } = prepareQuery({ limit: '999999' })
    expect(limit).toBe(10000)
  })

  it('rejects a limit below 1 (400)', () => {
    try {
      prepareQuery({ limit: '0' })
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as HttpError).status).toBe(400)
    }
  })

  it('rejects a non-numeric limit (400)', () => {
    try {
      prepareQuery({ limit: 'abc' })
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as HttpError).status).toBe(400)
    }
  })
})

describe('utils/hash argon2PasswordHasher', () => {
  it('hashes then verifies the correct password', async () => {
    const hash = await argon2PasswordHasher.hash('correct horse')
    expect(hash).toMatch(/^\$argon2id\$/)
    await expect(
      argon2PasswordHasher.verify('correct horse', hash)
    ).resolves.toBe(true)
  })

  it('returns false for a wrong password', async () => {
    const hash = await argon2PasswordHasher.hash('correct horse')
    await expect(
      argon2PasswordHasher.verify('wrong password', hash)
    ).resolves.toBe(false)
  })

  it('rejects when the stored hash is malformed', async () => {
    await expect(
      argon2PasswordHasher.verify('whatever', 'not-a-valid-hash')
    ).rejects.toThrow()
  })
})

describe('utils/attach', () => {
  let userId: string

  beforeEach(async () => {
    const user = await User.create({
      firstname: 'Jane',
      lastname: 'Doe',
      pseudo: 'janed',
      email: 'jane@test.com',
      password: 'pass',
      image: 'jane.png'
    })
    userId = user._id.toString()
  })

  it('attachUser resolves a single user with only public fields', async () => {
    const docs: Array<Record<string, any>> = [{ user: userId }]
    await attachUser(docs, 'user')

    expect(docs[0].user.pseudo).toBe('janed')
    expect(docs[0].user.image).toBe('jane.png')
    // Private fields must not leak through the projection.
    expect(docs[0].user.email).toBeUndefined()
    expect(docs[0].user.firstname).toBeUndefined()
  })

  it('attachUser sets null when the referenced user is missing', async () => {
    const missingId = '507f1f77bcf86cd799439011'
    const docs: Array<Record<string, any>> = [{ user: missingId }]
    await attachUser(docs, 'user')

    expect(docs[0].user).toBeNull()
  })

  it('attachUser leaves docs untouched when no ids are present', async () => {
    const docs: Array<Record<string, any>> = [{ user: null }, {}]
    const result = await attachUser(docs, 'user')

    expect(result[0].user).toBeNull()
    expect(result[1].user).toBeUndefined()
  })

  it('attachUser batches multiple docs sharing references', async () => {
    const other = await User.create({
      firstname: 'Bob',
      lastname: 'Roy',
      pseudo: 'bobr',
      email: 'bob@test.com',
      password: 'pass'
    })
    const docs: Array<Record<string, any>> = [
      { user: userId },
      { user: other._id.toString() },
      { user: userId }
    ]
    await attachUser(docs, 'user')

    expect(docs[0].user.pseudo).toBe('janed')
    expect(docs[1].user.pseudo).toBe('bobr')
    expect(docs[2].user.pseudo).toBe('janed')
  })

  it('attachUsers resolves an array field and drops missing ids', async () => {
    const missingId = '507f1f77bcf86cd799439011'
    const docs: Array<Record<string, any>> = [
      { usersLikeId: [userId, missingId] }
    ]
    await attachUsers(docs, 'usersLikeId')

    expect(docs[0].usersLikeId).toHaveLength(1)
    expect(docs[0].usersLikeId[0].pseudo).toBe('janed')
  })

  it('attachUsers leaves docs untouched when arrays are empty', async () => {
    const docs: Array<Record<string, any>> = [{ usersLikeId: [] }]
    const result = await attachUsers(docs, 'usersLikeId')

    expect(result[0].usersLikeId).toEqual([])
  })
})

describe('config/env validateEnv', () => {
  const saved = { ...process.env }

  afterEach(() => {
    process.env = { ...saved }
    vi.restoreAllMocks()
  })

  it('does not exit when all required vars are present', () => {
    process.env.MONGO_URI = 'mongodb://localhost/x'
    process.env.JWT_SECRET = 'secret'
    process.env.PASSWORD_PEPPER = 'pepper'

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    validateEnv()

    expect(exitSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('exits with code 1 when a required var is missing', () => {
    process.env.MONGO_URI = 'mongodb://localhost/x'
    process.env.JWT_SECRET = 'secret'
    delete process.env.PASSWORD_PEPPER

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    validateEnv()

    expect(errorSpy).toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
