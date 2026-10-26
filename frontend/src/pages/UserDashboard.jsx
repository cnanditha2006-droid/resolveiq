import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { PriorityBadge, StatusBadge } from '../components/Badges.jsx'
import TicketDetail from '../components/TicketDetail.jsx'
import { apiRequest } from '../api.js'
import { useAuth } from '../context/auth.js'

const CATEGORIES = ['Technical', 'Hardware', 'Software', 'Network', 'Other']
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const STATUSES = ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed']
const EMPTY_FORM = { title: '', description: '', category: 'Technical', priority: 'Medium' }
const NO_FILTERS = { q: '', status: '', priority: '', category: '' }

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function UserDashboard() {
  const { token } = useAuth()

  // Create-ticket form
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [formMessage, setFormMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Ticket list
  const [filters, setFilters] = useState(NO_FILTERS)
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [listError, setListError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ page: String(page), limit: '8' })
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

  function handleFormChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormMessage(null)
    const errors = {}
    if (form.title.trim().length < 5) errors.title = 'Title must be at least 5 characters'
    if (form.description.trim().length < 10) errors.description = 'Description must be at least 10 characters'
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const res = await apiRequest('/api/tickets', { method: 'POST', token, body: form })
      setForm(EMPTY_FORM)
      setFormMessage({ type: 'success', text: `Ticket ${res.ticket.ticketNumber} created.` })
      setPage(1)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setFormErrors(err.fieldErrors || {})
      setFormMessage({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
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
    <DashboardLayout roleLabel="User" basePath="/dashboard" title="My tickets">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2>Report an issue</h2>
        {formMessage && (
          <div className={`alert ${formMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            {formMessage.text}
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" name="title" type="text" maxLength={120}
              value={form.title} onChange={handleFormChange} />
            {formErrors.title && <div className="error-text">{formErrors.title}</div>}
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" maxLength={2000}
              value={form.description} onChange={handleFormChange} />
            {formErrors.description && <div className="error-text">{formErrors.description}</div>}
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="category">Category</label>
              <select id="category" name="category" value={form.category} onChange={handleFormChange}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {formErrors.category && <div className="error-text">{formErrors.category}</div>}
            </div>
            <div className="field">
              <label htmlFor="priority">Priority</label>
              <select id="priority" name="priority" value={form.priority} onChange={handleFormChange}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {formErrors.priority && <div className="error-text">{formErrors.priority}</div>}
            </div>
          </div>
          <button className="btn btn-inline" type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit ticket'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="row-between">
          <h2 style={{ margin: 0 }}>Your tickets</h2>
          {data && <span className="muted">{data.total} total</span>}
        </div>

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
            {hasFilters
              ? 'No tickets match your search.'
              : 'No tickets yet. Use the form above to report your first issue.'}
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
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
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
                      <td>{t.category}</td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td><StatusBadge status={t.status} /></td>
                      <td>{formatDate(t.createdAt)}</td>
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
        <TicketDetail ticketId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </DashboardLayout>
  )
}