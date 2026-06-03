import { model, Schema, Types } from 'mongoose'
import type { IPost } from '../types/post'
import { PostCategory } from '../constants/PostCategory'

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
