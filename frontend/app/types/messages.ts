import type { IUserPublic } from './users'

export interface IMessage {
  _id: string
  content: string
  description: string | null
  like: number
  dislike: number
  isRep: boolean
  isPublicationResponse: boolean
  parentId: string | null
  user: IUserPublic
  createdAt: string
  // Per-viewer reaction state (the raw reactor id-arrays are no longer exposed).
  likedByMe?: boolean
  dislikedByMe?: boolean
}

export interface IPublicationResponse extends IMessage {
  isRep: boolean
}

export interface IMotorcycleComment extends IMessage {
  isMotorcycleComment: boolean
}
