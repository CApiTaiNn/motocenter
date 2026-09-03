import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from 'express'
import multer, { MulterError } from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { getSupabase } from '../utils/supabase'
import { makeRateLimiter } from '../utils/rateLimit'
import { HttpError } from '../utils/errors'

const BUCKET = 'userProfilImages'
const MAX_FILE_SIZE = 5 * 1024 * 1024

// Allowed image types keyed by extension, with their canonical mime type.
const IMAGE_TYPES = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif'
} as const
type ImageExt = keyof typeof IMAGE_TYPES

// Detect the real image type from the file's magic bytes rather than
// trusting the client-supplied mimetype or filename extension.
function detectImageType(buffer: Buffer): ImageExt | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg'
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png'
  }
  if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'GIF8') {
    return 'gif'
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp'
  }
  return null
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 }
})

const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
      return next(new HttpError(status, err.message))
    }
    if (err) return next(new HttpError(400, err.message))
    next()
  })
}

const uploadLimiter = makeRateLimiter(30)

const router = Router()

// Deliberately unauthenticated: account creation uploads the avatar BEFORE
// the user exists (CreateForm). Abuse is bounded by the rate limit, the 5MB
// single-file cap and magic-byte content validation. Require auth here once
// registration uploads after login instead.
router.post('/', uploadLimiter, handleUpload, async (req, res) => {
  const file = req.file
  if (!file) {
    throw new HttpError(400, 'Please upload a file')
  }

  const ext = detectImageType(file.buffer)
  if (!ext) {
    throw new HttpError(400, 'Unsupported file type')
  }

  const fileName = `${uuidv4()}.${ext}`

  const supabase = getSupabase()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file.buffer, {
      contentType: IMAGE_TYPES[ext],
      upsert: false
    })

  if (error) {
    // Preserve the underlying cause in the logs, surface a safe message.
    console.error('Supabase upload failed:', error)
    throw new HttpError(500, 'Image upload failed')
  }

  const { data: image } = supabase.storage.from(BUCKET).getPublicUrl(data.path)

  res.status(200).json({ url: image.publicUrl })
})

export default router
