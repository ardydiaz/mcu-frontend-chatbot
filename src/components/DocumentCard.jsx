function DocumentCard({ document }) {
  return (
    <article className="document-card">
      <div>
        <strong>{document.title}</strong>
        <span>{document.updatedAt}</span>
      </div>
      <span className="document-type">{document.type}</span>
    </article>
  )
}

export default DocumentCard
