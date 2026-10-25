import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // Stores the bcrypt hash, never the real password.
    // select: false means queries leave it out unless we ask for it.
    passwordHash: { type: String, required: true, select: false },
    // Public registration can only ever create 'user'. Agents and admins are set by an admin or the seed script.
    role: { type: String, enum: ['user', 'agent', 'admin'], default: 'user' },
  },
  { timestamps: true },
)

export default mongoose.model('User', userSchema)