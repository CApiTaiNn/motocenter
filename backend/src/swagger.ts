import swaggerJsdoc from 'swagger-jsdoc'
import { MotorcycleCategory } from './constants/MotorcycleCategory'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API MotoCenter',
      version: '1.0.0',
      description:
        'Documentation de notre API express utilisée pour motocenter',
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
      },
    ],
    components: {
      schemas: {
        // --- MODÈLE MESSAGE ---
        Message: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            content: { type: 'string' },
            user: { type: 'object', description: 'Utilisateur associé' },
            reference: { type: 'string' },
            referenceModel: { type: 'string' },
            usersLikeId: { type: 'array', items: { type: 'string' } },
            usersDislikeId: { type: 'array', items: { type: 'string' } },
            like: { type: 'integer' },
            dislike: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // --- MODÈLE USER ---
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            firstname: { type: 'string' },
            lastname: { type: 'string' },
            pseudo: { type: 'string' },
            email: { type: 'string', format: 'email' },
            isAdmin: { type: 'boolean' },
            ridingStartYear: { type: 'integer' },
            userType: {
              type: 'string',
              enum: ['beginner', 'confirmed', 'expert', 'other'],
            },
            idMoto: { type: 'string' },
            image: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // --- MODÈLE BRAND ---
        Brand: {
          type: 'object',
          required: ['name', 'icon'],
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            icon: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // --- SNAPSHOT BRAND (embarqué sur Post/Motorcycle) ---
        BrandSnapshot: {
          type: 'object',
          required: ['_id', 'name', 'icon'],
          properties: {
            _id: { type: 'string', description: 'ID de la marque source' },
            name: { type: 'string' },
            icon: { type: 'string' },
          },
        },
        // --- MODÈLE MOTORCYCLE ---
        Motorcycle: {
          type: 'object',
          required: ['brand', 'name', 'year', 'category', 'price'],
          properties: {
            _id: { type: 'string' },
            brand: { $ref: '#/components/schemas/BrandSnapshot' },
            name: { type: 'string' },
            year: { type: 'integer' },
            category: {
              type: 'string',
              enum: Object.values(MotorcycleCategory),
            },
            engine_size: { type: 'number' },
            horsePower: { type: 'number' },
            torque: { type: 'number' },
            weight: { type: 'number' },
            consumption: { type: 'number' },
            soundLink: { type: 'string' },
            imageUrl: { type: 'string' },
            isAvailableA2: { type: 'boolean' },
            is_public: { type: 'boolean' },
            acceleration: {
              type: 'object',
              properties: {
                time_0_100: { type: 'number' },
                time_100_200: { type: 'number' },
                time_200_300: { type: 'number' },
              },
            },
            speedMax: { type: 'number' },
            numberOfComparison: { type: 'integer' },
            price: { type: 'number' },
            post: { type: 'string', description: 'ID du post associé' },
          },
        },
        // --- MODÈLE POST ---
        Post: {
          type: 'object',
          required: ['title', 'content', 'category', 'user', 'brand'],
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            category: { type: 'string', description: 'ID de la catégorie' },
            user: { type: 'string', description: 'ID de l’utilisateur' },
            brand: { $ref: '#/components/schemas/BrandSnapshot' },
            views: { type: 'integer' },
            image: { type: 'string' },
            isNewMotoComment: { type: 'boolean' },
            userFavoritePost: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // --- MODÈLE RIDE ---
        Ride: {
          type: 'object',
          required: [
            'title',
            'color',
            'geom',
            'duration',
            'distance',
            'start_town',
            'end_town',
            'ride_type',
            'image_link',
            'user_id',
          ],
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            color: { type: 'string' },
            geom: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['FeatureCollection'] },
                features: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['Feature'] },
                      properties: { type: 'object' },
                      geometry: {
                        type: 'object',
                        properties: {
                          type: {
                            type: 'string',
                            enum: ['LineString', 'Point', 'Polygon'],
                          },
                          coordinates: {
                            type: 'array',
                            items: { type: 'object' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            duration: { type: 'number' },
            distance: { type: 'number' },
            start_town: { type: 'string' },
            end_town: { type: 'string' },
            ride_type: { type: 'string' },
            like: { type: 'integer' },
            liked_id: { type: 'array', items: { type: 'string' } },
            image_link: { type: 'string' },
            user_id: { type: 'string' },
            is_event: { type: 'boolean' },
            date_event: { type: 'string' },
            hour_event: { type: 'string' },
            participating_user: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)
