import express from 'express'
import routes from './routes'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './swagger'

import cookieParser from 'cookie-parser'

const app = express()

app.use(cors({ 
    origin: [
        'http://localhost:3000', 
        'https://vroom-delta.vercel.app',
    ],
    credentials: true 
}))
app.use(express.json())
app.use(cookieParser())

app.use('/api/v1', routes)

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

export default app
