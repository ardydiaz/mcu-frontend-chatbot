export function TypeBadge({ value }) {
  return <span className="badge text-bg-light border">{value}</span>
}

export function StatusBadge({ value }) {
  return <span className={`badge document-status ${value.toLowerCase()}`}>{value}</span>
}
