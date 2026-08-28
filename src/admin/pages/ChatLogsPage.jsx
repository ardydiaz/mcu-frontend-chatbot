import { useEffect, useMemo, useState } from 'react'
import { fetchChatLogs } from '../services/chatLogService'
import { primaryButtonClass, smallButtonClass } from '../ui/classes'

const PAGE_SIZE = 12

function getInitials(name) {
  return String(name || 'Guest')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'G'
}

function ChatLogsPage({ compact = false }) {
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const totalUsers = useMemo(
    () => new Set(logs.map((log) => log.userEmail || log.userName).filter(Boolean)).size,
    [logs],
  )
  const guestCount = useMemo(
    () => logs.filter((log) => log.userSource === 'guest').length,
    [logs],
  )

  async function loadLogs({ page = pagination.page, query = appliedSearch } = {}) {
    setIsLoading(true)
    setError('')

    try {
      const data = await fetchChatLogs({ page, pageSize: compact ? 5 : PAGE_SIZE, search: query })
      setLogs(data.logs)
      setPagination(data.pagination)
    } catch (requestError) {
      setError(requestError.message || 'Unable to load chat logs.')
      setLogs([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isCurrentRequest = true

    fetchChatLogs({ page: 1, pageSize: compact ? 5 : PAGE_SIZE })
      .then((data) => {
        if (isCurrentRequest) {
          setLogs(data.logs)
          setPagination(data.pagination)
          setError('')
        }
      })
      .catch((requestError) => {
        if (isCurrentRequest) {
          setError(requestError.message || 'Unable to load chat logs.')
          setLogs([])
        }
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsLoading(false)
        }
      })

    return () => {
      isCurrentRequest = false
    }
  }, [compact])

  function handleSearchSubmit(event) {
    event.preventDefault()
    setAppliedSearch(search)
    loadLogs({ page: 1, query: search })
  }

  return (
    <section className="grid gap-5">
      <article className="rounded-2xl border border-[#642B87]/12 bg-white p-5 text-[#241433] shadow-[0_18px_50px_rgba(48,0,69,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FFBA2E]">Activity Monitor</p>
            <h3 className="m-0 text-2xl font-black text-[#300045]">{compact ? 'Recent Questions' : 'Chat History'}</h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Review chatbot questions, user identity, response previews, and recent student activity.
            </p>
          </div>

          {!compact && (
            <form className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[360px] sm:flex-row" onSubmit={handleSearchSubmit}>
              <input
                className="min-h-11 flex-1 rounded-xl border border-[#642B87]/20 px-4 text-sm font-semibold outline-none transition focus:border-[#642B87] focus:ring-4 focus:ring-[#642B87]/10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search question, response, user..."
              />
              <button className={primaryButtonClass} type="submit">Search</button>
            </form>
          )}
        </div>

        {!compact && (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[#642B87]/10 bg-[#300045] p-4 text-white">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-[#FFBA2E]">Total Logs</span>
              <strong className="mt-2 block text-3xl">{pagination.total}</strong>
            </div>
            <div className="rounded-xl border border-[#642B87]/10 bg-[#642B87]/8 p-4">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-[#642B87]">Users In View</span>
              <strong className="mt-2 block text-3xl text-[#300045]">{totalUsers}</strong>
            </div>
            <div className="rounded-xl border border-[#FFBA2E]/30 bg-[#FFBA2E]/15 p-4">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-[#642B87]">Guest Rows</span>
              <strong className="mt-2 block text-3xl text-[#300045]">{guestCount}</strong>
            </div>
          </div>
        )}
      </article>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3">
        {isLoading && (
          <div className="rounded-2xl border border-[#642B87]/12 bg-white p-6 text-center text-sm font-bold text-[#642B87]">
            Loading chat logs...
          </div>
        )}

        {!isLoading && logs.length === 0 && (
          <div className="rounded-2xl border border-[#642B87]/12 bg-white p-6 text-center text-sm font-bold text-slate-500">
            No chat logs found.
          </div>
        )}

        {!isLoading && logs.map((log) => (
          <article
            className="rounded-2xl border border-[#642B87]/12 bg-white p-4 shadow-[0_14px_40px_rgba(48,0,69,0.06)] transition hover:-translate-y-0.5 hover:border-[#FFBA2E]/50"
            key={log.id}
          >
            <div className="grid gap-4 lg:grid-cols-[240px_1fr_auto] lg:items-center">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFBA2E]/25 text-sm font-black text-[#642B87]">
                  {getInitials(log.userName)}
                </span>
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-[#300045]">{log.userName}</strong>
                  <span className="block truncate text-xs font-semibold text-slate-500">{log.userEmail || log.userRole}</span>
                  <span className="mt-1 inline-flex rounded-full bg-[#642B87]/10 px-2 py-0.5 text-[0.68rem] font-black uppercase tracking-wide text-[#642B87]">
                    {log.userSource}
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                <p className="m-0 text-sm font-black text-[#300045]">{log.messagePreview || 'No question text'}</p>
                <p className="m-0 text-sm leading-6 text-slate-600">{log.responsePreview || 'No response text'}</p>
                <span className="text-xs font-semibold text-slate-400">{log.createdAt}</span>
              </div>

              <button className={smallButtonClass} type="button" onClick={() => setSelectedLog(log)}>
                Open
              </button>
            </div>
          </article>
        ))}
      </div>

      {!compact && pagination.totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#642B87]/12 bg-white p-4 sm:flex-row">
          <span className="text-sm font-bold text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className={smallButtonClass}
              type="button"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => loadLogs({ page: pagination.page - 1 })}
            >
              Previous
            </button>
            <button
              className={smallButtonClass}
              type="button"
              disabled={pagination.page >= pagination.totalPages || isLoading}
              onClick={() => loadLogs({ page: pagination.page + 1 })}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedLog && (
        <div className="fixed inset-0 z-[220] grid place-items-center bg-[#300045]/40 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setSelectedLog(null)}>
          <section
            className="max-h-[88vh] w-full max-w-4xl overflow-auto rounded-2xl border border-[#FFBA2E]/35 bg-white p-5 shadow-[0_30px_90px_rgba(48,0,69,0.25)]"
            role="dialog"
            aria-modal="true"
            aria-label="Chat log details"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FFBA2E]">Conversation Detail</p>
                <h3 className="m-0 text-xl font-black text-[#300045]">{selectedLog.userName}</h3>
                <p className="m-0 text-sm font-semibold text-slate-500">{selectedLog.userEmail || selectedLog.userRole} • {selectedLog.createdAt}</p>
              </div>
              <button className={smallButtonClass} type="button" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>

            <div className="grid gap-4">
              <div className="rounded-xl bg-[#300045] p-4 text-white">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[#FFBA2E]">Student Question</p>
                <p className="m-0 whitespace-pre-wrap text-sm leading-7">{selectedLog.message}</p>
              </div>
              <div className="rounded-xl border border-[#642B87]/12 bg-slate-50 p-4">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[#642B87]">Centralino Virtual Assistant Response</p>
                <p className="m-0 whitespace-pre-wrap text-sm leading-7 text-slate-700">{selectedLog.response}</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default ChatLogsPage
