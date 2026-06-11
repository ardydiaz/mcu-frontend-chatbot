function FileUploader() {
  return (
    <div className="file-uploader">
      <label htmlFor="document-upload">Choose document</label>
      <input id="document-upload" type="file" accept=".pdf,.doc,.docx,.txt" />
      <p>Upload school policies, registrar forms, FAQs, or admissions files.</p>
    </div>
  )
}

export default FileUploader
