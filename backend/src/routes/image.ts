import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from 'express'
import multer, { MulterError } from 'multer'
import { extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getSupabase } from '../utils/supabase'

const BUCKET = 'userProfilImages'
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) cb(null, true)
    else cb(new Error('Unsupported file type'))
  }
})

const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
      return res.status(status).json({ message: err.message })
    }
    if (err) return res.status(400).json({ message: err.message })
    next()
  })
}

const router = Router()

router.post('/', handleUpload, async (req, res) => {
  try {
    const file = req.file
    if (!file) {
      res.status(400).json({ message: 'Please upload a file' })
      return
    }

    const ext = extname(file.originalname).slice(1).toLowerCase() || 'bin'
    const fileName = `${uuidv4()}.${ext}`

    const supabase = getSupabase()
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      })

    if (error) throw error

    const { data: image } = supabase.storage.from(BUCKET).getPublicUrl(data.path)

    res.status(200).json({ url: image.publicUrl })
  } catch (error) {
    console.error('Error uploading image:', error)
    res.status(500).json({ message: 'Image upload failed' })
  }
})

export default router
