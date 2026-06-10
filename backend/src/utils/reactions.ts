// Reaction arrays (who liked / disliked / favorited) hold raw user ids. Exposing
// them on a read discloses *which* users reacted — a privacy leak. These helpers
// replace each array with a count plus a single per-viewer boolean, so a public
// read reveals only the aggregate and the caller's own state.

interface ReactionField {
  // The raw id-array field on the document (removed from the output).
  array: string
  // Boolean output field: true when the viewer's id is in the array.
  flag: string
}

// Mutates a plain object (lean doc or toObject() result) in place: for each
// configured field, set `flag` from the viewer's membership and delete the raw
// array. `viewerId` is the authenticated caller, or undefined for anonymous
// (then every flag is false).
export function summarizeReactions<T extends Record<string, any>>(
  doc: T,
  viewerId: string | undefined,
  fields: ReactionField[]
): T {
  for (const { array, flag } of fields) {
    // Only transform when the array was actually selected, so a minimal
    // (_id-only) projection stays minimal instead of gaining boolean noise.
    if (!(array in doc)) continue
    const list: unknown = doc[array]
    const ids = Array.isArray(list) ? (list as string[]) : []
    ;(doc as Record<string, any>)[flag] = viewerId
      ? ids.includes(viewerId)
      : false
    delete (doc as Record<string, any>)[array]
  }
  return doc
}

export function summarizeReactionsMany<T extends Record<string, any>>(
  docs: T[],
  viewerId: string | undefined,
  fields: ReactionField[]
): T[] {
  for (const doc of docs) summarizeReactions(doc, viewerId, fields)
  return docs
}
