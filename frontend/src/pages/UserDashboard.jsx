import DashboardLayout from '../components/DashboardLayout.jsx'

export default function UserDashboard() {
  return (
    <DashboardLayout roleLabel="User" basePath="/dashboard" title="My tickets">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2>No tickets yet</h2>
        <p className="muted">
          Tickets you report will appear here, with their status and priority.
          Ticket creation will be connected once the backend is ready.
        </p>
      </div>
      <div className="card">
        <h3>What you can do</h3>
        <p className="muted">
          Create tickets, search and filter your own tickets, and follow their
          progress from Open to Closed.
        </p>
      </div>
    </DashboardLayout>
  )
}