import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Brands',
      version: '1.0.0',
      description: 'Documentation de ton API Express',
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
      },
    ],
    components: {
      schemas: {
        Message: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            content: { type: 'string' },
            user: {
              type: 'object',
              description: 'Utilisateur associé (si populate activé)'
            },
            reference: { type: 'string' },
            referenceModel: { type: 'string' },
            usersLikeId: {
              type: 'array',
              items: { type: 'string' }
            },
            usersDislikeId: {
              type: 'array',
              items: { type: 'string' }
            },
            like: { type: 'integer' },
            dislike: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        MessageInput: {
          type: 'object',
          properties: {
            content: { type: 'string' },
            user: { type: 'string' },
            reference: { type: 'string' },
            referenceModel: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts'], // chemin vers tes routes,
}

export const swaggerSpec = swaggerJsdoc(options)