import apiFetch from '../../services/apiClient'

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
    auth: false,
    body: { message, scope, embedOrigin, embedToken, isEmbed, conversationContext },
  })
}

async function fetchChatbotTopics(scope = 'general', embedOrigin = window.location.origin, embedToken = '', isEmbed = false) {
  const params = new URLSearchParams({
    scope,
    embedOrigin,
    embedToken,
    isEmbed: isEmbed ? '1' : '0',
  })

  return apiFetch(`/api/chat/topics?${params.toString()}`, {
    auth: false,
  })
}

export { askChatbot, fetchChatbotTopics }
