import { useEffect, useState } from 'react'
import { apiRequest } from '../api.js'
import { useAuth } from '../context/auth.js'
import TicketDetail from './TicketDetail.jsx'

const KIND_LABELS = {
  duplicate: 'Possible duplicate',
  rapid_submission: 'Rapid submissions',
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ReviewQueue() {
  const { token } = useAuth()
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    let cancelled = false
    apiRequest(`/api/admin/flags?status=${status}&page=${page}&limit=10`, { token })
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
  }, [token, status, page, reloadKey])

  function switchStatus(next) {
    setStatus(next)
    setPage(1)
    setMessage(null)
  }

  async function dismiss(item) {
    const note = window.prompt(
      `Dismiss this flag on ${item.ticketNumber} as a false positive?\nAdd an optional note, then press OK.`,
      '',
    )
    if (note === null) return
    setMessage(null)
    try {
      await apiRequest(`/api/admin/flags/${item.ticketId}/${item.flag.id}/dismiss`, {
        method: 'PATCH',
        token,
        body: { note: note.trim() || undefined },
      })
      setMessage({ type: 'success', text: `Flag on ${item.ticketNumber} dismissed.` })
      setReloadKey((k) => k + 1)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  return (
    <div className="card">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Review queue</h2>
        <div>
          <button
            type="button"
            className={`btn btn-inline btn-small ${status === 'pending' ? '' : 'btn-secondary'}`}
            onClick={() => switchStatus('pending')}
          >
            Pending
          </button>{' '}
          <button
            type="button"
            className={`btn btn-inline btn-small ${status === 'dismissed' ? '' : 'btn-secondary'}`}
            onClick={() => switchStatus('dismissed')}
          >
            Dismissed
          </button>
        </div>
      </div>
      <p className="muted">
        Tickets are flagged automatically when they look like duplicates or arrive in a rush.
        Flagged tickets are never blocked. Dismiss a flag if it was a false alarm.
      </p>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      {!data && !error && <p className="muted">Loading flags...</p>}

      {data && data.items.length === 0 && (
        <p className="muted">
          {status === 'pending' ? 'Nothing to review right now.' : 'No dismissed flags yet.'}
        </p>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Reported by</th>
                  <th>Why it was flagged</th>
                  <th>Similarity</th>
                  <th>Similar to</th>
                  <th>Flagged</th>
                  <th>{status === 'pending' ? '' : 'Review note'}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.flag.id}>
                    <td className="title-cell">
                      <button type="button" className="link-button" onClick={() => setSelectedId(item.ticketId)}>
                        {item.ticketNumber}
                      </button>
                      <div className="muted">{item.title}</div>
                    </td>
                    <td>{item.createdBy?.name || 'Unknown'}</td>
                    <td>
                      <strong>{KIND_LABELS[item.flag.kind] || item.flag.kind}</strong>
                      <div className="muted">{item.flag.reason}</div>
                    </td>
                    <td className="nowrap">
                      {item.flag.kind === 'duplicate' && item.flag.score != null
                        ? `${Math.round(item.flag.score * 100)}% similar`
                        : '-'}
                    </td>
                    <td className="title-cell">
                      {item.flag.relatedTicket ? (
                        <>
                          {item.flag.relatedTicket.ticketNumber}
                          <div className="muted">{item.flag.relatedTicket.title}</div>
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="nowrap">{formatDateTime(item.flag.createdAt)}</td>
                    <td>
                      {status === 'pending' ? (
                        <button
                          type="button"
                          className="btn btn-inline btn-secondary btn-small"
                          onClick={() => dismiss(item)}
                        >
                          Dismiss
                        </button>
                      ) : (
                        item.flag.reviewNote || '-'
                      )}
                    </td>
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

      {selectedId && (
        <TicketDetail
          ticketId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  )
}