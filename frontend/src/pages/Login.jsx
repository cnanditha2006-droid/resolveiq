import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout.jsx'
import { homePathFor, useAuth } from '../context/auth.js'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function validate() {
    const next = {}
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address'
    if (!form.password) next.password = 'Password is required'
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
      const user = await login(form.email.trim(), form.password)
      navigate(homePathFor(user.role), { replace: true })
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to manage your tickets.">
      {serverError && <div className="alert alert-error">{serverError}</div>}
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email"
            value={form.email} onChange={handleChange} />
          {errors.email && <div className="error-text">{errors.email}</div>}
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password"
            value={form.password} onChange={handleChange} />
          {errors.password && <div className="error-text">{errors.password}</div>}
        </div>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <p className="muted" style={{ marginTop: '1rem' }}>
        New here? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  )
}