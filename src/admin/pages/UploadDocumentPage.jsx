import { useState } from 'react'
import { uploadDocument } from '../services/documentService'

function UploadDocumentPage() {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!file) {
      setError('Please choose a PDF file.')
      return
    }

    setIsUploading(true)

    try {
      await uploadDocument({ title, file })
      setTitle('')
      setFile(null)
      setMessage('Document uploaded and processed.')
      event.currentTarget.reset()
    } catch (uploadError) {
      setError(uploadError.message || 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <article className="rounded-2xl border border-[#5c297c]/12 bg-white p-5 text-[#241433] shadow-[0_18px_50px_rgba(42,0,63,0.08)] xl:col-span-full">
      <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0a733]">Document Intake</p>
      <h3 className="m-0 text-xl font-bold text-[#3b0a57]">Upload Document</h3>
      <form className="upload-dropzone" onSubmit={handleSubmit}>
        <strong>Drop PDF, DOCX, or TXT files here</strong>
        <span>The API currently accepts PDF uploads and processes them immediately.</span>
        <input
          className="form-control max-w-xl"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Document title"
        />
        <input
          className="form-control max-w-xl"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-note">{message}</p>}
        <button type="submit" disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Upload PDF'}
        </button>
      </form>
    </article>
  )
}

export default UploadDocumentPage
