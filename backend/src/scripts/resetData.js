import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../db.js'

// Developer tool: wipes tickets, ticket counters, the audit log and every non-admin account.
// Admin accounts are kept. It talks to the collections directly, which is the only way to
// clear an audit log that the application itself refuses to delete from.

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run in production.')
  process.exit(1)
}
if (!process.argv.includes('--yes')) {
  console.error('This deletes all tickets, the audit log and every non-admin account.')
  console.error('To continue, run: npm run reset:data -- --yes')
  process.exit(1)
}

try {
  await connectDB()
  const db = mongoose.connection
  const tickets = await db.collection('tickets').deleteMany({})
  await db.collection('counters').deleteMany({})
  const audit = await db.collection('auditlogs').deleteMany({})
  const users = await db.collection('users').deleteMany({ role: { $ne: 'admin' } })
  console.log(`Deleted ${tickets.deletedCount} tickets, ${audit.deletedCount} audit entries and ${users.deletedCount} non-admin accounts.`)
} catch (err) {
  console.error('Reset failed:', err.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}