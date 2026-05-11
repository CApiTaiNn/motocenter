import { IBrand } from './brand'
import { ICategory } from './category'
import { IUser } from './user'

export interface IPost {
  title: string
  content: string
  category: ICategory
  user: IUser
  brand: IBrand
  views: number
  image?: string
  userFavoritePost?: Array<string>
}
