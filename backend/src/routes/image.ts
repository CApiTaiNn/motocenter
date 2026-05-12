import { Router } from 'express'
import multer from 'multer'
import { supabase } from '../utils/supabase'
import { decode } from 'base64-arraybuffer'
import { v4 as uuidv4 } from 'uuid'

const router = Router()
const storage = multer.memoryStorage()
const upload = multer({ storage })

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const file = req.file

    if (!file) {
      res.status(400).json({ message: 'Please upload a file' })
      return
    }
    const ext = file.originalname.split('.').pop()?.toLocaleLowerCase() || 'bin'
    const fileName = `${uuidv4()}.${ext}`

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
