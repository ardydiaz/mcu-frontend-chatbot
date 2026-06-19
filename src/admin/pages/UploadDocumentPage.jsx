import { useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { uploadDocument } from '../services/documentService'

const allowedExtensions = ['pdf', 'doc', 'docx', 'txt']
const allowedAcceptTypes = '.pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'
const toast = Swal.mixin({
  toast: true,
  position: 'center',
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true,
})

function formatFileSize(size) {
  if (!size) {
    return '0 KB'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  const value = size / (1024 ** unitIndex)

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function getFileExtension(fileName) {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

function isAllowedDocument(file) {
  return allowedExtensions.includes(getFileExtension(file.name))
}

function UploadDocumentPage({ isModal = false, onClose, onUploaded }) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadPhase, setUploadPhase] = useState('idle')
  const fileInputRef = useRef(null)

  function selectFile(selectedFile) {
    setError('')

    if (!selectedFile) {
      setFile(null)
      setUploadProgress(0)
      setUploadPhase('idle')
      return
    }

    if (!isAllowedDocument(selectedFile)) {
      setFile(null)
      setUploadProgress(0)
      setUploadPhase('idle')
      setError('Unsupported file. Please upload a PDF, Word document, or text file only.')
      return
    }

    setFile(selectedFile)
    setUploadProgress(0)
    setUploadPhase('idle')

    if (!title.trim()) {
      setTitle(selectedFile.name.replace(/\.[^.]+$/i, ''))
    }
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    selectFile(event.dataTransfer.files?.[0])
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setUploadProgress(0)
    setUploadPhase('uploading')

    if (!file) {
      setError('Please choose a PDF, Word, or text file.')
      return
    }

    setIsUploading(true)

    try {
      await uploadDocument({
        title,
        file,
        onProgress: setUploadProgress,
        onUploadComplete: () => setUploadPhase('processing'),
      })
      setTitle('')
      setFile(null)
      setUploadProgress(100)
      setUploadPhase('complete')
      onUploaded?.()
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      toast.fire({
        icon: 'success',
        title: 'Document uploaded successfully.',
      })
    } catch (uploadError) {
      const errorMessage = uploadError.message || 'Upload failed.'
      setError(errorMessage)
      setUploadPhase('idle')
      toast.fire({
        icon: 'error',
        title: errorMessage,
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <article className={`upload-console ${isModal ? 'upload-console-modal' : 'xl:col-span-full'}`}>
      <div className="upload-console-head">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0a733]">Document Intake</p>
          <h3>Upload Document</h3>
        </div>
        <div className="upload-head-actions">
          <span className="upload-format-pill">PDF, Word, TXT</span>
          {isModal && (
            <button className="upload-modal-close" type="button" aria-label="Close upload modal" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>

      <form className="upload-workflow" onSubmit={handleSubmit}>
        <label
          className={`upload-dropzone ${isDragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedAcceptTypes}
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          <span className="upload-icon" aria-hidden="true">{file ? getFileExtension(file.name).toUpperCase() : 'DOC'}</span>
          <strong>{file ? file.name : 'Drop a document file here'}</strong>
          <small>{file ? formatFileSize(file.size) : 'or choose a file from your computer'}</small>
          <span className="upload-browse">Choose File</span>
        </label>

        <aside className="upload-details-panel">
          <label className="upload-field">
            Document Title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Document title"
            />
          </label>

          <div className="upload-file-summary">
            <span>Selected File</span>
            <strong>{file ? file.name : 'No file selected'}</strong>
            <small>{file ? `${getFileExtension(file.name).toUpperCase()} - ${formatFileSize(file.size)}` : 'Waiting for PDF, Word, or TXT'}</small>
          </div>

          {(isUploading || uploadProgress > 0) && (
            <div className={`upload-progress-panel ${uploadPhase === 'processing' ? 'is-processing' : ''}`} aria-live="polite">
              <div>
                <span>
                  {uploadPhase === 'processing'
                    ? 'Processing document'
                    : uploadPhase === 'complete'
                      ? 'Upload complete'
                      : 'Uploading file'}
                </span>
                <strong>{uploadProgress}%</strong>
              </div>
              <progress value={uploadProgress} max="100">{uploadProgress}%</progress>
              {file && (
                <small>
                  {uploadPhase === 'processing'
                    ? 'File uploaded. Extracting text and saving to knowledge base.'
                    : `${formatFileSize(file.size)} total`}
                </small>
              )}
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <button className="upload-submit" type="submit" disabled={isUploading || !file}>
            {isUploading ? 'Processing...' : 'Upload Document'}
          </button>
        </aside>
      </form>
    </article>
  )
}

export default UploadDocumentPage
