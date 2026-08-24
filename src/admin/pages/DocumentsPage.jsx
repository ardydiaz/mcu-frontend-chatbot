import { useEffect, useMemo, useState } from 'react'
import { documents } from '../data/mockAdminData'
import { API_BASE_URL } from '../../services/apiClient'
import { fetchDocumentDetails, fetchDocumentsFromApi, PAGE_SIZE } from '../services/documentService'
import BootstrapDataTable from '../components/BootstrapDataTable'
import { StatusBadge, TypeBadge } from '../components/Badges'
import { fieldLabelClass as labelClass, goldSmallButtonClass as smallButtonClass, inputClass, modalButtonClass, paginationButtonClass, primaryButtonClass } from '../ui/classes'

function DocumentsPage({ compact = false, onViewAll, onUpload, refreshKey = 0 }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const queryKey = `${page}|${search}|${status}`
  const [serverData, setServerData] = useState({ rows: [], total: 0, queryKey: '' })
  const [error, setError] = useState('')
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
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
  }, [compact, page, queryKey, refreshKey, search, status])

  function handleSearchChange(event) {
    setSearch(event.target.value)
    setPage(1)
  }

  function handleStatusChange(event) {
    setStatus(event.target.value)
    setPage(1)
  }

  async function handleViewDocument(document) {
    setSelectedDocument(null)
    setDetailsError('')
    setIsDetailsLoading(true)

    try {
      setSelectedDocument(await fetchDocumentDetails(document.rawId || document.id))
    } catch (requestError) {
      setDetailsError(requestError.message || 'Unable to load document details.')
    } finally {
      setIsDetailsLoading(false)
    }
  }

  function closeDetailsModal() {
    setSelectedDocument(null)
    setDetailsError('')
    setIsDetailsLoading(false)
  }

  function getFileUrl(url) {
    return url ? new URL(url, API_BASE_URL).toString() : ''
  }

  return (
    <article className={`rounded-2xl border border-[#642B87]/12 bg-white p-5 text-[#241433] shadow-[0_18px_50px_rgba(48,0,69,0.08)] ${compact ? 'xl:row-span-2' : 'xl:col-span-full'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FFBA2E]">Knowledge Base</p>
          <h3 className="m-0 text-xl font-bold text-[#300045]">{compact ? 'Recent Documents' : 'Document Management'}</h3>
        </div>
        <div className="flex gap-2">
          {compact && (
            <button className={primaryButtonClass} type="button" onClick={onViewAll}>
              View All
            </button>
          )}
          {!compact && (
            <button className={primaryButtonClass} type="button" onClick={onUpload}>
              Upload Document
            </button>
          )}
        </div>
      </div>

      {!compact && (
        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
          <label className={labelClass}>
            Search
            <input
              className={inputClass}
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search document, owner, ID, or type"
            />
          </label>
          <label className={labelClass}>
            Status
            <select className={inputClass} value={status} onChange={handleStatusChange}>
              <option>All</option>
              <option>Published</option>
              <option>Review</option>
              <option>Draft</option>
            </select>
          </label>
          <div className="rounded-full bg-[#efe8f7] px-3 py-2 text-center text-xs font-extrabold text-[#642B87]">Server-side list</div>
        </div>
      )}

      <BootstrapDataTable
        columns={[
          { key: 'id', label: 'ID', className: 'fw-semibold text-[#642B87]' },
          { key: 'title', label: 'Document', className: 'fw-bold' },
          { key: 'type', label: 'Type', render: (document) => <TypeBadge value={document.type} /> },
          { key: 'scope', label: 'Scope', className: 'text-capitalize' },
          {
            key: 'accessLevel',
            label: 'Access',
            render: (document) => document.accessLevel === 'internal' ? 'Internal' : 'External',
          },
          { key: 'owner', label: 'Uploader' },
          { key: 'status', label: 'Status', render: (document) => <StatusBadge value={document.status} /> },
          { key: 'date', label: 'Date' },
          {
            key: 'action',
            label: 'Action',
            headerClassName: 'text-end',
            className: 'text-end',
            render: (document) => (
              <button className={smallButtonClass} type="button" onClick={() => handleViewDocument(document)}>
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
                <button className={paginationButtonClass} type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Previous
                </button>
              </li>
              <li className="page-item active" aria-current="page">
                <span className="page-link">
                  {page} / {totalPages}
                </span>
              </li>
              <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                <button className={paginationButtonClass} type="button" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {(isDetailsLoading || selectedDocument || detailsError) && (
        <div className="document-modal-backdrop" role="presentation" onMouseDown={closeDetailsModal}>
          <section
            className="document-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Document details"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="document-modal-head">
              <div>
                <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FFBA2E]">Document Preview</p>
                <h3>{selectedDocument?.title || 'Loading document'}</h3>
              </div>
              <button className={modalButtonClass} type="button" onClick={closeDetailsModal}>Close</button>
            </header>

            {isDetailsLoading && <p className="form-note">Loading document details...</p>}
            {detailsError && <p className="form-error">{detailsError}</p>}

            {selectedDocument && (
              <div className="document-detail-grid">
                <aside className="document-detail-summary">
                  <div>
                    <span>Uploaded By</span>
                    <strong>{selectedDocument.uploadedBy}</strong>
                  </div>
                  <div>
                    <span>Scope</span>
                    <strong>{selectedDocument.siteScope || 'general'}</strong>
                  </div>
                  <div>
                    <span>Document Access</span>
                    <strong>{selectedDocument.accessLevel === 'internal' ? 'Internal / Login Required' : 'External / Public'}</strong>
                  </div>
                  <div>
                    <span>Suggested Prompt</span>
                    <strong>{selectedDocument.suggestedPrompt || `What is ${selectedDocument.title}?`}</strong>
                  </div>
                  <div>
                    <span>Show As Topic</span>
                    <strong>{selectedDocument.showAsTopic ? 'Yes' : 'No'}</strong>
                  </div>
                  <div>
                    <span>Pages / Sections</span>
                    <strong>{selectedDocument.textPages?.length || 0}</strong>
                  </div>
                  <div>
                    <span>Images</span>
                    <strong>{selectedDocument.imageCount}</strong>
                  </div>
                  <a href={getFileUrl(selectedDocument.fileUrl)} target="_blank" rel="noreferrer">
                    Open Original File
                  </a>
                </aside>

                <div className="document-detail-content">
                  <section>
                    <h4>Extracted Text</h4>
                    <div className="document-text-pages">
                      {selectedDocument.textPages?.map((page) => (
                        <article key={page.pageNumber}>
                          <span>Page {page.pageNumber}</span>
                          <p>{page.content || 'No text extracted for this page.'}</p>
                        </article>
                      ))}
                    </div>
                  </section>

                  {selectedDocument.images?.length > 0 && (
                    <section>
                      <h4>Extracted Images</h4>
                      <div className="document-image-grid">
                        {selectedDocument.images.slice(0, 8).map((image) => (
                          <a href={getFileUrl(image.url)} target="_blank" rel="noreferrer" key={image.id}>
                            <img src={getFileUrl(image.url)} alt={`Page ${image.pageNumber}`} />
                            <span>Page {image.pageNumber}</span>
                          </a>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </article>
  )
}

export default DocumentsPage

