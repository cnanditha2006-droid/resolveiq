import rateLimit from 'express-rate-limit'

// Reads a positive whole number from the environment, or uses the fallback.
function positiveInt(value, fallback) {
  const n = parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function makeLimiter({ windowMin, max, message, ...extra }) {
  return rateLimit({
    windowMs: windowMin * 60 * 1000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
    ...extra,
  })
}

// Login: only FAILED attempts count, so normal users are never locked out.
export const loginLimiter = makeLimiter({
  windowMin: positiveInt(process.env.LOGIN_RATE_WINDOW_MIN, 15),
  max: positiveInt(process.env.LOGIN_RATE_MAX, 10),
  message: 'Too many failed login attempts. Please try again later.',
  skipSuccessfulRequests: true,
})

export const registerLimiter = makeLimiter({
  windowMin: positiveInt(process.env.REGISTER_RATE_WINDOW_MIN, 60),
  max: positiveInt(process.env.REGISTER_RATE_MAX, 10),
  message: 'Too many accounts created from this network. Please try again later.',
})

// Ticket creation: counted per logged-in user, so one user cannot flood the system.
export const ticketLimiter = makeLimiter({
  windowMin: positiveInt(process.env.TICKET_RATE_WINDOW_MIN, 10),
  max: positiveInt(process.env.TICKET_RATE_MAX, 10),
  message: 'You are creating tickets too quickly. Please wait a few minutes.',
  keyGenerator: (req) => String(req.user._id),
})