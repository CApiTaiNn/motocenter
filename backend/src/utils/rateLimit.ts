import rateLimit from 'express-rate-limit'

/**
 * Shared rate-limit policy: 15-minute window, standard headers, skipped in
 * tests. Call sites only choose how many requests the window allows.
 */
export const makeRateLimiter = (max: number) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test'
  })
