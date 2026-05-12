import { Router } from 'express'
import multer from 'multer'
import { supabase } from "../utils/supabase";
import { decode } from "base64-arraybuffer";

const router = Router()
const storage = multer.memoryStorage()
const upload = multer({ storage })

router.post('/api/images', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: "Please upload a file" });
      return;
    }

    // decode file buffer to base64
    const fileBase64 = decode(file.buffer.toString("base64"));

    // upload the file to supabase
    const { data, error } = await supabase.storage
      .from("userProfilImages")
      .upload(file.originalname, fileBase64, {
        contentType: "image/png",
      });

    if (error) {
      throw error;
    }

    // get public url of the uploaded file
    const { data: image } = supabase.storage
      .from("userProfilImages")
      .getPublicUrl(data.path);

    console.log(file);
    res.status(200).json({ image: image.publicUrl });
   
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

export default router