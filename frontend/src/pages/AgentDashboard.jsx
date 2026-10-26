import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { PriorityBadge, StatusBadge } from '../components/Badges.jsx'
import TicketDetail from '../components/TicketDetail.jsx'
import { apiRequest } from '../api.js'
import { useAuth } from '../context/auth.js'

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
// Agents only ever see tickets that have been assigned to them.
const STATUSES = ['Assigned', 'In Progress', 'Resolved', 'Closed']
const NO_FILTERS = { q: '', status: '', priority: '' }

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AgentDashboard() {
  const { token } = useAuth()
  const [filters, setFilters] = useState(NO_FILTERS)
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [listError, setListError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ page: String(page), limit: '10' })
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value)
    }
    apiRequest(`/api/tickets?${params}`, { token })
      .then((res) => {
        if (!cancelled) {
          setData(res)
          setListError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setListError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [token, page, filters, reloadKey])

  function applySearch(e) {
    e.preventDefault()
    setPage(1)
    setFilters({ ...filters, q: searchText.trim() })
  }

  function changeFilter(e) {
    setPage(1)
    setFilters({ ...filters, [e.target.name]: e.target.value })
  }

  function clearFilters() {
    setSearchText('')
    setPage(1)
    setFilters(NO_FILTERS)
  }

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <DashboardLayout roleLabel="Support Agent" basePath="/agent" title="Assigned tickets">
      <div className="card">
        <div className="row-between">
          <h2 style={{ margin: 0 }}>Your assigned tickets</h2>
          {data && <span className="muted">{data.total} total</span>}
        </div>
        <p className="muted">
          Open a ticket to read the full description, start work on it, and resolve it with a note.
        </p>

        <form className="toolbar" onSubmit={applySearch}>
          <input type="search" placeholder="Search by title, description or number"
            aria-label="Search tickets" value={searchText}
            onChange={(e) => setSearchText(e.target.value)} />
          <select name="status" aria-label="Filter by status" value={filters.status} onChange={changeFilter}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select name="priority" aria-label="Filter by priority" value={filters.priority} onChange={changeFilter}>
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className="btn btn-inline" type="submit">Search</button>
          {hasFilters && (
            <button className="btn btn-inline btn-secondary" type="button" onClick={clearFilters}>
              Clear
            </button>
          )}
        </form>

        {listError && <div className="alert alert-error">{listError}</div>}
        {!data && !listError && <p className="muted">Loading tickets...</p>}

        {data && data.tickets.length === 0 && (
          <p className="muted">
            {hasFilters
              ? 'No tickets match your search.'
              : 'No tickets are assigned to you yet. An administrator will assign some soon.'}
          </p>
        )}

        {data && data.tickets.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Title</th>
                    <th>Reported by</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.tickets.map((t) => (
                    <tr key={t._id}>
                      <td>{t.ticketNumber}</td>
                      <td className="title-cell">
                        <button type="button" className="link-button" onClick={() => setSelectedId(t._id)}>
                          {t.title}
                        </button>
                      </td>
                      <td>{t.createdBy?.name || 'Unknown'}</td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td><StatusBadge status={t.status} /></td>
                      <td>{formatDate(t.createdAt)}</td>
                      <td>
                        <button className="btn btn-inline btn-secondary btn-small" type="button"
                          onClick={() => setSelectedId(t._id)}>
                          Open
                        </button>
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
      </div>

      {selectedId && (
        <TicketDetail
          ticketId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}
    </DashboardLayout>
  )
}