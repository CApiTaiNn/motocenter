import { IBrandSnapshot } from './brand'

import { IAcceleration } from './accelerations'
import { MotorcycleCategory } from '../models/Motorcycle'

export interface IMotorcycle {
  brand: IBrandSnapshot
  name: string
  year: number
  category: MotorcycleCategory
  engine_size: number
  horsePower: number
  torque: number
  weight: number
  consumption: number
  soundLink?: string
  imageUrl?: string
  isAvailableA2?: boolean
  is_public?: boolean
  acceleration?: IAcceleration
  speedMax?: number
  numberOfComparison?: number
  withAllField?: boolean
  price: number
  createdAt: string
  post?: string
}
