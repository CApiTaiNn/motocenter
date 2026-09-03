import express from 'express'
import routes from './routes'
import cors from 'cors'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './swagger'
import { errorHandler } from './utils/errorHandler'
import { makeRateLimiter } from './utils/rateLimit'
import { logger } from './utils/logger'
import pinoHttp from 'pino-http'

import cookieParser from 'cookie-parser'

const app = express()

// Behind Render's proxy: trust the first hop so req.ip is the real client IP
// (otherwise express-rate-limit keys every request on the proxy address).
app.set('trust proxy', 1)

// Structured request logging (one JSON line per request). Silent in tests.
app.use(pinoHttp({ logger }))

app.use(helmet())

// Allowed browser origins. Set CORS_ORIGINS in prod (comma-separated) so a new
// frontend URL never needs a code change. Falls back to the known dev + Vercel
// origins when unset.
const allowedOrigins = (
  process.env.CORS_ORIGINS ?? 'http://localhost:3000,https://vroom-delta.vercel.app'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: allowedOrigins,
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
