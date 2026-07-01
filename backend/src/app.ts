import express from 'express'
import routes from './routes'
import cors from 'cors'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './swagger'
import { errorHandler } from './utils/errorHandler'
import { makeRateLimiter } from './utils/rateLimit'

import cookieParser from 'cookie-parser'

const app = express()

// Behind Render's proxy: trust the first hop so req.ip is the real client IP
// (otherwise express-rate-limit keys every request on the proxy address).
app.set('trust proxy', 1)

app.use(helmet())
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://vroom-delta.vercel.app'],
    credentials: true
  })
)
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

// Throttle authentication attempts to slow credential brute forcing.
app.use('/api/v1/auth', makeRateLimiter(20))

app.use('/api/v1', routes)

if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}

// Central error handler — must be registered last, after all routes.
app.use(errorHandler)

export default app
