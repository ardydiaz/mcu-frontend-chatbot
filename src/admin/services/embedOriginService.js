import apiFetch from '../../services/apiClient'

async function fetchEmbedOrigins() {
  return apiFetch('/api/embed-origins')
}

async function createEmbedOrigin(payload) {
  return apiFetch('/api/embed-origins', {
    method: 'POST',
    body: payload,
  })
}

async function updateEmbedOrigin(id, payload) {
  return apiFetch(`/api/embed-origins/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

async function deleteEmbedOrigin(id) {
  return apiFetch(`/api/embed-origins/${id}`, {
    method: 'DELETE',
  })
}

async function regenerateEmbedOriginToken(id) {
  return apiFetch(`/api/embed-origins/${id}/regenerate-token`, {
    method: 'POST',
  })
}

export {
  createEmbedOrigin,
  deleteEmbedOrigin,
  fetchEmbedOrigins,
  regenerateEmbedOriginToken,
  updateEmbedOrigin,
}
