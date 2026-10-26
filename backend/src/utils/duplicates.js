import Ticket from '../models/Ticket.js'

// Filler words that say nothing about what a ticket is about.
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'have', 'has', 'was', 'are', 'not', 'but',
  'you', 'your', 'when', 'what', 'from', 'they', 'them', 'will', 'can', 'its', 'our', 'out',
  'all', 'any', 'been', 'were', 'had', 'did', 'does', 'just', 'into', 'than', 'then', 'also',
])

// Turns text into a set of distinct lowercase words.
export function tokenize(text) {
  return new Set(
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 3 && !STOPWORDS.has(word)),
  )
}

// Jaccard similarity: shared words divided by all distinct words. 0 to 1.
export function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const word of a) if (b.has(word)) shared++
  return shared / (a.size + b.size - shared)
}

function readNumber(value, fallback, min, max) {
  const n = Number(value)
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback
}

// Looks at this user's recent tickets and returns the closest match at or above the threshold.
export async function findDuplicate(userId, title, description) {
  const threshold = readNumber(process.env.DUPLICATE_THRESHOLD, 0.7, 0.1, 1)
  const days = readNumber(process.env.DUPLICATE_WINDOW_DAYS, 7, 1, 90)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const recent = await Ticket.find({ createdBy: userId, createdAt: { $gte: since } })
    .select('title description')
    .sort({ createdAt: -1 })
    .limit(50)

  const mine = tokenize(`${title} ${description}`)
  let best = null
  for (const ticket of recent) {
    const score = jaccard(mine, tokenize(`${ticket.title} ${ticket.description}`))
    if (score >= threshold && (!best || score > best.score)) {
      best = { ticketId: ticket._id, score: Math.round(score * 100) / 100 }
    }
  }
  return best
}