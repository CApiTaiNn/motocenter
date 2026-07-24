import { Schema, Types, model } from 'mongoose'

// A revocable API key tied to a user. Only the SHA-256 hash of the key is
// stored — the raw key is shown once at creation and never persisted, so a DB
// leak can't be replayed. Authorization is not carried here: the key resolves
// to its `user`, and requireAdmin re-reads isAdmin from that user at request
// time (see utils/auth.ts).
export interface IApiKey {
  hash: string
  label?: string
  user: Types.ObjectId
  createdAt: Date
  lastUsedAt?: Date
}

const apiKeySchema = new Schema<IApiKey>({
  hash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  label: {
    type: String
  },
  user: {
    type: Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsedAt: {
    type: Date
  }
})

export default model<IApiKey>('ApiKey', apiKeySchema)
