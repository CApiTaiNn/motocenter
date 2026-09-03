export interface IRide {
  title: string
  description: string
  // Creator's user id (schema stores it as a plain string, not an ObjectId)
  user_id: string
  color: string
  geom: IGeoJSON
  duration: number
  distance: number
  start_town: string
  end_town: string
  ride_type: string
  like: number
  liked_id: string[]
  image_link: string
  is_event: boolean
  date_event: string
  hour_event: string
  participating_user: string[]
  create_date: string
}

export interface IGeoJSON {
  type: string
  features: {
    type: string
    geometry: {
      type: string
      coordinates: number[][]
    }
    properties: any
  }[]
}

export enum RideColor {
  BLUE = '#0072B2',
  ORANGE = '#E69F00',
  PINK = '#CC79A7',
  YELLOW = '#F0E442',
  GREEN = '#7EDE6B'
}

export interface ICreateRideBody {
  title: string
  description?: string
  duration: number
  distance: number
  startTown: { value: string }
  endTown: { value: string }
  rideType: string
  imageLink: string
  userId: string
  isEvent: boolean
  dateEvent: string
  hourEvent: string
  geom: IGeoJSON
}
