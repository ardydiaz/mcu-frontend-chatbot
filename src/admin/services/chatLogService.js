import apiFetch from '../../services/apiClient'

function formatDateTime(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function truncateText(value, maxLength = 140) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trim()}...`
}

function mapChatLog(log) {
  return {
    id: log.id,
    userName: log.userName || 'Guest',
    userEmail: log.userEmail || '',
    userRole: log.userRole || 'guest',
    userSource: log.userSource || 'guest',
    message: log.message || '',
    response: log.response || '',
    messagePreview: truncateText(log.message, 110),
    responsePreview: truncateText(log.response, 150),
    createdAt: formatDateTime(log.createdAt),
    raw: log,
  }
}

async function fetchChatLogs({ page = 1, pageSize = 20, search = '' } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })

  if (search.trim()) {
    params.set('search', search.trim())
  }

  const data = await apiFetch(`/api/chat-logs?${params.toString()}`)

  return {
    logs: (data.logs || []).map(mapChatLog),
    pagination: data.pagination || {
      page,
      pageSize,
      total: 0,
      totalPages: 1,
    },
  }
}

export { fetchChatLogs }
