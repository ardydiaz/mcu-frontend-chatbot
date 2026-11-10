import apiFetch, {
  API_BASE_URL,
  clearStoredSession,
  getStoredToken,
  isTokenExpired,
} from '../../services/apiClient'

async function askChatbot(
  message,
  scope = 'general',
  embedOrigin = window.location.origin,
  embedToken = '',
  isEmbed = false,
  conversationContext = [],
) {
  return apiFetch('/api/chat/ask', {
    method: 'POST',
    body: { message, scope, embedOrigin, embedToken, isEmbed, conversationContext },
  })
}

class StreamUnavailableError extends Error {}

// Streams the answer from /api/chat/ask-stream. `onPartial(answerBlocks)` is
// called with the answer-so-far while the AI writes it; the promise resolves
// with the final result (same shape as askChatbot). If the server has no
// streaming endpoint, it falls back to askChatbot.
async function askChatbotStream(
  {
    message,
    scope = 'general',
    embedOrigin = window.location.origin,
    embedToken = '',
    isEmbed = false,
    conversationContext = [],
  },
  { onPartial } = {},
) {
  const body = { message, scope, embedOrigin, embedToken, isEmbed, conversationContext }

  try {
    return await readAnswerStream(body, onPartial)
  } catch (error) {
    if (error instanceof StreamUnavailableError) {
      return apiFetch('/api/chat/ask', { method: 'POST', body })
    }

    throw error
  }
}

async function readAnswerStream(body, onPartial) {
  const token = getStoredToken()

  if (isTokenExpired(token)) {
    clearStoredSession()
    throw new Error('Your session has expired. Please sign in again.')
  }

  const headers = new Headers({ 'Content-Type': 'application/json' })

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(new URL('/api/chat/ask-stream', API_BASE_URL).toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (response.status === 404 || !response.body) {
    throw new StreamUnavailableError('Streaming is not available.')
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))

    if (response.status === 401) {
      clearStoredSession()
    }

    throw new Error(data.message || 'Request failed.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffered = ''
  let finalData = null

  const handleLine = (line) => {
    if (!line.trim()) {
      return
    }

    const event = JSON.parse(line)

    if (event.type === 'partial') {
      onPartial?.(event.answerBlocks)
    } else if (event.type === 'final') {
      finalData = event.data
    } else if (event.type === 'error') {
      throw new Error(event.message || 'The chatbot encountered a server error. Please try again.')
    }
  }

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffered += decoder.decode(value, { stream: true })
    const lines = buffered.split('\n')
    buffered = lines.pop()
    lines.forEach(handleLine)
  }

  handleLine(buffered + decoder.decode())

  if (!finalData) {
    throw new Error('The answer was interrupted. Please try again.')
  }

  return finalData
}

export { askChatbot, askChatbotStream }
