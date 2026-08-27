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
    body: { message, scope, embedOrigin, embedToken, isEmbed, conversationContext },
  })
}

export { askChatbot }

