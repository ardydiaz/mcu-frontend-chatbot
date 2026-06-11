import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminDashboard from './pages/AdminDashboard'
import Chatbot from './pages/Chatbot'
import Login from './pages/Login'
import './App.css'

function ProtectedAdmin() {
  const isAdminLoggedIn = localStorage.getItem('mcuAdminLoggedIn') === 'true'

  if (!isAdminLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return <AdminDashboard />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/chatbot" replace />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedAdmin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
