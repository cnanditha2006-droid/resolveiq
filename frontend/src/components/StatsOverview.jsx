import { useEffect, useState } from 'react'
import { apiRequest } from '../api.js'
import { useAuth } from '../context/auth.js'

function BarChart({ title, counts }) {
  const entries = Object.entries(counts)
  const max = Math.max(...entries.map(([, n]) => n), 1)
  return (
    <div className="card">
      <h3>{title}</h3>
      {entries.map(([label, n]) => (
        <div className="bar-row" key={label}>
          <span>{label}</span>
          <div className="bar-track" aria-hidden="true">
            <div className="bar-fill" style={{ width: `${(n / max) * 100}%` }} />
          </div>
          <span className="bar-count">{n}</span>
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value, hint, onClick }) {
  return (
    <button type="button" className="stat-card" onClick={onClick}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </button>
  )
}

export default function StatsOverview({ onNavigate }) {
  const { token } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    apiRequest('/api/admin/stats', { token })
      .then((res) => {
        if (!cancelled) {
          setStats(res)
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

  return (
    <>
      <div className="row-between">
        <p className="muted" style={{ margin: 0 }}>
          Live numbers from the database. Click a card to jump to the details.
        </p>
        <button
          type="button"
          className="btn btn-inline btn-secondary btn-small"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          Refresh
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!stats && !error && <p className="muted">Loading statistics...</p>}

      {stats && (
        <>
          <div className="stat-grid">
            <StatCard
              label="Total tickets"
              value={stats.totals.tickets}
              onClick={() => onNavigate('tickets')}
            />
            <StatCard
              label="New in the last 7 days"
              value={stats.totals.last7Days}
              onClick={() => onNavigate('tickets')}
            />
            <StatCard
              label="Unassigned"
              value={stats.totals.unassigned}
              hint="Open tickets with no agent"
              onClick={() => onNavigate('tickets')}
            />
            <StatCard
              label="Open for 3+ days"
              value={stats.totals.staleOpen}
              hint="Not yet resolved"
              onClick={() => onNavigate('tickets')}
            />
            <StatCard
              label="Pending flags"
              value={stats.totals.pendingFlags}
              hint="Waiting for review"
              onClick={() => onNavigate('review')}
            />
          </div>

          {stats.totals.tickets === 0 ? (
            <div className="card">
              <p className="muted" style={{ margin: 0 }}>
                No tickets have been reported yet, so there is nothing to chart.
              </p>
            </div>
          ) : (
            <div className="chart-grid">
              <BarChart title="Tickets by status" counts={stats.byStatus} />
              <BarChart title="Tickets by priority" counts={stats.byPriority} />
              <BarChart title="Tickets by category" counts={stats.byCategory} />
              <BarChart
                title="Accounts by role"
                counts={{
                  Users: stats.usersByRole.user,
                  'Support agents': stats.usersByRole.agent,
                  Administrators: stats.usersByRole.admin,
                }}
              />
            </div>
          )}
        </>
      )}
    </>
  )
}