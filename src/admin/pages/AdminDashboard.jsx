import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminSidebar from '../components/AdminSidebar'
import AdminTopbar from '../components/AdminTopbar'
import ChatLogsPage from './ChatLogsPage'
import DocumentsPage from './DocumentsPage'
import EmbedGeneratorPage from './EmbedGeneratorPage'
import ScopeManagementPage from './ScopeManagementPage'
import UploadDocumentPage from './UploadDocumentPage'
import UsersPage from './UsersPage'
import WebsiteAccessPage from './WebsiteAccessPage'
import { logout } from '../../services/authService'
import { getStoredTokenPayload, getStoredUser } from '../../services/apiClient'

function AdminDashboard() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('documents')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [documentRefreshKey, setDocumentRefreshKey] = useState(0)
  const currentUser = useMemo(() => getStoredUser() || getStoredTokenPayload() || null, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <main className="nexus-admin-shell">
      <AdminSidebar activeView={activeView} onViewChange={setActiveView} onLogout={handleLogout} />

      <section className="nexus-admin-workspace">
        <AdminTopbar
          currentUser={currentUser}
          isProfileOpen={isProfileOpen}
          onProfileToggle={() => setIsProfileOpen((current) => !current)}
          onLogout={handleLogout}
        />

        <div className="p-4 sm:p-6">
          {activeView === 'documents' && (
            <DocumentsPage
              onUpload={() => setIsUploadModalOpen(true)}
              refreshKey={documentRefreshKey}
            />
          )}
          {activeView === 'embedGenerator' && <EmbedGeneratorPage />}
          {activeView === 'websiteAccess' && <WebsiteAccessPage />}
          {activeView === 'scopeManagement' && <ScopeManagementPage />}
          {activeView === 'chatLogs' && <ChatLogsPage />}
          {activeView === 'users' && <UsersPage />}
        </div>

        {isUploadModalOpen && (
          <div className="upload-modal-backdrop" role="presentation" onMouseDown={() => setIsUploadModalOpen(false)}>
            <div
              className="upload-modal-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Upload document"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <UploadDocumentPage
                isModal
                onClose={() => setIsUploadModalOpen(false)}
                onUploaded={() => setDocumentRefreshKey((current) => current + 1)}
              />
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default AdminDashboard


