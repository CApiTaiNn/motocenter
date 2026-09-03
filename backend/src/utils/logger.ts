import pino from 'pino'

// Structured JSON logger. Level comes from LOG_LEVEL; tests are silent so the
// request logger doesn't flood the test output. In production, ship these JSON
// lines to your log aggregator.
const level =
  process.env.NODE_ENV === 'test'
    ? 'silent'
    : process.env.LOG_LEVEL || 'info'

export const logger = pino({ level })
