import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminSidebar from '../components/AdminSidebar'
import AdminTopbar from '../components/AdminTopbar'
import ChatLogsPage from './ChatLogsPage'
import DocumentsPage from './DocumentsPage'
import UploadDocumentPage from './UploadDocumentPage'
import UsersPage from './UsersPage'
import { logout } from '../../services/authService'

function AdminDashboard() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('documents')
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <main className="nexus-admin-shell">
      <AdminSidebar activeView={activeView} onViewChange={setActiveView} />

      <section className="nexus-admin-workspace">
        <AdminTopbar
          isProfileOpen={isProfileOpen}
          onProfileToggle={() => setIsProfileOpen((current) => !current)}
          onLogout={handleLogout}
        />

        <div className="p-4 sm:p-6">
          {activeView === 'documents' && <DocumentsPage onUpload={() => setActiveView('upload')} />}
          {activeView === 'chatLogs' && <ChatLogsPage />}
          {activeView === 'users' && <UsersPage />}
          {activeView === 'upload' && <UploadDocumentPage />}
        </div>
      </section>
    </main>
  )
}

export default AdminDashboard
