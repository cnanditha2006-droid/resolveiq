import { useEffect, useState } from 'react'
import { apiRequest } from '../api.js'
import { useAuth } from '../context/auth.js'

const ACTION_LABELS = {
  ticket_created: 'Ticket created',
  ticket_assigned: 'Ticket assigned',
  ticket_status_changed: 'Status changed',
  user_role_changed: 'Role changed',
  flag_dismissed: 'Flag dismissed',
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function AuditLog() {
  const { token } = useAuth()
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ page: String(page), limit: '15' })
    if (action) params.set('action', action)
    apiRequest(`/api/admin/audit?${params}`, { token })
      .then((res) => {
        if (!cancelled) {
          setData(res)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [token, action, page])

  function changeAction(e) {
    setAction(e.target.value)
    setPage(1)
  }

  return (
    <div className="card">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Audit log</h2>
        {data && <span className="muted">{data.total} entries</span>}
      </div>
      <p className="muted">
        A permanent record of key actions. Entries can be read here but never edited or deleted.
      </p>

      <div className="toolbar">
        <select aria-label="Filter by action" value={action} onChange={changeAction}>
          <option value="">All actions</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!data && !error && <p className="muted">Loading audit log...</p>}
      {data && data.logs.length === 0 && <p className="muted">No entries match.</p>}

      {data && data.logs.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <tr key={log._id}>
                    <td className="nowrap">{formatDateTime(log.createdAt)}</td>
                    <td>
                      {log.actor?.name || 'Unknown'}
                      {log.actor?.role && <div className="muted">{log.actor.role}</div>}
                    </td>
                    <td className="nowrap">{ACTION_LABELS[log.action] || log.action}</td>
                    <td className="title-cell">{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button className="btn btn-inline btn-secondary" type="button"
              disabled={data.page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span className="muted">Page {data.page} of {Math.max(data.pages, 1)}</span>
            <button className="btn btn-inline btn-secondary" type="button"
              disabled={data.page >= data.pages} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}