import './AuthLayout.css'

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <aside className="auth-brand">
        <h1>ResolveIQ</h1>
        <p className="tagline">Report smarter. Resolve faster.</p>
        <ul>
          <li>Role-based access for users, agents and admins</li>
          <li>Duplicate and spam detection built in</li>
          <li>Clear ticket status from open to closed</li>
        </ul>
      </aside>
      <main className="auth-form-wrap">
        <div className="card auth-card">
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  )
}