import apiFetch from '../../services/apiClient'

async function fetchAnnouncements() {
  return apiFetch('/api/announcements')
}

async function createAnnouncement(payload) {
  return apiFetch('/api/announcements', {
    method: 'POST',
    body: payload,
  })
}

async function updateAnnouncement(id, payload) {
  return apiFetch(`/api/announcements/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

async function deleteAnnouncement(id) {
  return apiFetch(`/api/announcements/${id}`, {
    method: 'DELETE',
  })
}

export {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  updateAnnouncement,
}
