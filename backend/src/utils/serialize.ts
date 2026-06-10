// Shared Mongoose toJSON transform: strip technical/sensitive fields from any
// document that gets serialized via res.json(). __v is an internal version key
// clients never need; password is defence-in-depth (it is also select:false).
// Applied on every schema so mutation responses disclose the minimum.
export const stripInternalFields = {
  transform(_doc: any, ret: any) {
    delete ret.__v
    delete ret.password
    return ret
  }
}
