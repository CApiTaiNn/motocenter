import type { IBrand } from './brand'
import type { PostCategory } from '~/utils/postCategory'
import type { IMessage } from './messages'
import type { IUserPublic } from './users'

export interface IPost {
  _id: string
  title: string
  content: string
  category: PostCategory
  user: IUserPublic
  brand: IBrand
  createdAt: string
  views: number
  responses: IMessage[]
  image?: string
  // Per-viewer favorite state (the raw favoriting-users array is not exposed).
  favoritedByMe?: boolean
}
