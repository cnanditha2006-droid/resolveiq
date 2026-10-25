import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout.jsx'
import { homePathFor, useAuth } from '../context/auth.js'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function validate() {
    const next = {}
    if (form.name.trim().length < 2) next.name = 'Name must be at least 2 characters'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address'
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters'
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match'
    return next
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    setServerError('')
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      const user = await register(form.name.trim(), form.email.trim(), form.password)
      navigate(homePathFor(user.role), { replace: true })
    } catch (err) {
      // The server repeats the checks; show its field messages if it sends any.
      setErrors(err.fieldErrors || {})
      setServerError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const fields = [
    { name: 'name', label: 'Full name', type: 'text', auto: 'name' },
    { name: 'email', label: 'Email', type: 'email', auto: 'email' },
    { name: 'password', label: 'Password', type: 'password', auto: 'new-password' },
    { name: 'confirm', label: 'Confirm password', type: 'password', auto: 'new-password' },
  ]

  return (
    <AuthLayout title="Create your account" subtitle="Start reporting and tracking issues.">
      {serverError && <div className="alert alert-error">{serverError}</div>}
      <form onSubmit={handleSubmit} noValidate>
        {fields.map((f) => (
          <div className="field" key={f.name}>
            <label htmlFor={f.name}>{f.label}</label>
            <input id={f.name} name={f.name} type={f.type} autoComplete={f.auto}
              value={form[f.name]} onChange={handleChange} />
            {errors[f.name] && <div className="error-text">{errors[f.name]}</div>}
          </div>
        ))}
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="muted" style={{ marginTop: '1rem' }}>
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  )
}