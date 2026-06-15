import { useEffect, useMemo, useState } from 'react'
import { PublicClientApplication } from '@azure/msal-browser'
import { useNavigate, useSearchParams } from 'react-router-dom'

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123',
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const MICROSOFT_AUTH_PATH = import.meta.env.VITE_MICROSOFT_AUTH_PATH || '/api/auth/microsoft'
const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID || ''
const MICROSOFT_AUTHORITY = import.meta.env.VITE_MICROSOFT_AUTHORITY || 'https://login.microsoftonline.com/common'
const MICROSOFT_REDIRECT_URI = import.meta.env.VITE_MICROSOFT_REDIRECT_URI || `${window.location.origin}/`

function getMicrosoftAuthUrl() {
  return new URL(MICROSOFT_AUTH_PATH, API_BASE_URL).toString()
}

function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isMicrosoftReady, setIsMicrosoftReady] = useState(false)
  const msalInstance = useMemo(() => {
    if (!MICROSOFT_CLIENT_ID) {
      return null
    }

    return new PublicClientApplication({
      auth: {
        clientId: MICROSOFT_CLIENT_ID,
        authority: MICROSOFT_AUTHORITY,
        redirectUri: MICROSOFT_REDIRECT_URI,
      },
      cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false,
      },
    })
  }, [])

  useEffect(() => {
    let active = true

    async function initializeAndHandleMicrosoftAuth() {
      if (!msalInstance) {
        return
      }

      try {
        await msalInstance.initialize()

        if (!active) {
          return
        }

        setIsMicrosoftReady(true)

        const result = await msalInstance.handleRedirectPromise()

        if (!active || !result?.idToken) {
          return
        }
        console.log('Microsoft redirect result:', result)
        console.log('Microsoft idToken:', result.idToken)

        setAuthMessage('Signing you in with Microsoft 365...')

        const response = await fetch(getMicrosoftAuthUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: result.idToken,
          }),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.message || 'Microsoft sign-in failed.')
        }

        localStorage.setItem('mcuAdminLoggedIn', 'true')

        if (data.token || data.accessToken) {
          localStorage.setItem('mcuAdminToken', data.token || data.accessToken)
        }

        navigate('/admin', { replace: true })
      } catch (msalError) {
        if (active) {
          setError(msalError.message || 'Microsoft sign-in failed to initialize.')
          setIsMicrosoftReady(false)
          setIsSigningIn(false)
          setAuthMessage('')
        }
      }
    }

    initializeAndHandleMicrosoftAuth()

    return () => {
      active = false
    }
  }, [msalInstance, navigate])

  useEffect(() => {
    const token = searchParams.get('token') || searchParams.get('accessToken')
    const microsoftSuccess = searchParams.get('microsoft') === 'success' || searchParams.get('auth') === 'success'

    if (token || microsoftSuccess) {
      localStorage.setItem('mcuAdminLoggedIn', 'true')

      if (token) {
        localStorage.setItem('mcuAdminToken', token)
      }

      navigate('/admin', { replace: true })
    }
  }, [navigate, searchParams])

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
    if (!msalInstance) {
      setError('Missing Microsoft client ID. Set VITE_MICROSOFT_CLIENT_ID in your .env file.')
      return
    }

    if (!isMicrosoftReady) {
      setError('Microsoft sign-in is still loading. Please try again in a moment.')
      return
    }

    setError('')
    setAuthMessage('Redirecting to Microsoft 365...')
    setIsSigningIn(true)

    msalInstance.loginRedirect({
      scopes: ['openid', 'profile', 'email'],
    })
      .catch((loginError) => {
        setError(loginError.message || 'Microsoft sign-in failed.')
        setAuthMessage('')
        setIsSigningIn(false)
      })
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
          {authMessage && <p className="form-note">{authMessage}</p>}

          <button type="submit">Sign In</button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button className="ms365-button" type="button" onClick={handleMicrosoftSignIn} disabled={isSigningIn || !isMicrosoftReady}>
          <span className="microsoft-mark" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </span>
          {!isMicrosoftReady
            ? 'Loading Microsoft sign-in...'
            : isSigningIn
              ? 'Connecting to Microsoft 365...'
              : 'Sign in with Microsoft 365'}
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
