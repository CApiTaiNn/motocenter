import type { IUser } from '../types/user'
import { Schema, model } from 'mongoose'

const userSchema = new Schema(
  {
    firstname: {
      type: String,
      required: true
    },
    lastname: {
      type: String,
      required: true
    },
    pseudo: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    ridingStartYear: {
      type: Number
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    userType: {
      type: String,
      enum: ['beginner', 'confirmed', 'expert', 'other'],
      default: 'beginner'
    },
    idMoto: {
      type: String
    },
    image: {
      type: String
    }
  },
  { timestamps: true }
)

// createdAt: signup counts + monthly stats range queries.
userSchema.index({ createdAt: -1 })
// pseudo: the uniqueness lookup on every profile update. Not `unique` at the
// DB level — existing data may hold duplicates; routes enforce it manually.
userSchema.index({ pseudo: 1 })

export default model<IUser>('User', userSchema)
