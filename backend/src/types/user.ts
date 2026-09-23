export interface IUser {
  firstname: string
  lastname: string
  pseudo: string
  email: string
  isAdmin: boolean
  password?: string
  provider?: 'local' | 'google'
  providerId?: string
  ridingStartYear?: number
  createdAt: Date
  userType: 'beginner' | 'confirmed' | 'expert' | 'other'
  idMoto: string
  image: string
  emailVerified?: boolean
  // Bumped to revoke every session for this user (logout, password change or
  // reset). Each JWT carries the value it was signed with; the auth middleware
  // rejects a token whose value no longer matches. See utils/auth.ts.
  tokenVersion?: number
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
