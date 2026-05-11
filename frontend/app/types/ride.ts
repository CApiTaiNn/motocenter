import type { Time, CalendarDate } from '@internationalized/date'
import type { IUserPublic } from './users'

export interface IRide {
  _id: string
  title: string
  description: string
  geom: any
  color: string
  duration: number
  distance: number
  start_town: string
  end_town: string
  ride_type: string
  image_link: string
  like: number
  liked_id: string[]
  user_id: string
  is_event: boolean
  date_event: string
  hour_event: string
  participating_user: IUserPublic[]
  createdAt: string
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

export interface IFilterObject {
  distance: number[]
  duration: number[]
  title: string
  type: string[]
  startTown: string[]
  endTown: string[]
  date: CalendarDate | null
  time: Time | null
}

export type MapItem = {
  label: string
  id: string
  icon: string
  url: string
  attribution: string
}

export interface RideResponse {
  rides: IRide[]
}

export interface ICommune {
  nom: string
  codesPostaux: string[]
}

export interface IValueCommuneSelect {
  label: string
  value: string
  postcode: string
}

export interface IValueForm {
  title: string
  duration: number
  distance: number
  description: string
  startTown: IValueCommuneSelect | undefined
  endTown: IValueCommuneSelect | undefined
  startAddress: string
  endAddress: string
  rideType: string
  picture: File | undefined
  isEvent: boolean
  dateEvent: any | undefined
  hourEvent: any | undefined
  geom: IGeoJSON | null
}

export enum RideType {
  MIXTE = 'Mixte',
  SINUEUX = 'Sinueux',
  GRANDES_ROUTES = 'Grandes routes',
  LIGNES_DROITES = 'Lignes droites',
  BORD_DE_MER = 'Bord de mer',
  VALLONER = 'Valloner',
  PLAINE = 'Plaine'
}
