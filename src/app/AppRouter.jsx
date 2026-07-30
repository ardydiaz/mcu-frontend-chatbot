import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Login from '../admin/pages/Login'
import Chatbot from '../frontend/pages/Chatbot'
import ProtectedAdmin from './ProtectedAdmin'

function RootEntry() {
  const location = useLocation()
  const hasMicrosoftCallback = /code=|state=|error=|id_token=|access_token=/.test(`${location.search}${location.hash}`)

  if (hasMicrosoftCallback) {
    return <Login />
  }

  return <Navigate to="/chatbot" replace />
}

function AppRouter() {
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

export default AppRouter

