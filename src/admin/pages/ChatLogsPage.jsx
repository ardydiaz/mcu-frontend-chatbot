import BootstrapDataTable from '../components/BootstrapDataTable'
import { StatusBadge } from '../components/Badges'
import { conversations } from '../data/mockAdminData'

function ChatLogsPage({ compact = false }) {
  const visibleRows = compact ? conversations.slice(0, 3) : conversations

  return (
    <article className={`rounded-lg border border-[#ffc52f]/20 bg-white/10 p-5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur ${compact ? '' : 'xl:col-span-full'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#ffc52f]">Activity</p>
          <h3 className="m-0 text-xl font-bold text-white">{compact ? 'Recent Questions' : 'Chat Logs'}</h3>
        </div>
        {!compact && (
          <button className="rounded-lg bg-[#ffc52f] px-4 py-3 font-extrabold text-[#2a003f]" type="button">
            Flag Low Confidence
          </button>
        )}
      </div>

      <BootstrapDataTable
        columns={[
          { key: 'id', label: 'ID', className: 'fw-semibold' },
          { key: 'question', label: 'Question', className: 'fw-bold' },
          { key: 'intent', label: 'Intent' },
          { key: 'confidence', label: 'Confidence', className: 'fw-bold text-[#ffc52f]' },
          { key: 'status', label: 'Status', render: (conversation) => <StatusBadge value={conversation.status} /> },
          {
            key: 'action',
            label: 'Action',
            headerClassName: 'text-end',
            className: 'text-end',
            render: () => (
              <button className="btn btn-sm btn-outline-warning" type="button">
                Open
              </button>
            ),
          },
        ]}
        rows={visibleRows}
        emptyMessage="No chat logs found."
      />
    </article>
  )
}

export default ChatLogsPage
