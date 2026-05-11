export interface IUser {
  _id: string
  firstname: string
  lastname: string
  pseudo: string
  email: string
  isAdmin: boolean
  password: string
  ridingStartYear?: number
  createdAt?: Date
  userType?: 'beginner' | 'confirmed' | 'expert' | 'other'
  image: string
  idMoto: string
}

export interface IUserPublic {
  _id: string
  pseudo: string
  image: string
}
