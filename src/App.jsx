import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AdminDashboard from './admin/pages/AdminDashboard'
import Login from './admin/pages/Login'
import Chatbot from './frontend/pages/Chatbot'
import { clearStoredSession, getStoredTokenExpiresAt, isLoggedIn } from './services/apiClient'
import './App.css'

function ProtectedAdmin() {
  const [hasValidSession, setHasValidSession] = useState(() => isLoggedIn())

  useEffect(() => {
    function endSession() {
      clearStoredSession()
      setHasValidSession(false)
    }

    function checkSession() {
      const validSession = isLoggedIn()
      setHasValidSession(validSession)

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

  return <AdminDashboard />
}

function RootEntry() {
  const location = useLocation()
  const hasMicrosoftCallback = /code=|state=|error=|id_token=|access_token=/.test(`${location.search}${location.hash}`)

  if (hasMicrosoftCallback) {
    return <Login />
  }

  return <Navigate to="/chatbot" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootEntry />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedAdmin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
