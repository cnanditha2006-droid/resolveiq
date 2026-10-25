import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDB } from '../db.js'
import User from '../models/User.js'

const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env

async function seedAdmin() {
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env')
  }
  if (ADMIN_PASSWORD.length < 12 || ADMIN_PASSWORD.length > 72) {
    throw new Error('ADMIN_PASSWORD must be 12 to 72 characters')
  }

  const email = ADMIN_EMAIL.trim().toLowerCase()
  const existing = await User.findOne({ email })
  if (existing) {
    console.log(`An account for ${email} already exists (role: ${existing.role}). Nothing changed.`)
    return
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  await User.create({ name: ADMIN_NAME.trim(), email, passwordHash, role: 'admin' })
  console.log(`Admin account created for ${email}`)
}

try {
  await connectDB()
  await seedAdmin()
} catch (err) {
  console.error('Seed failed:', err.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}