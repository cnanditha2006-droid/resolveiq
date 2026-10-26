import Ticket from '../models/Ticket.js'

function readInt(value, fallback, min, max) {
  const n = parseInt(value, 10)
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback
}

// Rule: too many tickets from one user in a short time. Returns details, or null if normal.
export async function findRapidSubmission(userId) {
  const limit = readInt(process.env.RAPID_TICKET_COUNT, 4, 2, 50)
  const minutes = readInt(process.env.RAPID_WINDOW_MIN, 2, 1, 60)
  const since = new Date(Date.now() - minutes * 60 * 1000)

  const recent = await Ticket.countDocuments({ createdBy: userId, createdAt: { $gte: since } })
  // The ticket being created right now is the one that brings the total up to the limit.
  return recent + 1 >= limit ? { count: recent + 1, minutes } : null
}