import mongoose from 'mongoose'

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
})

const Counter = mongoose.model('Counter', counterSchema)

// Returns 1, 2, 3 ... for a given name. The database does the +1 in one
// atomic step, so two tickets can never receive the same number.
export async function nextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  )
  return counter.seq
}

export default Counter