import type { NextFunction, Request, Response } from 'express'
import { HttpError } from './errors'
import { logger } from './logger'

// Map an unknown thrown value to an HTTP status + safe client message.
// Mongoose CastError (malformed ObjectId) and ValidationError are client
// faults, so they become 400 rather than leaking as 500.
export function classifyError(err: unknown): {
  status: number
  message: string
} {
  if (err instanceof HttpError) {
    return { status: err.status, message: err.message }
  }
  const name = (err as { name?: string })?.name
  if (name === 'CastError') {
    return { status: 400, message: 'Invalid identifier' }
  }
  if (name === 'ValidationError') {
    return { status: 400, message: 'Validation failed' }
  }
  return { status: 500, message: 'Internal server error' }
}

// Central Express error handler (the 4-argument signature is what marks it as
// an error handler). Every route's thrown/rejected error funnels here, so the
// status-code mapping lives in exactly one place. Mounted last in app.ts,
// after all routes. Surfaces client errors (4xx) but never leaks internals on
// a 500.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
) {
  // If the response already started, delegate to Express's default handler.
  if (res.headersSent) return next(err)

  const { status, message } = classifyError(err)
  if (status >= 500) {
    logger.error({ err }, 'Unhandled error')
  }
  res.status(status).json({ error: message })
}
