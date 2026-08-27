import apiFetch, { API_BASE_URL, clearStoredSession, getStoredToken, isTokenExpired } from '../../services/apiClient'

export const PAGE_SIZE = 5

function formatDate(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function getFileType(filePath) {
  const extension = filePath?.split('.').pop()
  return extension ? extension.toUpperCase() : 'PDF'
}

function mapDocument(document) {
  return {
    id: `DOC-${document.id}`,
    title: document.title,
    owner: document.uploaded_by || 'Unknown',
    scope: document.site_scope || 'general',
    topicCategory: document.topic_category || 'Automatic',
    suggestedPrompt: document.suggested_prompt || '',
    showAsTopic: document.show_as_topic !== 0,
    status: 'Published',
    type: getFileType(document.file_path),
    date: formatDate(document.created_at),
    imageCount: Number(document.image_count || 0),
    rawId: document.id,
    raw: document,
  }
}

async function fetchDocumentsFromApi({ page, pageSize, search, status }) {
  const data = await apiFetch('/api/documents')
  const normalizedSearch = search.trim().toLowerCase()
  const filteredDocuments = (data.documents || [])
    .map(mapDocument)
    .filter((document) => {
      const matchesSearch = [document.id, document.title, document.owner, document.type]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
      const matchesStatus = status === 'All' || document.status === status

      return matchesSearch && matchesStatus
    })
  const startIndex = (page - 1) * pageSize

  return {
    rows: filteredDocuments.slice(startIndex, startIndex + pageSize),
    total: filteredDocuments.length,
  }
}

async function uploadDocument({
  title,
  siteScope = 'general',
  topicCategory = '',
  suggestedPrompt = '',
  showAsTopic = true,
  file,
  onProgress,
  onUploadComplete,
}) {
  const formData = new FormData()
  formData.append('file', file)

  if (title.trim()) {
    formData.append('title', title.trim())
  }

  formData.append('siteScope', siteScope)
  formData.append('topicCategory', topicCategory.trim())
  formData.append('suggestedPrompt', suggestedPrompt.trim())
  formData.append('showAsTopic', showAsTopic ? '1' : '0')

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()

    request.open('POST', new URL('/api/documents/upload', API_BASE_URL).toString())

    const token = getStoredToken()

    if (isTokenExpired(token)) {
      clearStoredSession()
      reject(new Error('Your session has expired. Please sign in again.'))
      return
    }

    if (token) {
      request.setRequestHeader('Authorization', `Bearer ${token}`)
    }

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return
      }

      onProgress?.(Math.min(Math.round((event.loaded / event.total) * 90), 90))
    }

    request.upload.onload = () => {
      onProgress?.(90)
      onUploadComplete?.()
    }

    request.onload = () => {
      const contentType = request.getResponseHeader('content-type') || ''
      const data = contentType.includes('application/json') && request.responseText
        ? JSON.parse(request.responseText)
        : { message: request.responseText }

      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100)
        resolve(data)
        return
      }

      if (request.status === 401) {
        clearStoredSession()
      }

      reject(new Error(data.message || 'Upload failed.'))
    }

    request.onerror = () => {
      reject(new Error('Upload failed. Please check your connection.'))
    }

    request.send(formData)
  })
}

async function fetchDocumentDetails(documentId) {
  const id = String(documentId).replace(/^DOC-/, '')
  const data = await apiFetch(`/api/documents/${id}`)

  return data.document
}

export { fetchDocumentDetails, fetchDocumentsFromApi, uploadDocument }


