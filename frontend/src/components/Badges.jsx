function slug(text) {
  return String(text).toLowerCase().replace(/\s+/g, '-')
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${slug(status)}`}>{status}</span>
}

export function PriorityBadge({ priority }) {
  return <span className={`badge badge-${slug(priority)}`}>{priority}</span>
}