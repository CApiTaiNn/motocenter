import type { Model, Types } from 'mongoose'

type Id = string | Types.ObjectId

function idKey(v: Id): string {
  return typeof v === 'string' ? v : v.toString()
}

export async function attachOne<T extends Record<string, any>>(
  docs: T[],
  field: keyof T,
  model: Model<any>,
  select: string
): Promise<T[]> {
  const ids = new Set<string>()
  for (const doc of docs) {
    const v = doc[field] as Id | undefined | null
    if (v) ids.add(idKey(v))
  }
  if (ids.size === 0) return docs

  const refs = await model
    .find({ _id: { $in: Array.from(ids) } })
    .select(select)
    .lean()

  const byId = new Map<string, any>()
  for (const r of refs) byId.set(idKey(r._id), r)

  for (const doc of docs) {
    const v = doc[field] as Id | undefined | null
    if (v) (doc as any)[field] = byId.get(idKey(v)) ?? null
  }
  return docs
}

export async function attachMany<T extends Record<string, any>>(
  docs: T[],
  field: keyof T,
  model: Model<any>,
  select: string
): Promise<T[]> {
  const ids = new Set<string>()
  for (const doc of docs) {
    const arr = doc[field] as Id[] | undefined | null
    if (Array.isArray(arr)) for (const v of arr) ids.add(idKey(v))
  }
  if (ids.size === 0) return docs

  const refs = await model
    .find({ _id: { $in: Array.from(ids) } })
    .select(select)
    .lean()

  const byId = new Map<string, any>()
  for (const r of refs) byId.set(idKey(r._id), r)

  for (const doc of docs) {
    const arr = doc[field] as Id[] | undefined | null
    if (Array.isArray(arr)) {
      ;(doc as any)[field] = arr.map((v) => byId.get(idKey(v))).filter(Boolean)
    }
  }
  return docs
}

export const USER_PUBLIC_FIELDS = '_id pseudo image'

import User from '../models/User'

export async function attachUser<T extends Record<string, any>>(
  docs: T[],
  field: keyof T
): Promise<T[]> {
  return attachOne(docs, field, User, USER_PUBLIC_FIELDS)
}

export async function attachUsers<T extends Record<string, any>>(
  docs: T[],
  field: keyof T
): Promise<T[]> {
  return attachMany(docs, field, User, USER_PUBLIC_FIELDS)
}
