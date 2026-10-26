import { Router } from 'express'
import mongoose from 'mongoose'
import Ticket from '../models/Ticket.js'
import AuditLog from '../models/AuditLog.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { recordAudit } from '../utils/audit.js'

const router = Router()

// Every route in this file is for admins only.
router.use(requireAuth, requireRole('admin'))

function pageParams(query, defaultLimit) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1)
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), 50)
  return { page, limit }
}

// The review queue: tickets that carry a flag, with scores and the ticket they resemble.
router.get('/flags', async (req, res) => {
  try {
    const status = req.query.status === 'dismissed' ? 'dismissed' : 'pending'
    const { page, limit } = pageParams(req.query, 20)
    const filter = { flags: { $elemMatch: { status } } }

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .select('+flags')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name email')
        .populate('flags.relatedTicket', 'ticketNumber title'),
      Ticket.countDocuments(filter),
    ])

    const items = []
    for (const t of tickets) {
      for (const f of t.flags) {
        if (f.status !== status) continue
        items.push({
          ticketId: t._id,
          ticketNumber: t.ticketNumber,
          title: t.title,
          createdBy: t.createdBy,
          flag: {
            id: f._id,
            kind: f.kind,
            score: f.score,
            reason: f.reason,
            status: f.status,
            createdAt: f.createdAt,
            reviewNote: f.reviewNote,
            relatedTicket: f.relatedTicket,
          },
        })
      }
    }

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('List flags error:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

// Marks a flag as a false positive. The ticket itself is left untouched.
router.patch('/flags/:ticketId/:flagId/dismiss', async (req, res) => {
  try {
    const { ticketId, flagId } = req.params
    const { note } = req.body || {}

    if (!mongoose.isValidObjectId(ticketId) || !mongoose.isValidObjectId(flagId)) {
      return res.status(404).json({ message: 'Flag not found' })
    }
    if (note !== undefined && (typeof note !== 'string' || note.length > 500)) {
      return res.status(400).json({ message: 'Note must be text of up to 500 characters' })
    }

    const ticket = await Ticket.findById(ticketId).select('+flags')
    const flag = ticket ? ticket.flags.id(flagId) : null
    if (!flag) return res.status(404).json({ message: 'Flag not found' })
    if (flag.status === 'dismissed') {
      return res.status(400).json({ message: 'This flag was already dismissed' })
    }

    flag.status = 'dismissed'
    flag.reviewedBy = req.user._id
    flag.reviewedAt = new Date()
    if (typeof note === 'string' && note.trim()) flag.reviewNote = note.trim()
    await ticket.save()

    await recordAudit({
      actor: req.user._id,
      action: 'flag_dismissed',
      targetType: 'ticket',
      targetId: ticket._id,
      details: `${ticket.ticketNumber}: ${flag.kind} flag dismissed as a false positive`,
    })

    res.json({
      flag: { id: flag._id, kind: flag.kind, status: flag.status, reviewNote: flag.reviewNote },
    })
  } catch (err) {
    console.error('Dismiss flag error:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

// The audit log, newest first. Optional filter: ?action=flag_dismissed
router.get('/audit', async (req, res) => {
  try {
    const { page, limit } = pageParams(req.query, 25)
    const filter = {}
    if (typeof req.query.action === 'string' && /^[a-z_]{1,40}$/.test(req.query.action)) {
      filter.action = req.query.action
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('actor', 'name role'),
      AuditLog.countDocuments(filter),
    ])

    res.json({ logs, page, limit, total, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('List audit log error:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

export default router