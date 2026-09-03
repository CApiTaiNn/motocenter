import { HttpError } from './errors'

// Lightweight request-body validation. Throws HttpError(400) so the central
// error handler turns a bad payload into a 400 instead of letting it reach
// Mongoose and surface as a 500. Intentionally tiny — no schema library.

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `${field} is required`)
  }
  return value
}

export function optionalString(
  value: unknown,
  field: string
): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} must be a string`)
  }
  return value
}

export function requireOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new HttpError(400, `Invalid ${field}`)
  }
  return value as T
}
