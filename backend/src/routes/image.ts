import { Router } from 'express'
import multer from 'multer'
import { supabase } from '../utils/supabase'
import { decode } from 'base64-arraybuffer'

const router = Router()
const storage = multer.memoryStorage()
const upload = multer({ storage })

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const file = req.file
    const name = req.body.name as string | undefined

    if (!file) {
      res.status(400).json({ message: 'Please upload a file' })
      return
    }

    const rawExt = file.originalname.includes('.')
      ? file.originalname.split('.').pop()!
      : 'bin'
    const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
    const baseName = (name || Date.now().toString()).replace(
      /[^a-zA-Z0-9_-]/g,
      ''
    )
    const fileName = `${baseName}.${ext}`

    const fileBase64 = decode(file.buffer.toString('base64'))

    console.log('[image upload]', {
      fileName,
      mimetype: file.mimetype,
      size: file.size,
      originalname: file.originalname
    })

    const { data, error } = await supabase.storage
      .from('userProfilImages')
      .upload(fileName, fileBase64, {
        contentType: file.mimetype,
        upsert: true
      })

    if (error) throw error

    const { data: image } = supabase.storage
      .from('userProfilImages')
      .getPublicUrl(data.path)

    res.status(200).json({ url: image.publicUrl })
  } catch (error) {
    console.error('Error uploading image:', error)
    res.status(500).json({ error })
  }
})

export default router
