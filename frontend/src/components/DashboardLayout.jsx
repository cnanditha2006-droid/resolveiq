import { Link, NavLink } from 'react-router-dom'
import './DashboardLayout.css'

export default function DashboardLayout({ roleLabel, basePath, title, children }) {
  return (
    <div className="dash">
      <aside className="dash-sidebar">
        <div className="dash-brand">ResolveIQ</div>
        <nav className="dash-nav">
          <NavLink to={basePath} end className="dash-link">
            Overview
          </NavLink>
        </nav>
        <div className="dash-sidebar-footer">
          <Link to="/login" className="dash-link">Back to login</Link>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <h1>{title}</h1>
          <span className="role-badge">{roleLabel}</span>
        </header>
        <main className="dash-content">{children}</main>
      </div>
    </div>
  )
}