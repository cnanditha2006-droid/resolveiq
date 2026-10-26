import mongoose from 'mongoose'

const auditSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, maxlength: 40, index: true },
    targetType: { type: String, required: true, maxlength: 20 },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    details: { type: String, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

// Entries can be added but never edited or removed through the app.
const BLOCKED_QUERIES = [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
]
for (const op of BLOCKED_QUERIES) {
  auditSchema.pre(op, function () {
    throw new Error('Audit log entries cannot be changed or deleted')
  })
}
auditSchema.pre('deleteOne', { document: true, query: false }, function () {
  throw new Error('Audit log entries cannot be changed or deleted')
})
auditSchema.pre('save', function () {
  if (!this.isNew) throw new Error('Audit log entries cannot be changed or deleted')
})

export default mongoose.model('AuditLog', auditSchema)