import { Router } from 'express'
import userRoutes from './user'
import brandRoutes from './brand'
import messageRoutes from './message'
import motorcycleRoutes from './motorcycle'
import postRoutes from './post'
import rideRoutes from './ride'
import imageRoutes from './image'
import token from './auth'

const router = Router()

router.use('/users', userRoutes)
router.use('/brands', brandRoutes)
router.use('/messages', messageRoutes)
router.use('/motorcycles', motorcycleRoutes)
router.use('/posts', postRoutes)
router.use('/rides', rideRoutes)
router.use('/auth', token)
router.use('/images', imageRoutes)

router.get('/status', (req, res) => {
  res.send('Api is running')
})

export default router
