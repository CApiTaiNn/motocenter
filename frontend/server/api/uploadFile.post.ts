import { writeFile, mkdir } from 'fs/promises'
import { join, normalize } from 'path'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'],
  sound: ['mp3', 'wav', 'ogg', 'm4a']
}

// A path segment may only contain safe characters — no separators or `..`,
// so a caller can't escape the upload directory.
const SAFE_SEGMENT = /^[a-z0-9][a-z0-9._-]*$/i

export default defineEventHandler(async (event) => {
  // Writing straight to the web-served public/ folder must be gated: require
  // an authenticated session (the backend cookie set at login).
  if (!getCookie(event, 'auth_token')) {
    throw createError({ statusCode: 401, message: 'Non autorisé' })
  }

  const formData = await readFormData(event)
  const file = formData.get('file') as File
  const type = formData.get('type') as string
  const directory = formData.get('directory') as string
  const name = formData.get('name') as string

  if (!file) throw createError({ statusCode: 400, message: 'Fichier manquant' })
  if (!directory)
    throw createError({ statusCode: 400, message: 'Répertoire manquant' })
  if (!name)
    throw createError({ statusCode: 400, message: 'Nom manquant' })

  const allowed = ALLOWED_EXTENSIONS[type]
  if (!allowed)
    throw createError({ statusCode: 400, message: 'Type invalide' })

  if (!SAFE_SEGMENT.test(directory))
    throw createError({ statusCode: 400, message: 'Répertoire invalide' })

  if (file.size > MAX_FILE_SIZE)
    throw createError({ statusCode: 413, message: 'Fichier trop volumineux' })

  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!allowed.includes(ext))
    throw createError({ statusCode: 400, message: 'Extension non autorisée' })

  const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  if (!safeName)
    throw createError({ statusCode: 400, message: 'Nom invalide' })
  const fileName = `${safeName}.${ext}`

  const baseFolder = join('public', type === 'image' ? 'images' : 'sounds', directory)
  const uploadRoot = join(process.cwd(), 'public')
  const filePath = normalize(join(process.cwd(), baseFolder, fileName))

  // Defence in depth: the resolved path must stay under public/.
  if (!filePath.startsWith(uploadRoot))
    throw createError({ statusCode: 400, message: 'Chemin invalide' })

  await mkdir(join(process.cwd(), baseFolder), { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  const publicUrl =
    type === 'image'
      ? `/images/${directory}/${fileName}`
      : `/sounds/${directory}/${fileName}`

  return { url: publicUrl }
})
