import { Types } from 'mongoose'
import { IUser } from './user'

export interface IMessage {
  content: string
  description: string | null
  like: number
  dislike: number
  isRep: boolean
  reference?: Types.ObjectId
  referenceModel?: 'Post' | 'Message'
  user: IUser
  createAt: string
  usersLikeId: Array<string>
  usersDislikeId: Array<string>
}

export interface IPublicationResponse extends IMessage {
  isRep: boolean
}

export interface IMotorcycleComment extends IMessage {
  isMotorcycleComment: boolean
}
