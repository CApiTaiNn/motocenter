export interface IUser {
  firstname: string
  lastname: string
  pseudo: string
  email: string
  isAdmin: boolean
  password: string
  ridingStartYear?: number
  createdAt: Date
  userType: 'beginner' | 'confirmed' | 'expert' | 'other'
  idMoto: string
  image: string
  emailVerified?: boolean
  emailVerificationToken?: string
  emailVerificationExpires?: Date
  passwordResetToken?: string
  passwordResetExpires?: Date
}

export interface IUserPublic {
  _id: string
  pseudo: string
  image: string
}
