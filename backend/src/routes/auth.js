import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const SALT_ROUNDS = 12
const EMAIL_RE = /^\S+@\S+\.\S+$/
// Compared against when an email isn't found, so login takes a similar time either way.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', SALT_ROUNDS)

function signToken(user) {
  return jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: String(user._id),
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  })
}

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role }
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {}
    const errors = {}

    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      errors.name = 'Name must be 2 to 80 characters'
    }
    if (typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email.trim())) {
      errors.email = 'Enter a valid email address'
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
      errors.password = 'Password must be 8 to 72 characters'
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Please fix the errors', errors })
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    // role is never read from the request, so it always defaults to 'user'
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
    })

    res.status(201).json({ token: signToken(user), user: publicUser(user) })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists' })
    }
    console.error('Register error:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const generic = { message: 'Invalid email or password' }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(401).json(generic)
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash')
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH)

    if (!user || !ok) {
      return res.status(401).json(generic)
    }

    res.json({ token: signToken(user), user: publicUser(user) })
  } catch (err) {
    console.error('Login error:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

export default router