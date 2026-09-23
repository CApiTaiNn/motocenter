// Shape of the authenticated principal carried on req.user. Built from the JWT
// signed in utils/session.ts; the `tv` (tokenVersion) claim is checked during
// verification but not carried here. Kept in its own module so both the Express
// augmentation (express.d.ts) and the auth helpers share it.
export interface AuthUser {
  id: string
  email?: string
}
