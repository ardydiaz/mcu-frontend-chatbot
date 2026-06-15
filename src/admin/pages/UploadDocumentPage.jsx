function UploadDocumentPage() {
  return (
    <article className="rounded-2xl border border-[#5c297c]/12 bg-white p-5 text-[#241433] shadow-[0_18px_50px_rgba(42,0,63,0.08)] xl:col-span-full">
      <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0a733]">Document Intake</p>
      <h3 className="m-0 text-xl font-bold text-[#3b0a57]">Upload Document</h3>
      <div className="upload-dropzone">
        <strong>Drop PDF, DOCX, or TXT files here</strong>
        <span>Files will be queued for admin review before publishing.</span>
        <button type="button">Choose File</button>
      </div>
    </article>
  )
}

export default UploadDocumentPage
