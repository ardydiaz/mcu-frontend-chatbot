import apiFetch from '../../services/apiClient'

async function askChatbot(message, scope = 'general', embedOrigin = window.location.origin) {
  return apiFetch('/api/chat/ask', {
    method: 'POST',
    auth: false,
    body: { message, scope, embedOrigin },
  })
}

async function fetchChatbotTopics(scope = 'general', embedOrigin = window.location.origin) {
  const params = new URLSearchParams({
    scope,
    embedOrigin,
  })

  return apiFetch(`/api/chat/topics?${params.toString()}`, {
    auth: false,
  })
}

export { askChatbot, fetchChatbotTopics }
