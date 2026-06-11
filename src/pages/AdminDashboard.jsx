import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const metrics = [
  { label: 'Total Documents', value: '128', change: '+14 this month', tone: 'gold' },
  { label: 'Pending Review', value: '7', change: 'Needs approval', tone: 'pink' },
  { label: 'Conversations', value: '342', change: 'Today', tone: 'cyan' },
  { label: 'Answer Accuracy', value: '94%', change: '+3.2% vs last week', tone: 'lime' },
]

const documents = [
  {
    id: 'DOC-2026-001',
    title: 'Enrollment Guidelines 2026',
    owner: 'Registrar Office',
    status: 'Published',
    type: 'PDF',
    date: 'Jun 11, 2026',
  },
  {
    id: 'DOC-2026-002',
    title: 'Scholarship FAQ',
    owner: 'Admissions',
    status: 'Review',
    type: 'DOCX',
    date: 'Jun 10, 2026',
  },
  {
    id: 'DOC-2026-003',
    title: 'Student Handbook',
    owner: 'Student Affairs',
    status: 'Draft',
    type: 'PDF',
    date: 'Jun 8, 2026',
  },
  {
    id: 'DOC-2026-004',
    title: 'Tuition Payment Channels',
    owner: 'Finance Office',
    status: 'Published',
    type: 'PDF',
    date: 'Jun 7, 2026',
  },
  {
    id: 'DOC-2026-005',
    title: 'Clinic Appointment Process',
    owner: 'Health Services',
    status: 'Review',
    type: 'TXT',
    date: 'Jun 6, 2026',
  },
  {
    id: 'DOC-2026-006',
    title: 'Library Borrowing Policy',
    owner: 'Library',
    status: 'Published',
    type: 'DOCX',
    date: 'Jun 5, 2026',
  },
  {
    id: 'DOC-2026-007',
    title: 'Campus Wi-Fi Access Guide',
    owner: 'IT Department',
    status: 'Draft',
    type: 'PDF',
    date: 'Jun 4, 2026',
  },
  {
    id: 'DOC-2026-008',
    title: 'Graduation Clearance Checklist',
    owner: 'Registrar Office',
    status: 'Published',
    type: 'PDF',
    date: 'Jun 3, 2026',
  },
]

const conversations = [
  {
    id: 'CHAT-001',
    question: 'How do I request my TOR?',
    intent: 'Registrar',
    confidence: '98%',
    status: 'Resolved',
  },
  {
    id: 'CHAT-002',
    question: 'When is enrollment for freshmen?',
    intent: 'Admissions',
    confidence: '95%',
    status: 'Resolved',
  },
  {
    id: 'CHAT-003',
    question: 'Where can I pay tuition?',
    intent: 'Finance',
    confidence: '91%',
    status: 'Resolved',
  },
  {
    id: 'CHAT-004',
    question: 'Can I enroll without clearance?',
    intent: 'Registrar',
    confidence: '64%',
    status: 'Flagged',
  },
]

const users = [
  {
    id: 'USR-001',
    name: 'Maria Santos',
    role: 'Registrar Admin',
    access: 'Documents, Chat Logs',
    status: 'Active',
  },
  {
    id: 'USR-002',
    name: 'John Reyes',
    role: 'Admissions Staff',
    access: 'Documents',
    status: 'Active',
  },
  {
    id: 'USR-003',
    name: 'Ana Cruz',
    role: 'Super Admin',
    access: 'All modules',
    status: 'Active',
  },
  {
    id: 'USR-004',
    name: 'Paolo Lim',
    role: 'Finance Staff',
    access: 'Chat Logs',
    status: 'Pending',
  },
]

const navItems = [
  { label: 'Dashboard', view: 'dashboard' },
  { label: 'Documents', view: 'documents' },
  { label: 'Chat Logs', view: 'chatLogs' },
  { label: 'Users', view: 'users' },
  { label: 'Settings', view: 'settings' },
]

const viewLabels = {
  dashboard: 'Dashboard',
  documents: 'Documents',
  chatLogs: 'Chat Logs',
  users: 'Users',
  settings: 'Settings',
  upload: 'Upload Document',
  faq: 'Add FAQ Answer',
  review: 'Flagged Chats',
  createUser: 'Create Admin User',
}

const PAGE_SIZE = 5

function fetchDocumentsFromMockServer({ page, pageSize, search, status }) {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      const normalizedSearch = search.trim().toLowerCase()
      const filteredDocuments = documents.filter((document) => {
        const matchesSearch = [document.id, document.title, document.owner, document.type]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
        const matchesStatus = status === 'All' || document.status === status

        return matchesSearch && matchesStatus
      })
      const startIndex = (page - 1) * pageSize

      resolve({
        rows: filteredDocuments.slice(startIndex, startIndex + pageSize),
        total: filteredDocuments.length,
      })
    }, 350)
  })
}

function AdminDashboard() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('dashboard')
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  function handleLogout() {
    localStorage.removeItem('mcuAdminLoggedIn')
    navigate('/login')
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand-lockup">
          <div className="flame-mark" aria-hidden="true">
            <span className="flame flame-gold"></span>
            <span className="flame flame-red"></span>
            <span className="flame flame-purple"></span>
          </div>
          <div>
            <p className="eyebrow">MCU University</p>
            <h1>Admin Panel</h1>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {navItems.map((item) => (
            <button
              className={activeView === item.view ? 'active' : ''}
              type="button"
              key={item.view}
              onClick={() => setActiveView(item.view)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section className="admin-help">
          <p className="panel-label">System Status</p>
          <strong>Chatbot is online</strong>
          <span>Knowledge base synced 8 minutes ago</span>
        </section>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar">
          <div className="topbar-title">
            <p className="eyebrow">Knowledge Base Control Center</p>
            <strong>{viewLabels[activeView]}</strong>
          </div>

          <div className="admin-profile">
            <button
              className="avatar-profile"
              type="button"
              aria-label="Open admin profile menu"
              aria-expanded={isProfileOpen}
              onClick={() => setIsProfileOpen((current) => !current)}
            >
              AD
            </button>
            {isProfileOpen && (
              <div className="profile-dropdown">
                <div className="profile-card-head">
                  <div className="avatar-profile large" aria-hidden="true">
                    AD
                  </div>
                  <div>
                    <strong>Admin User</strong>
                    <span>admin@mcu.edu.ph</span>
                  </div>
                </div>
                <button type="button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {activeView === 'dashboard' && (
          <>
            <MetricGrid />
            <section className="admin-grid">
              <DocumentsPanel onViewAll={() => setActiveView('documents')} compact />
              <ChatLogsPanel compact />
              <QuickActions onSelect={setActiveView} />
            </section>
          </>
        )}

        {activeView === 'documents' && <DocumentsPanel onUpload={() => setActiveView('upload')} />}
        {activeView === 'chatLogs' && <ChatLogsPanel />}
        {activeView === 'users' && <UsersPanel />}
        {activeView === 'settings' && <SettingsPanel />}
        {activeView === 'upload' && <UploadPanel />}
        {activeView === 'faq' && <FaqPanel />}
        {activeView === 'review' && <ReviewPanel />}
        {activeView === 'createUser' && <CreateUserPanel />}
      </section>
    </main>
  )
}

function MetricGrid() {
  return (
    <section className="admin-metrics" aria-label="Dashboard metrics">
      {metrics.map((metric) => (
        <article className={`admin-metric ${metric.tone}`} key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <p>{metric.change}</p>
        </article>
      ))}
    </section>
  )
}

function DocumentsPanel({ compact = false, onViewAll, onUpload }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const queryKey = `${page}|${search}|${status}`
  const [serverData, setServerData] = useState({ rows: [], total: 0, queryKey: '' })
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

    fetchDocumentsFromMockServer({
      page,
      pageSize: PAGE_SIZE,
      search,
      status,
    }).then((data) => {
      if (isCurrentRequest) {
        setServerData({ ...data, queryKey })
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
    <article className={`admin-card ${compact ? 'documents-card' : 'wide-card'}`}>
      <div className="card-header">
        <div>
          <p className="panel-label">Knowledge Base</p>
          <h3>{compact ? 'Recent Documents' : 'Document Management'}</h3>
        </div>
        <div className="card-actions">
          {compact && (
            <button type="button" onClick={onViewAll}>
              View All
            </button>
          )}
          {!compact && (
            <button type="button" onClick={onUpload}>
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
          { key: 'id', label: 'ID', className: 'text-muted fw-semibold' },
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
              <button className="btn btn-sm btn-outline-primary" type="button">
                View
              </button>
            ),
          },
        ]}
        rows={visibleRows}
        isLoading={isLoading}
        emptyMessage="No documents found for this filter."
      />

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

function ChatLogsPanel({ compact = false }) {
  const visibleRows = compact ? conversations.slice(0, 3) : conversations

  return (
    <article className={`admin-card ${compact ? '' : 'wide-card'}`}>
      <div className="card-header">
        <div>
          <p className="panel-label">Activity</p>
          <h3>{compact ? 'Recent Questions' : 'Chat Logs'}</h3>
        </div>
        {!compact && <button type="button">Flag Low Confidence</button>}
      </div>

      <BootstrapDataTable
        columns={[
          { key: 'id', label: 'ID', className: 'text-muted fw-semibold' },
          { key: 'question', label: 'Question', className: 'fw-bold' },
          { key: 'intent', label: 'Intent' },
          { key: 'confidence', label: 'Confidence', className: 'text-info fw-bold' },
          { key: 'status', label: 'Status', render: (conversation) => <StatusBadge value={conversation.status} /> },
          {
            key: 'action',
            label: 'Action',
            headerClassName: 'text-end',
            className: 'text-end',
            render: () => (
              <button className="btn btn-sm btn-outline-primary" type="button">
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

function QuickActions({ onSelect }) {
  return (
    <article className="admin-card quick-actions-card">
      <p className="panel-label">Quick Actions</p>
      <h3>Admin Tasks</h3>
      <div className="quick-actions">
        <button type="button" onClick={() => onSelect('faq')}>
          Add FAQ Answer
        </button>
        <button type="button" onClick={() => onSelect('review')}>
          Review Flagged Chat
        </button>
        <button type="button" onClick={() => onSelect('createUser')}>
          Create Admin User
        </button>
      </div>
    </article>
  )
}

function UsersPanel() {
  return (
    <article className="admin-card wide-card">
      <div className="card-header">
        <div>
          <p className="panel-label">Access Control</p>
          <h3>Admin Users</h3>
        </div>
        <button type="button">Invite User</button>
      </div>
      <BootstrapDataTable
        columns={[
          { key: 'id', label: 'ID', className: 'text-muted fw-semibold' },
          { key: 'name', label: 'Name', className: 'fw-bold' },
          { key: 'role', label: 'Role' },
          { key: 'access', label: 'Access' },
          { key: 'status', label: 'Status', render: (user) => <StatusBadge value={user.status} /> },
          {
            key: 'action',
            label: 'Action',
            headerClassName: 'text-end',
            className: 'text-end',
            render: () => (
              <button className="btn btn-sm btn-outline-primary" type="button">
                Edit
              </button>
            ),
          },
        ]}
        rows={users}
        emptyMessage="No admin users found."
      />
    </article>
  )
}

function BootstrapDataTable({ columns, rows, isLoading = false, emptyMessage }) {
  return (
    <div className={`bootstrap-datatable table-responsive ${isLoading ? 'is-loading' : ''}`}>
      <table className="table table-hover table-striped align-middle mb-0">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.headerClassName} scope="col" key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td className={column.className} key={column.key}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
          {!isLoading && rows.length === 0 && (
            <tr>
              <td className="text-center text-muted py-4" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function TypeBadge({ value }) {
  return <span className="badge text-bg-light border">{value}</span>
}

function StatusBadge({ value }) {
  return <span className={`badge document-status ${value.toLowerCase()}`}>{value}</span>
}

function SettingsPanel() {
  return (
    <article className="admin-card wide-card">
      <p className="panel-label">Configuration</p>
      <h3>System Settings</h3>
      <div className="settings-grid">
        <label>
          Microsoft 365 SSO
          <select defaultValue="enabled">
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
        <label>
          Chatbot Tone
          <select defaultValue="formal">
            <option value="formal">Formal and helpful</option>
            <option value="friendly">Friendly and concise</option>
          </select>
        </label>
        <label>
          Confidence Threshold
          <input type="range" min="60" max="100" defaultValue="85" />
        </label>
      </div>
    </article>
  )
}

function UploadPanel() {
  return (
    <article className="admin-card wide-card">
      <p className="panel-label">Document Intake</p>
      <h3>Upload Document</h3>
      <div className="upload-dropzone">
        <strong>Drop PDF, DOCX, or TXT files here</strong>
        <span>Files will be queued for admin review before publishing.</span>
        <button type="button">Choose File</button>
      </div>
    </article>
  )
}

function FaqPanel() {
  return (
    <article className="admin-card wide-card">
      <p className="panel-label">Answer Builder</p>
      <h3>Add FAQ Answer</h3>
      <form className="mock-form">
        <input type="text" placeholder="Question title" />
        <textarea rows="5" placeholder="Approved chatbot answer" />
        <button type="button">Save Draft</button>
      </form>
    </article>
  )
}

function ReviewPanel() {
  return (
    <article className="admin-card wide-card">
      <p className="panel-label">Human Review</p>
      <h3>Flagged Chats</h3>
      <div className="review-card">
        <span>Low confidence answer</span>
        <strong>Student asked: Can I enroll without clearance?</strong>
        <p>Suggested action: assign to Registrar Office for verified response.</p>
      </div>
    </article>
  )
}

function CreateUserPanel() {
  return (
    <article className="admin-card wide-card">
      <p className="panel-label">User Management</p>
      <h3>Create Admin User</h3>
      <form className="mock-form">
        <input type="text" placeholder="Full name" />
        <input type="email" placeholder="MCU email address" />
        <select defaultValue="staff">
          <option value="staff">Staff Admin</option>
          <option value="super">Super Admin</option>
        </select>
        <button type="button">Create Account</button>
      </form>
    </article>
  )
}

export default AdminDashboard
