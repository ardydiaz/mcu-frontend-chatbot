function UploadDocumentPage() {
  return (
    <article className="rounded-lg border border-[#ffc52f]/20 bg-white/10 p-5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur xl:col-span-full">
      <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#ffc52f]">Document Intake</p>
      <h3 className="m-0 text-xl font-bold text-white">Upload Document</h3>
      <div className="upload-dropzone">
        <strong>Drop PDF, DOCX, or TXT files here</strong>
        <span>Files will be queued for admin review before publishing.</span>
        <button type="button">Choose File</button>
      </div>
    </article>
  )
}

export default UploadDocumentPage
