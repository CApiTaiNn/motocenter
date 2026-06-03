import type { IMotorcycle } from '../types/motorcycle'
import { Schema, Types, model } from 'mongoose'
import { MotorcycleCategory } from '../constants/MotorcycleCategory'

// Re-exported for back-compat: existing imports of MotorcycleCategory from
// this model keep working. The enum now lives in constants/MotorcycleCategory.ts.
export { MotorcycleCategory }

const motorcycleSchema = new Schema({
  brand: {
    type: Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: Object.values(MotorcycleCategory),
    required: true
  },
  engine_size: {
    type: Number,
    required: true
  },
  horsePower: {
    type: Number,
    required: true
  },
  torque: {
    type: Number,
    required: true
  },
  weight: {
    type: Number,
    required: true
  },
  consumption: {
    type: Number,
    required: true
  },
  soundLink: {
    type: String
  },
  imageUrl: {
    type: String
  },
  isAvailableA2: {
    type: Boolean
  },
  is_public: {
    type: Boolean
  },
  acceleration: {
    time_0_100: { type: Number },
    time_100_200: { type: Number },
    time_200_300: { type: Number }
  },
  speedMax: {
    type: Number
  },
  numberOfComparison: {
    type: Number,
    default: 0
  },
  withAllField: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  post: {
    type: Types.ObjectId,
    ref: 'Post'
  }
})

export default model<IMotorcycle>('Motorcycle', motorcycleSchema)
