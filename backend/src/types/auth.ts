// Shape of the authenticated principal carried on req.user. Mirrors the JWT
// payload signed in routes/auth.ts ({ id, email }). Kept in its own module so
// both the Express augmentation (express.d.ts) and the auth helpers share it.
export interface AuthUser {
  id: string
  email?: string
}
