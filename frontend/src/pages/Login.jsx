import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout.jsx'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function validate() {
    const next = {}
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address'
    if (!form.password) next.password = 'Password is required'
    return next
  }

  function handleSubmit(e) {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    setNotice('')
    if (Object.keys(next).length === 0) {
      // Backend is not connected yet (Phase 4). Be honest in the UI.
      setNotice('Form is valid. Login will work once the backend is connected.')
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to manage your tickets.">
      {notice && <div className="alert alert-info">{notice}</div>}
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
        <button className="btn" type="submit">Log in</button>
      </form>
      <p className="muted" style={{ marginTop: '1rem' }}>
        New here? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  )
}