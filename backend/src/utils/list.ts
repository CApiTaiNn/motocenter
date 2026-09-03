import type { Model } from 'mongoose'
import { prepareQuery, type QueryPolicy, type ReqQuery } from './find'

interface ListOptions {
  // Constraint merged in *after* the client filter, so a route-enforced clause
  // (e.g. is_public:true) can't be overridden by a client-supplied filter.
  baseFilter?: Record<string, unknown>
  lean?: boolean
  // Called with the fetched docs and the parsed `deep` flag, for resolving
  // referenced users (attachUser/attachUsers) only when requested.
  attach?: (docs: any[], deep: boolean) => Promise<void>
}

// Shared list pipeline: parse+sanitise the query under `policy`, run the
// find/select/sort/skip/limit, then optionally resolve references. Centralises
// the handler that was copy-pasted across every resource (and silently dropped
// the filter in one of them).
export async function fetchList(
  model: Model<any>,
  query: ReqQuery,
  policy: QueryPolicy = {},
  opts: ListOptions = {}
): Promise<any[]> {
  const { project, sort, limit, skip, filter, deep } = prepareQuery(
    query,
    policy
  )
  const finalFilter = { ...filter, ...(opts.baseFilter ?? {}) }
  const q = model
    .find(finalFilter)
    .select(project)
    .sort(sort)
    .skip(skip)
    .limit(limit)
  const docs = opts.lean ? await q.lean() : await q
  if (opts.attach) await opts.attach(docs, deep)
  return docs
}
