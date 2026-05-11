import { model, Schema } from 'mongoose'
import { ICategory } from '../types/category'

const categorySchema = new Schema({
  name: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  }
})

export default model<ICategory>('Category', categorySchema)
