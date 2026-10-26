import { useEffect, useState } from 'react'
import { PriorityBadge, StatusBadge } from './Badges.jsx'
import { apiRequest } from '../api.js'
import { useAuth } from '../context/auth.js'

// The moves the server allows. Admins can also close a ticket from any open state.
const NEXT_STATUSES = {
  Open: [],
  Assigned: ['In Progress'],
  'In Progress': ['Resolved'],
  Resolved: ['In Progress'],
  Closed: [],
}
const ASSIGNABLE = ['Open', 'Assigned', 'In Progress']

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function TicketDetail({ ticketId, onClose, agents = [], onChanged }) {
  const { token, user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Loads the ticket, and loads it again whenever reloadKey goes up.
  useEffect(() => {
    let cancelled = false
    apiRequest(`/api/tickets/${ticketId}`, { token })
      .then((res) => {
        if (!cancelled) {
          setTicket(res.ticket)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [ticketId, token, reloadKey])

  // Pressing Escape closes the window.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function changeStatus(status, statusNote) {
    setBusy(true)
    setMessage(null)
    try {
      await apiRequest(`/api/tickets/${ticketId}/status`, {
        method: 'PATCH',
        token,
        body: { status, note: statusNote || undefined },
      })
      setMessage({ type: 'success', text: `Status changed to ${status}.` })
      setNewStatus('')
      setNote('')
      setReloadKey((k) => k + 1)
      if (onChanged) onChanged()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  function submitStatus(e) {
    e.preventDefault()
    if (!newStatus) return
    if (newStatus === 'Resolved' && note.trim().length < 5) {
      setMessage({ type: 'error', text: 'Add a resolution note of at least 5 characters.' })
      return
    }
    changeStatus(newStatus, note.trim())
  }

  function closeTicket() {
    if (!window.confirm(`Close ${ticket.ticketNumber}? This cannot be undone.`)) return
    changeStatus('Closed', note.trim())
  }

  async function assign(agentId) {
    if (!agentId) return
    setBusy(true)
    setMessage(null)
    try {
      const res = await apiRequest(`/api/tickets/${ticketId}/assign`, {
        method: 'PATCH',
        token,
        body: { agentId },
      })
      setMessage({ type: 'success', text: `Assigned to ${res.ticket.assignedTo.name}.` })
      setReloadKey((k) => k + 1)
      if (onChanged) onChanged()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  const moves = ticket ? NEXT_STATUSES[ticket.status] || [] : []

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Ticket details"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            {ticket && <span className="muted">{ticket.ticketNumber}</span>}
            <h2>{ticket ? ticket.title : 'Ticket details'}</h2>
          </div>
          <button type="button" className="btn btn-inline btn-secondary btn-small" onClick={onClose}>
            Close window
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {!ticket && !error && <p className="muted">Loading ticket...</p>}

        {ticket && (
          <>
            <div className="detail-meta">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <span>Category: {ticket.category}</span>
              <span>Reported by: {ticket.createdBy?.name || 'Unknown'}</span>
              <span>Assigned to: {ticket.assignedTo?.name || 'Nobody yet'}</span>
              <span>Created: {formatDateTime(ticket.createdAt)}</span>
            </div>

            <h3>Description</h3>
            <p className="ticket-description">{ticket.description}</p>

            {message && (
              <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                {message.text}
              </div>
            )}

            {isAdmin && ticket.status !== 'Closed' && (
              <div className="detail-section">
                <h3>Manage ticket</h3>

                {ASSIGNABLE.includes(ticket.status) && (
                  <div className="field">
                    <label htmlFor="assign-agent">Assign to</label>
                    <select
                      id="assign-agent"
                      value={ticket.assignedTo?._id || ''}
                      disabled={busy}
                      onChange={(e) => assign(e.target.value)}
                    >
                      <option value="" disabled>Choose agent</option>
                      {agents.map((a) => (
                        <option key={a._id} value={a._id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {moves.length > 0 && (
                  <form onSubmit={submitStatus}>
                    <div className="field">
                      <label htmlFor="new-status">Change status to</label>
                      <select
                        id="new-status"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                      >
                        <option value="">Choose a status</option>
                        {moves.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="status-note">Note (required when resolving)</label>
                      <textarea
                        id="status-note"
                        maxLength={1000}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </div>
                    <button className="btn btn-inline" type="submit" disabled={busy || !newStatus}>
                      Update status
                    </button>
                  </form>
                )}

                <p style={{ marginTop: '1rem', marginBottom: 0 }}>
                  <button
                    type="button"
                    className="btn btn-inline btn-secondary"
                    disabled={busy}
                    onClick={closeTicket}
                  >
                    Close ticket
                  </button>
                </p>
              </div>
            )}

            <div className="detail-section">
              <h3>History</h3>
              <ul className="history">
                {(ticket.history || []).map((h, i) => (
                  <li key={i}>
                    <strong>{h.action}</strong>
                    <div className="when">
                      {h.by?.name || 'Unknown'} · {formatDateTime(h.at)}
                    </div>
                    {h.note && <p className="history-note">{h.note}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}