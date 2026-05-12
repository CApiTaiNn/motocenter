import 'dotenv/config'
import app from './app'
import connectDB from './config/db'
import { validateEnv } from './config/env'

validateEnv()

const PORT = process.env.PORT_BACK || 5000

connectDB()

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
