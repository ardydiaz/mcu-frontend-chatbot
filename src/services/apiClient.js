const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const TOKEN_KEY = 'mcuAdminToken'
const USER_KEY = 'mcuAdminUser'
const LOGGED_IN_KEY = 'mcuAdminLoggedIn'

function buildApiUrl(path) {
  return new URL(path, API_BASE_URL).toString()
}

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

function getTokenPayload(token) {
  if (!token) {
    return null
  }

  const [, payload] = token.split('.')

  if (!payload) {
    return null
  }

  try {
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

function isTokenExpired(token) {
  if (!token) {
    return false
  }

  const payload = getTokenPayload(token)

  if (!payload?.exp) {
    return true
  }

  return payload.exp * 1000 <= Date.now()
}

function getStoredTokenExpiresAt() {
  const payload = getTokenPayload(getStoredToken())

  if (!payload?.exp) {
    return null
  }

  return payload.exp * 1000
}

function setStoredSession({ token, user }) {
  localStorage.setItem(LOGGED_IN_KEY, 'true')
  localStorage.setItem(TOKEN_KEY, token)

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

function clearStoredSession() {
  localStorage.removeItem(LOGGED_IN_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function getStoredUser() {
  const rawUser = localStorage.getItem(USER_KEY)

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser)
  } catch {
    return null
  }
}

function isLoggedIn() {
  const token = getStoredToken()

  if (!token) {
    return false
  }

  if (isTokenExpired(token)) {
    clearStoredSession()
    return false
  }

  return true
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  return text ? { message: text } : {}
}

async function apiFetch(path, options = {}) {
  const { auth = true, headers, body, ...fetchOptions } = options
  const requestHeaders = new Headers(headers)

  if (auth) {
    const token = getStoredToken()

    if (isTokenExpired(token)) {
      clearStoredSession()
      throw new Error('Your session has expired. Please sign in again.')
    }

    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`)
    }
  }

  if (body && !(body instanceof FormData) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  const response = await fetch(buildApiUrl(path), {
    ...fetchOptions,
    headers: requestHeaders,
    body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
  })
  const data = await parseResponse(response)

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredSession()
    }

    throw new Error(data.message || 'Request failed.')
  }

  return data
}

export {
  API_BASE_URL,
  TOKEN_KEY,
  clearStoredSession,
  getStoredTokenExpiresAt,
  getStoredToken,
  getStoredUser,
  isLoggedIn,
  isTokenExpired,
  setStoredSession,
}

export default apiFetch

