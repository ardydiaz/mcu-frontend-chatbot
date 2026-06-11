import FileUploader from '../components/FileUploader'

function UploadDocument() {
  return (
    <main className="page-shell">
      <section className="content-card">
        <p className="eyebrow">Admin Console</p>
        <h2>Upload Documents</h2>
        <FileUploader />
      </section>
    </main>
  )
}

export default UploadDocument
