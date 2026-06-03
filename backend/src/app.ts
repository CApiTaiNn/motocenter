import express, {
  type NextFunction,
  type Request,
  type Response
} from 'express'
import routes from './routes'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './swagger'
import { HttpError } from './utils/errors'

import cookieParser from 'cookie-parser'

const app = express()

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
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test'
})
app.use('/api/v1/auth', authLimiter)

app.use('/api/v1', routes)

if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}

// Centralised error handler: surfaces client errors (4xx) but never leaks
// internal details on a 500.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof HttpError ? err.status : 500
  if (status >= 500) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  } else {
    res.status(status).json({ error: (err as HttpError).message })
  }
})

export default app
