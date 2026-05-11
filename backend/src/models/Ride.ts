import type { IRide } from '../types/ride'
import { model, Schema, Types } from 'mongoose'

const rideSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  color: {
    type: String,
    required: true
  },
  geom: {
    type: {
      type: String,
      enum: ['FeatureCollection'],
      required: true,
      default: 'FeatureCollection'
    },
    features: [
      {
        type: {
          type: String,
          enum: ['Feature'],
          required: true
        },
        properties: {
          type: Schema.Types.Mixed,
          default: {}
        },
        geometry: {
          type: {
            type: String,
            enum: ['LineString', 'Point', 'Polygon'],
            required: true
          },
          coordinates: {
            type: Schema.Types.Mixed,
            required: true
          }
        }
      }
    ]
  },
  duration: {
    type: Number,
    required: true
  },
  distance: {
    type: Number,
    required: true
  },
  start_town: {
    type: String,
    required: true
  },
  end_town: {
    type: String,
    required: true
  },
  ride_type: {
    type: String,
    required: true
  },
  like: {
    type: Number,
    default: 0
  },
  liked_id: {
    type: [String],
    default: []
  },
  image_link: {
    type: String,
    required: true
  },
  user_id: {
    type: String,
    required: true
  },
  is_event: {
    type: Boolean,
    default: false
  },
  date_event: {
    type: String,
    validate: {
      validator: function (v: string) {
        return this.is_event ? v && v.length > 0 : true
      },
      message: "La date de l'événement est requise lorsque c'est un événement."
    }
  },
  hour_event: {
    type: String,
    validate: {
      validator: function (v: string) {
        return this.is_event ? v && v.length > 0 : true
      },
      message: "L'heure de l'événement est requise lorsque c'est un événement."
    }
  },
  participating_user: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

export default model<IRide>('Ride', rideSchema)
