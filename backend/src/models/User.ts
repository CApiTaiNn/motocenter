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
      required: true
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

export default model<IUser>('User', userSchema)
