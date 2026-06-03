import { IBrand } from './brand'
import { PostCategory } from '../constants/PostCategory'
import { IUser } from './user'

export interface IPost {
  title: string
  content: string
  category: PostCategory
  user: IUser
  brand: IBrand
  views: number
  image?: string
  userFavoritePost?: Array<string>
}
