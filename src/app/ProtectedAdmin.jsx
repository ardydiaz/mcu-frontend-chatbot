import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AdminDashboard from '../admin/pages/AdminDashboard'
import { clearStoredSession, getStoredTokenExpiresAt, hasAdminAccess, isLoggedIn } from '../services/apiClient'

function ProtectedAdmin() {
  const [hasValidSession, setHasValidSession] = useState(() => isLoggedIn())
  const [hasValidAdminAccess, setHasValidAdminAccess] = useState(() => hasAdminAccess())

  useEffect(() => {
    function endSession() {
      clearStoredSession()
      setHasValidSession(false)
      setHasValidAdminAccess(false)
    }

    function checkSession() {
      const validSession = isLoggedIn()
      const validAdminAccess = hasAdminAccess()
      setHasValidSession(validSession)
      setHasValidAdminAccess(validAdminAccess)

      if (!validSession) {
        return null
      }

      const expiresAt = getStoredTokenExpiresAt()

      if (!expiresAt) {
        endSession()
        return null
      }

      return window.setTimeout(endSession, Math.max(expiresAt - Date.now(), 0))
    }

    let expiryTimeoutId = checkSession()
    const refreshSessionCheck = () => {
      if (expiryTimeoutId) {
        window.clearTimeout(expiryTimeoutId)
      }

      expiryTimeoutId = checkSession()
    }
    const intervalId = window.setInterval(refreshSessionCheck, 60000)

    window.addEventListener('focus', refreshSessionCheck)
    document.addEventListener('visibilitychange', refreshSessionCheck)

    return () => {
      if (expiryTimeoutId) {
        window.clearTimeout(expiryTimeoutId)
      }

      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshSessionCheck)
      document.removeEventListener('visibilitychange', refreshSessionCheck)
    }
  }, [])

  if (!hasValidSession) {
    return <Navigate to="/login" replace />
  }

  if (!hasValidAdminAccess) {
    return <Navigate to="/chatbot" replace />
  }

  return <AdminDashboard />
}

export default ProtectedAdmin

