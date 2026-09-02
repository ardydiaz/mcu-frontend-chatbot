import { useEffect, useMemo, useState } from 'react'
import { documents } from '../data/mockAdminData'
import { API_BASE_URL } from '../../services/apiClient'
import { fetchDocumentDetails, fetchDocumentsFromApi, PAGE_SIZE, saveCapturedDocumentPage } from '../services/documentService'
import BootstrapDataTable from '../components/BootstrapDataTable'
import { StatusBadge, TypeBadge } from '../components/Badges'
import { fieldLabelClass as labelClass, goldSmallButtonClass as smallButtonClass, inputClass, modalButtonClass, paginationButtonClass, primaryButtonClass } from '../ui/classes'

let pdfJsLoadPromise = null

function loadPdfJs() {
  if (window.pdfjsLib) {
    return Promise.resolve(window.pdfjsLib)
  }

  if (!pdfJsLoadPromise) {
    pdfJsLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')

      script.src = new URL('/vendor/pdfjs/pdf.js', API_BASE_URL).toString()
      script.async = true
      script.onload = () => {
        if (!window.pdfjsLib) {
          reject(new Error('PDF renderer could not be loaded.'))
          return
        }

        window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('/vendor/pdfjs/pdf.worker.js', API_BASE_URL).toString()
        resolve(window.pdfjsLib)
      }
      script.onerror = () => reject(new Error('PDF renderer could not be loaded.'))
      document.head.appendChild(script)
    })
  }

  return pdfJsLoadPromise
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }

      reject(new Error('Page capture could not be created.'))
    }, 'image/png')
  })
}

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
  const [captureStatus, setCaptureStatus] = useState('')
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

  useEffect(() => {
    if (!selectedDocument?.previewFileUrl || selectedDocument.imageCount > 0) {
      return undefined
    }

    let isCancelled = false

    async function captureDocumentPages() {
      try {
        setCaptureStatus('Capturing document pages...')

        const pdfjsLib = await loadPdfJs()
        const pdf = await pdfjsLib.getDocument(getFileUrl(selectedDocument.previewFileUrl)).promise
        const savedImages = []

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (isCancelled) {
            return
          }

          setCaptureStatus(`Capturing page ${pageNumber} of ${pdf.numPages}...`)

          const page = await pdf.getPage(pageNumber)
          const viewport = page.getViewport({ scale: 1.4 })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')

          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)

          await page.render({ canvasContext: context, viewport }).promise

          const imageBlob = await canvasToBlob(canvas)
          const savedImage = await saveCapturedDocumentPage({
            documentId: selectedDocument.id,
            pageNumber,
            imageBlob,
          })

          savedImages.push(savedImage)
        }

        if (!isCancelled) {
          setSelectedDocument((currentDocument) => {
            if (!currentDocument || currentDocument.id !== selectedDocument.id) {
              return currentDocument
            }

            const nextImages = [
              ...(currentDocument.images || []).filter(
                (image) => !savedImages.some((savedImage) => savedImage.pageNumber === image.pageNumber),
              ),
              ...savedImages,
            ].sort((a, b) => a.pageNumber - b.pageNumber)

            return {
              ...currentDocument,
              imageCount: nextImages.length,
              images: nextImages,
            }
          })
          setCaptureStatus(`Captured ${savedImages.length} page${savedImages.length === 1 ? '' : 's'} for chatbot responses.`)
        }
      } catch (captureError) {
        if (!isCancelled) {
          setCaptureStatus(captureError.message || 'Document page capture failed.')
        }
      }
    }

    captureDocumentPages()

    return () => {
      isCancelled = true
    }
  }, [selectedDocument?.id, selectedDocument?.imageCount, selectedDocument?.previewFileUrl])

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
    setCaptureStatus('')
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
    setCaptureStatus('')
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
                    <h4>Original Document Preview</h4>
                    {selectedDocument.previewFileUrl ? (
                      <div className="document-original-preview">
                        <iframe
                          title={`${selectedDocument.title} file preview`}
                          src={`${getFileUrl(selectedDocument.previewFileUrl)}#zoom=125&view=FitH`}
                        />
                      </div>
                    ) : (
                      <div className="document-image-empty">
                        {selectedDocument.previewError || 'Original document preview is not available for this file.'}
                      </div>
                    )}
                    {captureStatus && <p className="document-capture-status">{captureStatus}</p>}
                  </section>

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
