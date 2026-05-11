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
  usersLikeId: Array<string>
  usersDislikeId: Array<string>
}

export interface IPublicationResponse extends IMessage {
  isRep: boolean
}

export interface IMotorcycleComment extends IMessage {
  isMotorcycleComment: boolean
}
