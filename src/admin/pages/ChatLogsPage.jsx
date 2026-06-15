import BootstrapDataTable from '../components/BootstrapDataTable'
import { StatusBadge } from '../components/Badges'
import { conversations } from '../data/mockAdminData'

function ChatLogsPage({ compact = false }) {
  const visibleRows = compact ? conversations.slice(0, 3) : conversations

  return (
    <article className={`rounded-2xl border border-[#5c297c]/12 bg-white p-5 text-[#241433] shadow-[0_18px_50px_rgba(42,0,63,0.08)] ${compact ? '' : 'xl:col-span-full'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0a733]">Activity</p>
          <h3 className="m-0 text-xl font-bold text-[#3b0a57]">{compact ? 'Recent Questions' : 'Chat Logs'}</h3>
        </div>
        {!compact && (
          <button className="rounded-lg bg-[#ffc52f] px-4 py-3 font-extrabold text-[#2a003f] shadow-[0_10px_20px_rgba(255,197,47,0.24)]" type="button">
            Flag Low Confidence
          </button>
        )}
      </div>

      <BootstrapDataTable
        columns={[
          { key: 'id', label: 'ID', className: 'fw-semibold' },
          { key: 'question', label: 'Question', className: 'fw-bold' },
          { key: 'intent', label: 'Intent' },
          { key: 'confidence', label: 'Confidence', className: 'fw-bold text-[#5c297c]' },
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
