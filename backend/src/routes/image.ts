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
import { authenticateToken, requireAdmin } from '../utils/auth'

const BUCKET = 'userProfilImages'
const SOUND_BUCKET = 'motorcycleSounds'
const MAX_FILE_SIZE = 5 * 1024 * 1024

// Allowed image types keyed by extension, with their canonical mime type.
const IMAGE_TYPES = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif'
} as const
type ImageExt = keyof typeof IMAGE_TYPES

const SOUND_TYPES = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4'
} as const
type SoundExt = keyof typeof SOUND_TYPES

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

function detectSoundType(buffer: Buffer): SoundExt | null {
  if (buffer.length >= 3 && buffer.toString('ascii', 0, 3) === 'ID3') return 'mp3'
  // An MP3 without ID3 tag starts with an MPEG frame sync (11 set bits).
  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return 'mp3'
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return 'wav'
  }
  if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'OggS') return 'ogg'
  if (buffer.length >= 8 && buffer.toString('ascii', 4, 8) === 'ftyp') return 'm4a'
  return null
}
async function storeFile(
  bucket: string,
  buffer: Buffer,
  ext: string,
  contentType: string
): Promise<string> {
  const fileName = `${uuidv4()}.${ext}`

  const supabase = getSupabase()
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, buffer, { contentType, upsert: false })

  if (error) {
    // Preserve the underlying cause in the logs, surface a safe message.
    console.error('Supabase upload failed:', error)
    throw new HttpError(500, 'Upload failed')
  }

  return supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl
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

  const url = await storeFile(BUCKET, file.buffer, ext, IMAGE_TYPES[ext])
  res.status(200).json({ url })
})

// Only admins attach engine sounds to motorcycles.
router.post(
  '/sound',
  authenticateToken,
  requireAdmin,
  uploadLimiter,
  handleUpload,
  async (req, res) => {
    const file = req.file
    if (!file) {
      throw new HttpError(400, 'Please upload a file')
    }

    const ext = detectSoundType(file.buffer)
    if (!ext) {
      throw new HttpError(400, 'Unsupported file type')
    }

    const url = await storeFile(SOUND_BUCKET, file.buffer, ext, SOUND_TYPES[ext])
    res.status(200).json({ url })
  }
)

export default router
