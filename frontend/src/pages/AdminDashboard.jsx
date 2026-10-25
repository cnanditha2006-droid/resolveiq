import DashboardLayout from '../components/DashboardLayout.jsx'

export default function AdminDashboard() {
  return (
    <DashboardLayout roleLabel="Administrator" basePath="/admin" title="Admin overview">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2>All tickets</h2>
        <p className="muted">
          Every ticket in the system will be listed here, with assignment controls.
        </p>
      </div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2>Review queue</h2>
        <p className="muted">
          Tickets flagged as possible duplicates or suspicious will appear here,
          with their similarity scores, so you can review or dismiss them.
        </p>
      </div>
      <div className="card">
        <h2>Audit log</h2>
        <p className="muted">
          A record of key actions (creation, assignment, status changes, reviews)
          will appear here.
        </p>
      </div>
    </DashboardLayout>
  )
}