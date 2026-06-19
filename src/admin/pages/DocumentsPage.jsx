import { useEffect, useMemo, useState } from 'react'
import { documents } from '../data/mockAdminData'
import { fetchDocumentsFromApi, PAGE_SIZE } from '../services/documentService'
import BootstrapDataTable from '../components/BootstrapDataTable'
import { StatusBadge, TypeBadge } from '../components/Badges'

function DocumentsPage({ compact = false, onViewAll, onUpload }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const queryKey = `${page}|${search}|${status}`
  const [serverData, setServerData] = useState({ rows: [], total: 0, queryKey: '' })
  const [error, setError] = useState('')
  const isLoading = !compact && serverData.queryKey !== queryKey
  const totalPages = Math.max(1, Math.ceil(serverData.total / PAGE_SIZE))
  const visibleRows = compact ? documents.slice(0, 3) : serverData.rows
  const resultRange = useMemo(() => {
    if (serverData.total === 0) {
      return '0 results'
    }

    const start = (page - 1) * PAGE_SIZE + 1
    const end = Math.min(page * PAGE_SIZE, serverData.total)

    return `${start}-${end} of ${serverData.total} results`
  }, [page, serverData.total])

  useEffect(() => {
    if (compact) {
      return
    }

    let isCurrentRequest = true

    fetchDocumentsFromApi({
      page,
      pageSize: PAGE_SIZE,
      search,
      status,
    })
      .then((data) => {
        if (isCurrentRequest) {
          setError('')
          setServerData({ ...data, queryKey })
        }
      })
      .catch((requestError) => {
        if (isCurrentRequest) {
          setError(requestError.message || 'Unable to load documents.')
          setServerData({ rows: [], total: 0, queryKey })
        }
      })

    return () => {
      isCurrentRequest = false
    }
  }, [compact, page, queryKey, search, status])

  function handleSearchChange(event) {
    setSearch(event.target.value)
    setPage(1)
  }

  function handleStatusChange(event) {
    setStatus(event.target.value)
    setPage(1)
  }

  return (
    <article className={`rounded-2xl border border-[#5c297c]/12 bg-white p-5 text-[#241433] shadow-[0_18px_50px_rgba(42,0,63,0.08)] ${compact ? 'xl:row-span-2' : 'xl:col-span-full'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0a733]">Knowledge Base</p>
          <h3 className="m-0 text-xl font-bold text-[#3b0a57]">{compact ? 'Recent Documents' : 'Document Management'}</h3>
        </div>
        <div className="flex gap-2">
          {compact && (
            <button className="rounded-lg bg-[#ffc52f] px-4 py-3 font-extrabold text-[#2a003f] shadow-[0_10px_20px_rgba(255,197,47,0.24)]" type="button" onClick={onViewAll}>
              View All
            </button>
          )}
          {!compact && (
            <button className="rounded-lg bg-[#ffc52f] px-4 py-3 font-extrabold text-[#2a003f] shadow-[0_10px_20px_rgba(255,197,47,0.24)]" type="button" onClick={onUpload}>
              Upload Document
            </button>
          )}
        </div>
      </div>

      {!compact && (
        <div className="datatable-toolbar bootstrap-datatable-toolbar">
          <label className="form-label">
            Search
            <input
              className="form-control"
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search document, owner, ID, or type"
            />
          </label>
          <label className="form-label">
            Status
            <select className="form-select" value={status} onChange={handleStatusChange}>
              <option>All</option>
              <option>Published</option>
              <option>Review</option>
              <option>Draft</option>
            </select>
          </label>
          <div className="server-badge">Server-side list</div>
        </div>
      )}

      <BootstrapDataTable
        columns={[
          { key: 'id', label: 'ID', className: 'fw-semibold text-[#5c297c]' },
          { key: 'title', label: 'Document', className: 'fw-bold' },
          { key: 'type', label: 'Type', render: (document) => <TypeBadge value={document.type} /> },
          { key: 'owner', label: 'Owner' },
          { key: 'status', label: 'Status', render: (document) => <StatusBadge value={document.status} /> },
          { key: 'date', label: 'Date' },
          {
            key: 'action',
            label: 'Action',
            headerClassName: 'text-end',
            className: 'text-end',
            render: () => (
              <button className="btn btn-sm btn-outline-warning" type="button">
                View
              </button>
            ),
          },
        ]}
        rows={visibleRows}
        isLoading={isLoading}
        emptyMessage="No documents found for this filter."
      />
      {error && <p className="form-error mt-3">{error}</p>}

      {!compact && (
        <div className="datatable-footer">
          <span>{isLoading ? 'Loading documents...' : resultRange}</span>
          <nav aria-label="Document table pagination">
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button className="page-link" type="button" onClick={() => setPage(page - 1)}>
                  Previous
                </button>
              </li>
              <li className="page-item active" aria-current="page">
                <span className="page-link">
                  {page} / {totalPages}
                </span>
              </li>
              <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" type="button" onClick={() => setPage(page + 1)}>
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </article>
  )
}

export default DocumentsPage
