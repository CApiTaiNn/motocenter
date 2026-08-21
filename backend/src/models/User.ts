import type { IUser } from '../types/user'
import { Schema, model } from 'mongoose'
import { stripInternalFields } from '../utils/serialize'

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
    },
    // Not select:false — the frontend shows the verified state to the user.
    emailVerified: {
      type: Boolean,
      default: false
    },
    // One-time tokens: stored hashed, never returned to any client.
    emailVerificationToken: {
      type: String,
      select: false
    },
    emailVerificationExpires: {
      type: Date,
      select: false
    },
    passwordResetToken: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      select: false
    }
  },
  { timestamps: true, toJSON: stripInternalFields }
)

// createdAt: signup counts + monthly stats range queries.
userSchema.index({ createdAt: -1 })
// pseudo is the public display identity: unique at the DB level so a race
// between two check-then-write requests can't create duplicates. Routes still
// pre-check to return a friendly 409 before hitting the index.
userSchema.index({ pseudo: 1 }, { unique: true })

export default model<IUser>('User', userSchema)
