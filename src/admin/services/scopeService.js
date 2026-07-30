import apiFetch from '../../services/apiClient'

const fallbackScopeOptions = [
  { value: 'general', label: 'General Chatbot' },
  { value: 'queue', label: 'Queue System' },
  { value: 'post-class', label: 'Post Class' },
]

function mapScopeOption(scope) {
  return {
    id: scope.id,
    value: scope.scopeKey,
    label: scope.label,
    description: scope.description || '',
    isActive: scope.isActive,
    sortOrder: scope.sortOrder,
  }
}

async function fetchScopeOptions({ activeOnly = true } = {}) {
  const params = new URLSearchParams({ activeOnly: activeOnly ? '1' : '0' })
  const data = await apiFetch(`/api/chatbot-scopes?${params.toString()}`)
  const scopes = data.scopes?.map(mapScopeOption) || []

  return scopes.length > 0 ? scopes : fallbackScopeOptions
}

async function createScope(payload) {
  return apiFetch('/api/chatbot-scopes', {
    method: 'POST',
    body: payload,
  })
}

async function updateScope(id, payload) {
  return apiFetch(`/api/chatbot-scopes/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

async function deleteScope(id) {
  return apiFetch(`/api/chatbot-scopes/${id}`, {
    method: 'DELETE',
  })
}

export {
  createScope,
  deleteScope,
  fallbackScopeOptions,
  fetchScopeOptions,
  updateScope,
}


