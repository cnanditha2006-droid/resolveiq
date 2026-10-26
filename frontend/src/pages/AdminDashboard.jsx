import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { PriorityBadge, StatusBadge } from '../components/Badges.jsx'
import TicketDetail from '../components/TicketDetail.jsx'
import UsersPanel from '../components/UsersPanel.jsx'
import ReviewQueue from '../components/ReviewQueue.jsx'
import AuditLog from '../components/AuditLog.jsx'
import { apiRequest } from '../api.js'
import { useAuth } from '../context/auth.js'

const CATEGORIES = ['Technical', 'Hardware', 'Software', 'Network', 'Other']
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const STATUSES = ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed']
const NO_FILTERS = { q: '', status: '', priority: '', category: '' }
// Tickets in these states can still be (re)assigned.
const ASSIGNABLE = ['Open', 'Assigned', 'In Progress']
const TABS = [
  { id: 'tickets', label: 'Tickets' },
  { id: 'review', label: 'Review queue' },
  { id: 'audit', label: 'Audit log' },
  { id: 'users', label: 'Users' },
]

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminDashboard() {
  const { token } = useAuth()
  const [tab, setTab] = useState('tickets')
  const [filters, setFilters] = useState(NO_FILTERS)
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [agents, setAgents] = useState([])
  const [listError, setListError] = useState('')
  const [message, setMessage] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [agentsKey, setAgentsKey] = useState(0)
  const [selectedId, setSelectedId] = useState(null)

  // The list of support agents for the "assign" dropdowns.
  useEffect(() => {
    let cancelled = false
    apiRequest('/api/users?role=agent', { token })
      .then((res) => {
        if (!cancelled) setAgents(res.users)
      })
      .catch(() => {
        if (!cancelled) setAgents([])
      })
    return () => {
      cancelled = true
    }
  }, [token, agentsKey])

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

  async function assign(ticketId, agentId) {
    if (!agentId) return
    setMessage(null)
    try {
      const res = await apiRequest(`/api/tickets/${ticketId}/assign`, {
        method: 'PATCH',
        token,
        body: { agentId },
      })
      setMessage({
        type: 'success',
        text: `${res.ticket.ticketNumber} assigned to ${res.ticket.assignedTo.name}.`,
      })
      setReloadKey((k) => k + 1)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

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
    <DashboardLayout roleLabel="Administrator" basePath="/admin" title="Admin overview">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tickets' && (
        <div className="card">
          <div className="row-between">
            <h2 style={{ margin: 0 }}>Tickets</h2>
            {data && <span className="muted">{data.total} total</span>}
          </div>

          {message && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {message.text}
            </div>
          )}
          {agents.length === 0 && (
            <div className="alert alert-info">
              There are no support agents yet. Make someone an agent in the Users tab.
            </div>
          )}

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
            <select name="category" aria-label="Filter by category" value={filters.category} onChange={changeFilter}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
              {hasFilters ? 'No tickets match your search.' : 'No tickets have been reported yet.'}
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
                      <th>Assigned to</th>
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
                        <td>
                          {ASSIGNABLE.includes(t.status) ? (
                            <select aria-label={`Assign ${t.ticketNumber}`}
                              value={t.assignedTo?._id || ''}
                              onChange={(e) => assign(t._id, e.target.value)}>
                              <option value="" disabled>Choose agent</option>
                              {agents.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                            </select>
                          ) : (
                            t.assignedTo?.name || '-'
                          )}
                        </td>
                        <td>{formatDate(t.createdAt)}</td>
                        <td>
                          <button className="btn btn-inline btn-secondary btn-small" type="button"
                            onClick={() => setSelectedId(t._id)}>
                            View
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
      )}

      {tab === 'review' && <ReviewQueue />}
      {tab === 'audit' && <AuditLog />}
      {tab === 'users' && <UsersPanel onChanged={() => setAgentsKey((k) => k + 1)} />}

      {selectedId && (
        <TicketDetail
          ticketId={selectedId}
          agents={agents}
          onClose={() => setSelectedId(null)}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}
    </DashboardLayout>
  )
}