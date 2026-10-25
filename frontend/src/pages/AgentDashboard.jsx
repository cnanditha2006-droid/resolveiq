import DashboardLayout from '../components/DashboardLayout.jsx'

export default function AgentDashboard() {
  return (
    <DashboardLayout roleLabel="Support Agent" basePath="/agent" title="Assigned tickets">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2>No assigned tickets</h2>
        <p className="muted">
          Tickets an admin assigns to you will appear here. You will be able to
          update their status and add resolution notes.
        </p>
      </div>
      <div className="card">
        <h3>What you can do</h3>
        <p className="muted">
          View ticket details and history, move assigned tickets through
          In Progress and Resolved, and leave resolution notes.
        </p>
      </div>
    </DashboardLayout>
  )
}