import { HttpError } from './errors'

export interface ReqQuery {
  project?: string
  sort?: string
  limit?: string
  filter?: string
  deep?: string
}

// Mongo operators that can execute server-side JavaScript. They must never
// be accepted from a client-supplied filter/sort.
const FORBIDDEN_OPERATORS = new Set([
  '$where',
  '$function',
  '$accumulator',
  '$expr'
])

function assertNoCodeOperators(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertNoCodeOperators)
  } else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (FORBIDDEN_OPERATORS.has(key)) {
        throw new HttpError(400, `Operator ${key} is not allowed`)
      }
      assertNoCodeOperators(nested)
    }
  }
}

function parseJsonParam(raw: string, label: string): any {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new HttpError(400, `Invalid ${label} parameter`)
  }
  assertNoCodeOperators(parsed)
  return parsed
}

const defaultLimit = 10
// Hard ceiling so a client can't dump entire collections. High because the
// admin motorcycle table fetches everything client-side (limit=10000);
// lower it once real pagination (skip/cursor) exists.
const maxLimit = 10000
const defaultSort = {
  createdAt: -1
}
const defaultProject = '_id'
const defaultFilter = {}

export function prepareQuery(query: ReqQuery) {
  // Permet le requêtage de plusieurs colonnes (ex = /users?project=firstname,lastname)
  let project: Record<string, number>

  // Si project=all, on sélectionne tous les champs
  if (query.project === 'all') {
    project = {}
  } else if (query.project) {
    project = query.project.split(',').reduce(
      (acc, field) => {
        acc[field.trim()] = 1
        return acc
      },
      {} as Record<string, number>
    )
  } else {
    project = { [defaultProject]: 1 }
  }

  const rawLimit = query.limit ? Number(query.limit) : defaultLimit
  // limit(0) would mean "no limit" in Mongo, so 0 is rejected too.
  if (!Number.isFinite(rawLimit) || rawLimit < 1) {
    throw new HttpError(400, 'Invalid limit parameter')
  }
  const limit = Math.min(rawLimit, maxLimit)
  const filter = query.filter
    ? parseJsonParam(query.filter, 'filter')
    : defaultFilter
  const sort = query.sort ? parseJsonParam(query.sort, 'sort') : defaultSort

  const deep = query.deep ? true : false

  return { project, sort, limit, filter, deep }
}
