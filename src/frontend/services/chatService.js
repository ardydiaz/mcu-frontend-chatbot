import apiFetch from '../../services/apiClient'
import { ensureDefaultSession } from '../../services/authService'

async function askChatbot(message) {
  await ensureDefaultSession()

  return apiFetch('/api/chat/ask', {
    method: 'POST',
    body: { message },
  })
}

export { askChatbot }
