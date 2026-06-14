import { documents } from '../data/mockAdminData'

export const PAGE_SIZE = 5

export function fetchDocumentsFromMockServer({ page, pageSize, search, status }) {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      const normalizedSearch = search.trim().toLowerCase()
      const filteredDocuments = documents.filter((document) => {
        const matchesSearch = [document.id, document.title, document.owner, document.type]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
        const matchesStatus = status === 'All' || document.status === status

        return matchesSearch && matchesStatus
      })
      const startIndex = (page - 1) * pageSize

      resolve({
        rows: filteredDocuments.slice(startIndex, startIndex + pageSize),
        total: filteredDocuments.length,
      })
    }, 350)
  })
}
