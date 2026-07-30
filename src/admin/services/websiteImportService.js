import apiFetch, {
  API_BASE_URL,
  clearStoredSession,
  getStoredToken,
  isTokenExpired,
} from '../../services/apiClient'

async function previewWebsiteImport(payload) {
  return apiFetch('/api/website-import/preview', {
    method: 'POST',
    body: payload,
  })
}

function getDownloadFilename(response) {
  const disposition = response.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/i)

  return match?.[1] || 'website-import.doc'
}

function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

async function exportWebsiteImportWord(payload) {
  const token = getStoredToken()

  if (isTokenExpired(token)) {
    clearStoredSession()
    throw new Error('Your session has expired. Please sign in again.')
  }

  const response = await fetch(new URL('/api/website-import/export-word', API_BASE_URL).toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredSession()
    }

    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Unable to export website pages.')
  }

  const filename = getDownloadFilename(response)
  const blob = await response.blob()
  downloadBlob(blob, filename)

  return filename
}

export {
  exportWebsiteImportWord,
  previewWebsiteImport,
}


