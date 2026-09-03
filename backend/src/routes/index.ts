import { Router } from 'express'
import mongoose from 'mongoose'
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

// Health check: 200 only when the database is reachable, so an uptime monitor
// or Render's health check can detect a broken DB connection, not just a live
// process. readyState 1 = connected.
router.get('/status', (req, res) => {
  const connected = mongoose.connection.readyState === 1
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    db: connected ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime())
  })
})

export default router
