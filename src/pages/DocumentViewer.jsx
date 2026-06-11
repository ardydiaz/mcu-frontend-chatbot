import DocumentCard from '../components/DocumentCard'

const documents = [
  {
    title: 'Enrollment Guidelines',
    type: 'PDF',
    updatedAt: 'Updated today',
  },
  {
    title: 'Registrar Request Process',
    type: 'DOCX',
    updatedAt: 'Updated yesterday',
  },
]

function DocumentViewer() {
  return (
    <main className="page-shell">
      <section className="content-card">
        <p className="eyebrow">Knowledge Base</p>
        <h2>Document Viewer</h2>
        <div className="document-list">
          {documents.map((document) => (
            <DocumentCard document={document} key={document.title} />
          ))}
        </div>
      </section>
    </main>
  )
}

export default DocumentViewer
