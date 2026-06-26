import apiFetch from '../../services/apiClient'

async function askChatbot(message) {
  return apiFetch('/api/chat/ask', {
    method: 'POST',
    auth: false,
    body: { message },
  })
}

async function fetchChatbotTopics() {
  return apiFetch('/api/chat/topics', {
    auth: false,
  })
}

export { askChatbot, fetchChatbotTopics }
