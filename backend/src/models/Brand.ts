import type { IBrand } from '../types/brand'
import { Schema, model } from 'mongoose'

const brandSchema = new Schema({
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
})

export default model<IBrand>('Brand', brandSchema)
