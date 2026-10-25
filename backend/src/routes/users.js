import { Router } from 'express'
import mongoose from 'mongoose'
import User from '../models/User.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
const ROLES = ['user', 'agent', 'admin']

// Every route in this file is for admins only.
router.use(requireAuth, requireRole('admin'))

router.get('/', async (req, res) => {
  try {
    const filter = {}
    if (typeof req.query.role === 'string' && ROLES.includes(req.query.role)) {
      filter.role = req.query.role
    }
    const users = await User.find(filter)
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
    res.json({ users })
  } catch (err) {
    console.error('List users error:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

router.patch('/:id/role', async (req, res) => {
  try {
    const { role } = req.body || {}
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'User not found' })
    }
    if (typeof role !== 'string' || !ROLES.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${ROLES.join(', ')}` })
    }
    if (String(req.user._id) === req.params.id) {
      return res.status(400).json({ message: 'You cannot change your own role' })
    }

    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.role = role
    await user.save()
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } })
  } catch (err) {
    console.error('Change role error:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

export default router