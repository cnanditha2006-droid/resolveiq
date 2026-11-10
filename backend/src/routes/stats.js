import { Router } from 'express'
import Ticket, { CATEGORIES, PRIORITIES, STATUSES } from '../models/Ticket.js'
import User from '../models/User.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Admins only.
router.use(requireAuth, requireRole('admin'))

const DAY = 24 * 60 * 60 * 1000
const OPEN_STATES = ['Open', 'Assigned', 'In Progress']

// Turns grouped results into { key: count }, with 0 for anything that has no tickets.
function countsFor(rows, keys) {
  const result = Object.fromEntries(keys.map((key) => [key, 0]))
  for (const row of rows) {
    if (row._id in result) result[row._id] = row.count
  }
  return result
}

const groupBy = (field) => [{ $group: { _id: `$${field}`, count: { $sum: 1 } } }]

router.get('/', async (req, res) => {
  try {
    const now = Date.now()
    const [
      total,
      last7Days,
      unassigned,
      staleOpen,
      flagRows,
      statusRows,
      priorityRows,
      categoryRows,
      roleRows,
    ] = await Promise.all([
      Ticket.countDocuments({}),
      Ticket.countDocuments({ createdAt: { $gte: new Date(now - 7 * DAY) } }),
      Ticket.countDocuments({ status: 'Open', assignedTo: null }),
      Ticket.countDocuments({
        status: { $in: OPEN_STATES },
        createdAt: { $lt: new Date(now - 3 * DAY) },
      }),
      Ticket.aggregate([
        { $unwind: '$flags' },
        { $match: { 'flags.status': 'pending' } },
        { $count: 'n' },
      ]),
      Ticket.aggregate(groupBy('status')),
      Ticket.aggregate(groupBy('priority')),
      Ticket.aggregate(groupBy('category')),
      User.aggregate(groupBy('role')),
    ])

    res.json({
      totals: {
        tickets: total,
        last7Days,
        unassigned,
        staleOpen,
        pendingFlags: flagRows[0]?.n || 0,
      },
      byStatus: countsFor(statusRows, STATUSES),
      byPriority: countsFor(priorityRows, PRIORITIES),
      byCategory: countsFor(categoryRows, CATEGORIES),
      usersByRole: countsFor(roleRows, ['user', 'agent', 'admin']),
    })
  } catch (err) {
    console.error('Stats error:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

export default router