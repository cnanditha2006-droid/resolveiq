import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import mongoose from 'mongoose'
import { connectDB } from './db.js'
import authRoutes from './routes/auth.js'
import ticketRoutes from './routes/tickets.js'
import ticketActionRoutes from './routes/ticketActions.js'
import userRoutes from './routes/users.js'

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN }))
app.use(express.json({ limit: '10kb' }))

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/tickets', ticketActionRoutes)
app.use('/api/users', userRoutes)

const port = process.env.PORT || 5001

async function start() {
  try {
    await connectDB()
    app.listen(port, () => console.log(`Server running on port ${port}`))
  } catch (err) {
    console.error('Failed to start server:', err.message)
    process.exit(1)
  }
}

start()