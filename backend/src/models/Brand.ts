import type { IBrand, IBrandSnapshot } from '../types/brand'
import { Schema, model, type Types } from 'mongoose'
import { stripInternalFields } from '../utils/serialize'

const brandSchema = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    icon: {
      type: String,
      required: true
    }
  },
  { toJSON: stripInternalFields }
)

// Denormalized brand snapshot embedded on documents that display brand data
// (Post, Motorcycle) — see the data-modeling convention. `_id` is set to the
// source Brand's id (not auto-generated), so the origin stays traceable.
// Brands are read-only through the API, so snapshots cannot go stale via it.
export const brandSnapshotSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  }
})

// Build the embedded snapshot from a full Brand document.
export const toBrandSnapshot = (brand: {
  _id: Types.ObjectId
  name: string
  icon: string
}): IBrandSnapshot => ({
  _id: brand._id,
  name: brand.name,
  icon: brand.icon
})

export default model<IBrand>('Brand', brandSchema)
