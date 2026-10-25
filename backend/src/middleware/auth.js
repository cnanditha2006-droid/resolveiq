import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Checks the token sent by the browser and loads the user from the database.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const [scheme, token] = header.split(' ')
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Authentication required' })
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.sub)
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' })
    }
    req.user = user
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}

// Only lets through users whose role is in the list, e.g. requireRole('admin').
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do this' })
    }
    next()
  }
}