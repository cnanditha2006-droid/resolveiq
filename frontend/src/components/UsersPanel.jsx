import { useEffect, useState } from 'react'
import { apiRequest } from '../api.js'
import { useAuth } from '../context/auth.js'

const ROLES = ['user', 'agent', 'admin']
const ROLE_LABELS = { user: 'User', agent: 'Support agent', admin: 'Administrator' }

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function UsersPanel({ onChanged }) {
  const { token, user: me } = useAuth()
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    apiRequest('/api/users', { token })
      .then((res) => {
        if (!cancelled) {
          setUsers(res.users)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [token, reloadKey])

  async function changeRole(target, role) {
    if (role === target.role) return
    const ok = window.confirm(
      `Change ${target.name} from ${ROLE_LABELS[target.role]} to ${ROLE_LABELS[role]}?`,
    )
    if (!ok) return
    setMessage(null)
    try {
      await apiRequest(`/api/users/${target._id}/role`, {
        method: 'PATCH',
        token,
        body: { role },
      })
      setMessage({ type: 'success', text: `${target.name} is now ${ROLE_LABELS[role]}.` })
      setReloadKey((k) => k + 1)
      if (onChanged) onChanged()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Users and roles</h2>
        {users && <span className="muted">{users.length} accounts</span>}
      </div>
      <p className="muted">
        Make someone a support agent so tickets can be assigned to them. You cannot change your own role.
      </p>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      {!users && !error && <p className="muted">Loading users...</p>}

      {users && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = String(u._id) === String(me?.id)
                return (
                  <tr key={u._id}>
                    <td>{u.name}{isMe ? ' (you)' : ''}</td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        aria-label={`Role for ${u.name}`}
                        value={u.role}
                        disabled={isMe}
                        onChange={(e) => changeRole(u, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    </td>
                    <td>{formatDate(u.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}