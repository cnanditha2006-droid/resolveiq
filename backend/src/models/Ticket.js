import mongoose from 'mongoose'
import { nextSequence } from './Counter.js'

export const CATEGORIES = ['Technical', 'Hardware', 'Software', 'Network', 'Other']
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
export const STATUSES = ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed']

const historySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, maxlength: 1000 },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
)

// A flag marks a ticket for an admin to look at. It never blocks the ticket.
const flagSchema = new mongoose.Schema({
  kind: { type: String, enum: ['duplicate', 'rapid_submission'], required: true },
  reason: { type: String, maxlength: 300 },
  score: { type: Number, min: 0, max: 1 },
  relatedTicket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
  status: { type: String, enum: ['pending', 'dismissed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewNote: { type: String, maxlength: 500 },
})

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, unique: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    category: { type: String, enum: CATEGORIES, required: true },
    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    status: { type: String, enum: STATUSES, default: 'Open' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    history: [historySchema],
    // select: false keeps flags out of normal queries, so users never see them.
    // Admin-only code asks for them explicitly.
    flags: { type: [flagSchema], select: false, default: [] },
  },
  { timestamps: true },
)

// Gives every new ticket its number, e.g. RIQ-0001.
ticketSchema.pre('save', async function () {
  if (this.isNew && !this.ticketNumber) {
    const n = await nextSequence('ticket')
    this.ticketNumber = `RIQ-${String(n).padStart(4, '0')}`
  }
})

export default mongoose.model('Ticket', ticketSchema)