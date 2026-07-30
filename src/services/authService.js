import apiFetch, { clearStoredSession, getStoredToken, setStoredSession } from './apiClient'

const DEFAULT_API_EMAIL = import.meta.env.VITE_DEFAULT_API_EMAIL || ''
const DEFAULT_API_PASSWORD = import.meta.env.VITE_DEFAULT_API_PASSWORD || ''

async function loginWithCredentials({ email, password }) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  })

  if (!data.token) {
    throw new Error('Login succeeded but no JWT token was returned.')
  }

  setStoredSession({
    token: data.token,
    user: data.user,
  })

  return data
}

async function ensureDefaultSession() {
  const existingToken = getStoredToken()

  if (existingToken) {
    return existingToken
  }

  if (!DEFAULT_API_EMAIL || !DEFAULT_API_PASSWORD) {
    throw new Error('Missing default API credentials. Sign in first or set VITE_DEFAULT_API_EMAIL and VITE_DEFAULT_API_PASSWORD.')
  }

  const data = await loginWithCredentials({
    email: DEFAULT_API_EMAIL,
    password: DEFAULT_API_PASSWORD,
  })

  return data.token
}

function logout() {
  clearStoredSession()
}

export { DEFAULT_API_EMAIL, ensureDefaultSession, loginWithCredentials, logout }

