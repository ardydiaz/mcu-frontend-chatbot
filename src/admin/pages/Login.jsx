import { useEffect, useMemo, useState } from 'react'
import { PublicClientApplication } from '@azure/msal-browser'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setStoredSession } from '../../services/apiClient'
import { microsoftButtonClass } from '../ui/classes'
import mcuLogoPurple from '../../assets/mcu-logo-purple.png'
import mcuSmallLogo from '../../assets/mcu-sm-logo.png'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const MICROSOFT_AUTH_PATH = import.meta.env.VITE_MICROSOFT_AUTH_PATH || '/api/auth/microsoft'
const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID || ''
const MICROSOFT_AUTHORITY = import.meta.env.VITE_MICROSOFT_AUTHORITY || 'https://login.microsoftonline.com/common'
const MICROSOFT_REDIRECT_URI = import.meta.env.VITE_MICROSOFT_REDIRECT_URI || `${window.location.origin}/`
const MICROSOFT_LOGIN_SCOPES = ['openid', 'profile', 'email', 'User.Read']
const MICROSOFT_RETURN_PATH_KEY = 'mcuMicrosoftReturnPath'
const CHATBOT_LOGIN_TOAST_KEY = 'mcuChatbotLoginToast'
const GUEST_MESSAGE_COUNT_KEY = 'mcuGuestMessageCount'

function getMicrosoftUnavailableMessage() {
  if (!MICROSOFT_CLIENT_ID) {
    return 'Missing Microsoft client ID. Set VITE_MICROSOFT_CLIENT_ID in your .env file.'
  }

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'Microsoft 365 sign-in requires HTTPS in production. Use a domain with SSL, or localhost for local testing.'
  }

  return ''
}

function getMicrosoftAuthUrl() {
  return new URL(MICROSOFT_AUTH_PATH, API_BASE_URL).toString()
}

function clearMicrosoftInteractionState() {
  if (!MICROSOFT_CLIENT_ID) {
    return
  }

  ;[sessionStorage, localStorage].forEach((storage) => {
    Object.keys(storage)
      .filter((key) => {
        const normalizedKey = key.toLowerCase()

        return (
          normalizedKey.includes('interaction.status') ||
          normalizedKey === `msal.${MICROSOFT_CLIENT_ID.toLowerCase()}.interaction.status`
        )
      })
      .forEach((key) => storage.removeItem(key))
  })
}

function isStaleMicrosoftCallbackError(error) {
  const errorCode = String(error?.errorCode || '')
  const message = String(error?.message || '')

  return errorCode === 'no_token_request_cache_error' || message.includes('no_token_request_cache_error')
}

function getSafeReturnPath(value) {
  const returnPath = String(value || '')

  if (returnPath.startsWith('/chatbot')) {
    return returnPath
  }

  return ''
}

function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const shouldStartMicrosoftSignIn = searchParams.get('ms365') === '1'
  const requestedReturnPath = getSafeReturnPath(searchParams.get('returnTo'))
  const [error, setError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isMicrosoftReady, setIsMicrosoftReady] = useState(false)
  const microsoftUnavailableMessage = getMicrosoftUnavailableMessage()
  const isChatbotMicrosoftLogin = shouldStartMicrosoftSignIn && Boolean(requestedReturnPath)
  const msalInstance = useMemo(() => {
    if (getMicrosoftUnavailableMessage()) {
      return null
    }

    try {
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
    } catch {
      return null
    }
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

        if (!active) {
          return
        }

        if (!result?.idToken) {
          if (shouldStartMicrosoftSignIn) {
            setError('')
            setAuthMessage('Redirecting to Microsoft 365...')
            setIsSigningIn(true)
            clearMicrosoftInteractionState()

            msalInstance.loginRedirect({
              scopes: MICROSOFT_LOGIN_SCOPES,
            })
              .catch((loginError) => {
                if (active) {
                  setError(loginError.message || 'Microsoft sign-in failed.')
                  setAuthMessage('')
                  setIsSigningIn(false)
                }
              })
          }

          return
        }

        const returnPath = getSafeReturnPath(sessionStorage.getItem(MICROSOFT_RETURN_PATH_KEY)) || requestedReturnPath
        const isChatLogin = Boolean(returnPath)

        setAuthMessage('Signing you in with Microsoft 365...')

        const response = await fetch(getMicrosoftAuthUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: result.idToken,
            graphAccessToken: result.accessToken,
            purpose: isChatLogin ? 'chat' : 'admin',
          }),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.message || 'Microsoft sign-in failed.')
        }

        setStoredSession({
          token: data.token || data.accessToken,
          user: data.user,
        })
        localStorage.removeItem(GUEST_MESSAGE_COUNT_KEY)

        sessionStorage.removeItem(MICROSOFT_RETURN_PATH_KEY)
        if (isChatLogin) {
          sessionStorage.setItem(CHATBOT_LOGIN_TOAST_KEY, 'Microsoft 365 login successful.')
        }
        navigate(isChatLogin ? returnPath : '/admin', { replace: true })
      } catch (msalError) {
        if (active) {
          if (isStaleMicrosoftCallbackError(msalError)) {
            clearMicrosoftInteractionState()
            window.history.replaceState(null, '', '/login')
            setError('Microsoft sign-in session expired. Please click Sign in with Microsoft 365 again.')
            setIsMicrosoftReady(true)
          } else {
            setError(msalError.message || 'Microsoft sign-in failed to initialize.')
            setIsMicrosoftReady(false)
          }
          setIsSigningIn(false)
          setAuthMessage('')
        }
      }
    }

    initializeAndHandleMicrosoftAuth()

    return () => {
      active = false
    }
  }, [msalInstance, navigate, requestedReturnPath, shouldStartMicrosoftSignIn])

  useEffect(() => {
    const token = searchParams.get('token') || searchParams.get('accessToken')

    if (token) {
      setStoredSession({ token })
      localStorage.removeItem(GUEST_MESSAGE_COUNT_KEY)

      const returnPath = getSafeReturnPath(sessionStorage.getItem(MICROSOFT_RETURN_PATH_KEY)) || requestedReturnPath
      sessionStorage.removeItem(MICROSOFT_RETURN_PATH_KEY)
      if (returnPath) {
        sessionStorage.setItem(CHATBOT_LOGIN_TOAST_KEY, 'Microsoft 365 login successful.')
      }
      navigate(returnPath || '/admin', { replace: true })
    }
  }, [navigate, requestedReturnPath, searchParams])

  function handleMicrosoftSignIn() {
    if (!msalInstance) {
      setError(microsoftUnavailableMessage || 'Microsoft sign-in is not available in this browser.')
      return
    }

    if (!isMicrosoftReady) {
      setError('Microsoft sign-in is still loading. Please try again in a moment.')
      return
    }

    setError('')
    setAuthMessage('Redirecting to Microsoft 365...')
    setIsSigningIn(true)
    clearMicrosoftInteractionState()

    if (requestedReturnPath) {
      sessionStorage.setItem(MICROSOFT_RETURN_PATH_KEY, requestedReturnPath)
    }

    msalInstance.loginRedirect({
      scopes: MICROSOFT_LOGIN_SCOPES,
    })
      .catch((loginError) => {
        setError(loginError.message || 'Microsoft sign-in failed.')
        setAuthMessage('')
        setIsSigningIn(false)
      })
  }

  if (isChatbotMicrosoftLogin) {
    return (
      <main className="mcu-login-modal-backdrop is-full-page" role="presentation">
        <section
          className="mcu-login-modal"
          aria-labelledby="mcu-chat-login-title"
          aria-modal="true"
          role="dialog"
        >
          <div className="mcu-login-modal-brand">
            <img src={mcuSmallLogo} alt="" />
            <div>
              <p>Centralino Virtual Assistant</p>
              <h2 id="mcu-chat-login-title">Continue with Microsoft 365</h2>
            </div>
          </div>
          <p className="mcu-login-modal-copy">
            Sign in with your authorized MCU Microsoft 365 account to continue chatting.
          </p>
          {error && <p className="mcu-login-modal-error">{error}</p>}
          {authMessage && <p className="form-note">{authMessage}</p>}
          <button
            className="mcu-login-modal-ms365"
            type="button"
            onClick={handleMicrosoftSignIn}
            disabled={isSigningIn || !isMicrosoftReady || Boolean(microsoftUnavailableMessage)}
          >
            <span className="microsoft-mark" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </span>
            {microsoftUnavailableMessage
              ? 'Microsoft sign-in requires HTTPS'
              : !isMicrosoftReady
                ? 'Preparing Microsoft 365...'
                : isSigningIn
                  ? 'Connecting to Microsoft 365...'
                  : 'Login with Microsoft 365'}
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-brand">
          <img className="login-brand-logo" src={mcuLogoPurple} alt="Manila Central University" />
        </div>

        {error && <p className="form-error">{error}</p>}
        {authMessage && <p className="form-note">{authMessage}</p>}

        <button
          className={microsoftButtonClass}
          type="button"
          onClick={handleMicrosoftSignIn}
          disabled={isSigningIn || !isMicrosoftReady || Boolean(microsoftUnavailableMessage)}
        >
          <span className="microsoft-mark" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </span>
          {microsoftUnavailableMessage
            ? 'Microsoft sign-in requires HTTPS'
            : !isMicrosoftReady
            ? 'Loading Microsoft sign-in...'
            : isSigningIn
              ? 'Connecting to Microsoft 365...'
              : 'Sign in with Microsoft 365'}
        </button>

      </section>
    </main>
  )
}

export default Login


