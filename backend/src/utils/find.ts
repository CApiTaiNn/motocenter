export interface ReqQuery {
  project?: string
  sort?: string
  limit?: string
  filter?: string
  deep?: string
}

const defaultLimit = 10
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

  const limit = query.limit ? Number(query.limit) : defaultLimit
  const filter = query.filter ? JSON.parse(query.filter) : defaultFilter
  const sort = query.sort ? JSON.parse(query.sort) : defaultSort

  const deep = query.deep ? true : false

  return { project, sort, limit, filter, deep }
}
