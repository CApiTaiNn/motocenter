import type { IBrand } from './brand'
import type { ICategory } from './category'
import type { IMessage } from './messages'
import type { IUserPublic } from './users'

export interface IPost {
  _id: string
  title: string
  content: string
  category: ICategory
  user: IUserPublic
  brand: IBrand
  createdAt: string
  views: string
  responses: IMessage[]
  image?: string
  userFavoritePost?: Array<string>
}
