import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123',
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    const isDefaultAdmin =
      username.trim() === DEFAULT_ADMIN.username && password === DEFAULT_ADMIN.password

    if (!isDefaultAdmin) {
      setError('Invalid admin username or password.')
      return
    }

    localStorage.setItem('mcuAdminLoggedIn', 'true')
    navigate('/admin')
  }

  function handleMicrosoftSignIn() {
    window.location.href = `${API_BASE_URL}/auth/microsoft`
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-lockup login-brand">
          <div className="flame-mark" aria-hidden="true">
            <span className="flame flame-gold"></span>
            <span className="flame flame-red"></span>
            <span className="flame flame-purple"></span>
          </div>
          <div>
            <p className="eyebrow">MCU University</p>
            <h1>Admin Login</h1>
          </div>
        </div>

        <form className="stack-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="admin123"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit">Sign In</button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button className="ms365-button" type="button" onClick={handleMicrosoftSignIn}>
          <span className="microsoft-mark" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </span>
          Sign in with Microsoft 365
        </button>

        <div className="default-login-note">
          <span>Default admin</span>
          <strong>admin / admin123</strong>
        </div>
      </section>
    </main>
  )
}

export default Login
