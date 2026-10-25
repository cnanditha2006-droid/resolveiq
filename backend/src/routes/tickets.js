import { Router } from 'express'
import mongoose from 'mongoose'
import Ticket, { CATEGORIES, PRIORITIES, STATUSES } from '../models/Ticket.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Which tickets this person is allowed to see.
function scopeFor(user) {
  if (user.role === 'admin') return {}
  if (user.role === 'agent') return { assignedTo: user._id }
  return { createdBy: user._id }
}

router.post('/', requireRole('user'), async (req, res) => {
  try {
    const { title, description, category, priority } = req.body || {}
    const errors = {}

    if (typeof title !== 'string' || title.trim().length < 5 || title.trim().length > 120) {
      errors.title = 'Title must be 5 to 120 characters'
    }
    if (
      typeof description !== 'string' ||
      description.trim().length < 10 ||
      description.trim().length > 2000
    ) {
      errors.description = 'Description must be 10 to 2000 characters'
    }
    if (!CATEGORIES.includes(category)) {
      errors.category = `Category must be one of: ${CATEGORIES.join(', ')}`
    }
    if (priority !== undefined && !PRIORITIES.includes(priority)) {
      errors.priority = `Priority must be one of: ${PRIORITIES.join(', ')}`
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Please fix the errors', errors })
    }

    // status and assignedTo are never read from the request
    const ticket = await Ticket.create({
      title: title.trim(),
      description: description.trim(),
      category,
      priority: priority || 'Medium',
      createdBy: req.user._id,
      history: [{ action: 'Ticket created', by: req.user._id }],
    })

    res.status(201).json({ ticket })
  } catch (err) {
    console.error('Create ticket error:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50)
    const { status, priority, category, q } = req.query

    const filter = scopeFor(req.user)
    // typeof checks stop people from sending objects instead of text
    if (typeof status === 'string' && STATUSES.includes(status)) filter.status = status
    if (typeof priority === 'string' && PRIORITIES.includes(priority)) filter.priority = priority
    if (typeof category === 'string' && CATEGORIES.includes(category)) filter.category = category
    if (typeof q === 'string' && q.trim()) {
      const rx = new RegExp(escapeRegex(q.trim().slice(0, 100)), 'i')
      filter.$or = [{ title: rx }, { description: rx }, { ticketNumber: rx }]
    }

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .select('-history')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email'),
      Ticket.countDocuments(filter),
    ])

    res.json({ tickets, page, limit, total, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('List tickets error:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const notFound = { message: 'Ticket not found' }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json(notFound)
    }

    const ticket = await Ticket.findOne({ _id: req.params.id, ...scopeFor(req.user) })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('history.by', 'name role')

    // A ticket you may not see gets the same answer as one that does not exist.
    if (!ticket) return res.status(404).json(notFound)

    res.json({ ticket })
  } catch (err) {
    console.error('Get ticket error:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

export default router