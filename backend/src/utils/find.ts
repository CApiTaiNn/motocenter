import { HttpError } from './errors'

export interface ReqQuery {
  project?: string
  sort?: string
  limit?: string
  skip?: string
  filter?: string
  deep?: string
}

export interface QueryPolicy {
  // Field paths a client may filter on. Omit to allow any field — operator
  // hardening still applies. Use only on trusted/admin routes.
  filterable?: string[]
  // Field paths a client may project. Omit to allow any field (minus __v).
  projectable?: string[]
  // Field paths on which $regex is permitted. Default: none.
  regexFields?: string[]
  // Upper bound for `limit`. Defaults to PUBLIC_MAX_LIMIT.
  maxLimit?: number
}

// Query operators a client may use. Everything else — $where, $expr,
// $function, $accumulator, $jsonSchema, $text, … — is rejected. $regex is
// only honoured on whitelisted fields and is escaped to a literal substring.
const ALLOWED_OPERATORS = new Set([
  '$eq',
  '$ne',
  '$in',
  '$nin',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$and',
  '$or',
  '$nor',
  '$not',
  '$exists',
  '$regex',
  '$options'
])

const LOGICAL_OPERATORS = new Set(['$and', '$or', '$nor'])

// Cap the regex source so a crafted pattern can't be used for ReDoS even
// after escaping (escaping already removes the dangerous metacharacters).
const MAX_REGEX_LENGTH = 64

// Default ceiling for unauthenticated/non-admin callers — blocks one-shot
// collection dumps. Admin-facing routes raise it via policy.maxLimit.
export const PUBLIC_MAX_LIMIT = 100
export const ADMIN_MAX_LIMIT = 10000

const defaultLimit = 10
const defaultSort = {
  createdAt: -1
}
const defaultProject = '_id'
const defaultFilter = {}

// Escape every regex metacharacter so the pattern matches literally.
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Recursively validate and sanitise a parsed filter, in place. `fieldPath` is
// the field the current sub-object constrains (null at the top level and
// directly under logical operators, where each element names its own field).
function sanitizeFilter(
  node: unknown,
  fieldPath: string | null,
  policy: QueryPolicy
): void {
  if (Array.isArray(node)) {
    for (const item of node) sanitizeFilter(item, fieldPath, policy)
    return
  }
  if (!node || typeof node !== 'object') return

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key.startsWith('$')) {
      if (!ALLOWED_OPERATORS.has(key)) {
        throw new HttpError(400, `Operator ${key} is not allowed`)
      }
      if (key === '$regex') {
        if (!fieldPath || !(policy.regexFields ?? []).includes(fieldPath)) {
          throw new HttpError(
            400,
            `Regex filtering on ${fieldPath ?? 'this field'} is not allowed`
          )
        }
        if (typeof value !== 'string') {
          throw new HttpError(400, 'Invalid regex filter')
        }
        if (value.length > MAX_REGEX_LENGTH) {
          throw new HttpError(400, 'Regex filter is too long')
        }
        // Literal, case-insensitive substring match: escaping the source and
        // dictating the options removes both ReDoS and regex injection.
        // Runs of spaces or hyphens are treated as interchangeable, so
        // "mt 07" also finds "MT-07" and "MT07".
        ;(node as Record<string, unknown>)[key] = escapeRegex(value).replace(
          /[-\s]+/g,
          '[-\\s]*'
        )
        ;(node as Record<string, unknown>).$options = 'i'
      } else if (key === '$options') {
        // Options are dictated by us, never trusted from the client.
        ;(node as Record<string, unknown>)[key] = 'i'
      } else if (LOGICAL_OPERATORS.has(key)) {
        sanitizeFilter(value, null, policy)
      } else {
        sanitizeFilter(value, fieldPath, policy)
      }
    } else {
      if (policy.filterable && !policy.filterable.includes(key)) {
        throw new HttpError(400, `Filtering on ${key} is not allowed`)
      }
      sanitizeFilter(value, key, policy)
    }
  }
}

// Sort never needs query operators; reject any $-prefixed key outright.
function assertPlainSort(sort: unknown): void {
  if (!sort || typeof sort !== 'object') return
  for (const key of Object.keys(sort as Record<string, unknown>)) {
    if (key.startsWith('$')) {
      throw new HttpError(400, `Operator ${key} is not allowed in sort`)
    }
  }
}

function parseJsonParam(raw: string, label: string): any {
  try {
    return JSON.parse(raw)
  } catch {
    throw new HttpError(400, `Invalid ${label} parameter`)
  }
}

export function prepareQuery(query: ReqQuery, policy: QueryPolicy = {}) {
  const maxLimit = policy.maxLimit ?? PUBLIC_MAX_LIMIT

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

  if (policy.projectable) {
    // 'all' (empty inclusion) expands to the whole allowlist; otherwise keep
    // only allowlisted fields. An empty result falls back to _id.
    const allowed =
      Object.keys(project).length === 0
        ? policy.projectable
        : Object.keys(project).filter((f) => policy.projectable!.includes(f))
    project = allowed.length
      ? Object.fromEntries(allowed.map((f) => [f, 1]))
      : { _id: 1 }
  } else if (Object.keys(project).length === 0) {
    // No allowlist + project=all: return everything except the internal
    // version key, which is a technical field clients never need.
    project = { __v: 0 }
  } else {
    delete project.__v
  }

  const rawLimit = query.limit ? Number(query.limit) : defaultLimit
  // limit(0) would mean "no limit" in Mongo, so 0 is rejected too.
  if (!Number.isFinite(rawLimit) || rawLimit < 1) {
    throw new HttpError(400, 'Invalid limit parameter')
  }
  const limit = Math.min(rawLimit, maxLimit)

  // Offset pagination: page N = ?skip=N*limit&limit=limit.
  const skip = query.skip ? Number(query.skip) : 0
  if (!Number.isInteger(skip) || skip < 0) {
    throw new HttpError(400, 'Invalid skip parameter')
  }

  const filter = query.filter
    ? parseJsonParam(query.filter, 'filter')
    : defaultFilter
  sanitizeFilter(filter, null, policy)

  const sort = query.sort ? parseJsonParam(query.sort, 'sort') : defaultSort
  assertPlainSort(sort)

  const deep = query.deep ? true : false

  return { project, sort, limit, skip, filter, deep }
}
