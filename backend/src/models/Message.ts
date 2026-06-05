import type { IMessage } from '../types/messages'
import { Schema, Types, model } from 'mongoose'

const messageSchema = new Schema(
  {
    content: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    like: {
      type: Number,
      default: 0
    },
    dislike: {
      type: Number,
      default: 0
    },
    isRep: {
      type: Boolean
    },
    reference: {
      type: Types.ObjectId,
      refPath: 'referenceModel'
    },
    referenceModel: {
      type: String,
      enum: ['Post', 'Message']
    },
    user: {
      type: Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    usersLikeId: {
      type: [String],
      default: []
    },
    usersDislikeId: {
      type: [String],
      default: []
    }
  },
  {
    validateBeforeSave: true
  }
)

// The responses lookups always filter on both fields together.
messageSchema.index({ reference: 1, referenceModel: 1 })

export default model<IMessage>('Message', messageSchema)
