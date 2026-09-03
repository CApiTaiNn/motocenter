import { model, Schema, Types } from 'mongoose'
import type { IPost } from '../types/post'
import { PostCategory } from '../constants/PostCategory'
import { brandSnapshotSchema } from './Brand'
import { stripInternalFields } from '../utils/serialize'

const postSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: Object.values(PostCategory),
    required: true
  },
  user: {
    type: Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Embedded snapshot (not a ref): brand display data is stable, so it's
  // denormalized for read speed. Resolved server-side on write.
  brand: {
    type: brandSnapshotSchema,
    required: true
  },
  views: {
    type: Number,
    default: 0
  },
  image: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isNewMotoComment: {
    type: Boolean,
    required: false
  },
  userFavoritePost: {
    type: [String],
    default: []
  }
}, { toJSON: stripInternalFields })

// createdAt: default list sort + the /count month-range queries.
postSchema.index({ createdAt: -1 })
// brand._id: forum filtering by brand.
postSchema.index({ 'brand._id': 1 })

export default model<IPost>('Post', postSchema)
