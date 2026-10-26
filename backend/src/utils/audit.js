import AuditLog from '../models/AuditLog.js'

// Records who did what. Never put passwords, tokens or other secrets in `details`.
export async function recordAudit({ actor, action, targetType, targetId, details }) {
  try {
    await AuditLog.create({ actor, action, targetType, targetId, details })
  } catch (err) {
    // A logging problem should not break the action itself, but we do want to see it.
    console.error('Audit log error:', err.message)
  }
}