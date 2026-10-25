import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth.js'
import './DashboardLayout.css'

export default function DashboardLayout({ roleLabel, basePath, title, children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

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
          <button type="button" className="dash-link dash-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <h1>{title}</h1>
          <div className="dash-user">
            {user && <span className="dash-username">{user.name}</span>}
            <span className="role-badge">{roleLabel}</span>
          </div>
        </header>
        <main className="dash-content">{children}</main>
      </div>
    </div>
  )
}