import type { Types } from 'mongoose'

export interface IBrand {
  name: string
  createAt: string
  icon: string
}

// Denormalized brand data embedded on Post/Motorcycle documents.
export interface IBrandSnapshot {
  _id: Types.ObjectId
  name: string
  icon: string
}
