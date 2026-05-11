import { model, Schema, Types } from 'mongoose'
import type { IPost } from '../types/post'

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
    type: Types.ObjectId,
    ref: 'Category',
    required: true
  },
  user: {
    type: Types.ObjectId,
    ref: 'User',
    required: true
  },
  brand: {
    type: Types.ObjectId,
    ref: 'Brand',
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
})

export default model<IPost>('Post', postSchema)
