export function TypeBadge({ value }) {
  return <span className="badge rounded-pill border border-[#5c297c]/12 text-bg-light text-[#5c297c]">{value}</span>
}

export function StatusBadge({ value }) {
  return <span className={`badge document-status ${value.toLowerCase()}`}>{value}</span>
}
