import apiFetch from '../../services/apiClient'

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
    status: 'Published',
    type: getFileType(document.file_path),
    date: formatDate(document.created_at),
    imageCount: Number(document.image_count || 0),
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

async function uploadDocument({ title, file }) {
  const formData = new FormData()
  formData.append('pdf', file)

  if (title.trim()) {
    formData.append('title', title.trim())
  }

  return apiFetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
  })
}

export { fetchDocumentsFromApi, uploadDocument }
