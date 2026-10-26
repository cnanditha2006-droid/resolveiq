import { Router } from 'express'
import mongoose from 'mongoose'
import Ticket, { STATUSES } from '../models/Ticket.js'
import User from '../models/User.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { recordAudit } from '../utils/audit.js'

const router = Router()
router.use(requireAuth)

// Moves an agent may make. 'Assigned' is only ever set by the assign route.
const AGENT_MOVES = {
  Assigned: ['In Progress'],
  'In Progress': ['Resolved'],
  Resolved: ['In Progress'],
}
// An admin may do those moves too, and can also close a ticket from any open state.
const CLOSABLE = ['Open', 'Assigned', 'In Progress', 'Resolved']

router.patch('/:id/assign', requireRole('admin'), async (req, res) => {
  try {
    const { agentId } = req.body || {}
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Ticket not found' })
    }
    if (typeof agentId !== 'string' || !mongoose.isValidObjectId(agentId)) {
      return res.status(400).json({ message: 'agentId is required' })
    }

    // Only a real support agent can be assigned a ticket.
    const agent = await User.findOne({ _id: agentId, role: 'agent' })
    if (!agent) {
      return res.status(400).json({ message: 'Choose a valid support agent' })
    }

    const ticket = await Ticket.findById(req.params.id)
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' })

    if (!['Open', 'Assigned', 'In Progress'].includes(ticket.status)) {
      return res.status(400).json({ message: 'Resolved or closed tickets cannot be reassigned' })
    }

    ticket.assignedTo = agent._id
    ticket.status = 'Assigned'
    ticket.history.push({ action: `Assigned to ${agent.name}`, by: req.user._id })
    await ticket.save()
    await ticket.populate('assignedTo', 'name email')

    await recordAudit({
      actor: req.user._id,
      action: 'ticket_assigned',
      targetType: 'ticket',
      targetId: ticket._id,
      details: `${ticket.ticketNumber}: assigned to ${agent.name}`,
    })

    res.json({ ticket })
  } catch (err) {
    console.error('Assign ticket error:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

router.patch('/:id/status', requireRole('admin', 'agent'), async (req, res) => {
  try {
    const { status, note } = req.body || {}
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Ticket not found' })
    }
    if (typeof status !== 'string' || !STATUSES.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${STATUSES.join(', ')}` })
    }
    if (note !== undefined && (typeof note !== 'string' || note.length > 1000)) {
      return res.status(400).json({ message: 'Note must be text of up to 1000 characters' })
    }
    if (status === 'Closed' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only an admin can close a ticket' })
    }

    // Agents can only reach tickets assigned to them; anything else looks like "not found".
    const filter = { _id: req.params.id }
    if (req.user.role === 'agent') filter.assignedTo = req.user._id
    const ticket = await Ticket.findOne(filter)
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' })

    const moves = [...(AGENT_MOVES[ticket.status] || [])]
    if (req.user.role === 'admin' && CLOSABLE.includes(ticket.status)) moves.push('Closed')
    if (!moves.includes(status)) {
      return res.status(400).json({ message: `Cannot move a ticket from ${ticket.status} to ${status}` })
    }

    const cleanNote = typeof note === 'string' ? note.trim() : ''
    if (status === 'Resolved' && cleanNote.length < 5) {
      return res.status(400).json({ message: 'A resolution note of at least 5 characters is required' })
    }

    const from = ticket.status
    ticket.status = status
    ticket.history.push({
      action: `Status changed from ${from} to ${status}`,
      by: req.user._id,
      ...(cleanNote ? { note: cleanNote } : {}),
    })
    await ticket.save()

    await recordAudit({
      actor: req.user._id,
      action: 'ticket_status_changed',
      targetType: 'ticket',
      targetId: ticket._id,
      details: `${ticket.ticketNumber}: status changed from ${from} to ${status}`,
    })

    res.json({ ticket })
  } catch (err) {
    console.error('Update status error:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

export default router