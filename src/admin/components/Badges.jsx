export function TypeBadge({ value }) {
  return <span className="badge rounded-pill border border-[#642B87]/12 text-bg-light text-[#642B87]">{value}</span>
}

export function StatusBadge({ value }) {
  return <span className={`badge document-status ${value.toLowerCase()}`}>{value}</span>
}


