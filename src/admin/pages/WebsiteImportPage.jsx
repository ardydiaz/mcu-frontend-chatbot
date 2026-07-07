import { useState } from 'react'
import Swal from 'sweetalert2'
import { exportWebsiteImportWord, previewWebsiteImport } from '../services/websiteImportService'

const fieldLabelClass = 'grid gap-2 text-sm font-extrabold text-[#3b0a57]'
const inputClass = 'min-h-11 w-full rounded-lg border border-[#d9d3e4] bg-white px-4 py-3 text-sm font-bold text-[#241433] outline-none transition placeholder:text-[#9b8aaa] focus:border-[#5c297c] focus:ring-4 focus:ring-[#5c297c]/10'
const primaryButtonClass = 'rounded-lg bg-[#ffc52f] px-4 py-3 font-extrabold text-[#2a003f] shadow-[0_10px_20px_rgba(255,197,47,0.24)] transition hover:bg-[#ffd966] disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass = 'rounded-lg border border-[#5c297c]/20 bg-white px-4 py-3 font-extrabold text-[#5c297c] transition hover:bg-[#f7f0ff] disabled:cursor-not-allowed disabled:opacity-60'

const toast = Swal.mixin({
  toast: true,
  position: 'center',
  showConfirmButton: false,
  timer: 2400,
  timerProgressBar: true,
})

function WebsiteImportPage() {
  const [form, setForm] = useState({
    url: 'https://mcu.edu.ph/',
    title: 'MCU Main Website Import',
    siteScope: 'general',
    maxPages: 1,
    allowedPathPrefix: '',
    followLinks: false,
  })
  const [pages, setPages] = useState([])
  const [selectedUrls, setSelectedUrls] = useState([])
  const [importMeta, setImportMeta] = useState(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handlePreview(event) {
    event.preventDefault()
    setIsPreviewing(true)
    setPages([])
    setSelectedUrls([])
    setImportMeta(null)

    try {
      const data = await previewWebsiteImport(form)
      setPages(data.pages || [])
      setSelectedUrls((data.pages || []).map((page) => page.url))
      setImportMeta({
        extractionMode: data.extractionMode || 'static',
        notes: data.notes || [],
      })
      toast.fire({ icon: 'success', title: `${data.pages?.length || 0} pages found.` })
    } catch (error) {
      toast.fire({ icon: 'error', title: error.message || 'Unable to crawl website.' })
    } finally {
      setIsPreviewing(false)
    }
  }

  async function handleExportWord() {
    setIsExporting(true)

    try {
      const filename = await exportWebsiteImportWord({
        ...form,
        selectedUrls,
      })
      toast.fire({ icon: 'success', title: `${filename} downloaded.` })
    } catch (error) {
      toast.fire({ icon: 'error', title: error.message || 'Unable to download Word document.' })
    } finally {
      setIsExporting(false)
    }
  }

  function togglePage(url) {
    setSelectedUrls((current) =>
      current.includes(url)
        ? current.filter((item) => item !== url)
        : [...current, url],
    )
  }

  return (
    <article className="rounded-2xl border border-[#5c297c]/12 bg-white p-5 text-[#241433] shadow-[0_18px_50px_rgba(42,0,63,0.08)]">
      <div>
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0a733]">Knowledge Import</p>
        <h3 className="m-0 text-xl font-bold text-[#3b0a57]">Website Importer</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
          Scan a public page, include supported modal/tab/accordion content, then download the result as a Word document for review.
        </p>
      </div>

      <form className="mt-5 grid gap-4 rounded-xl border border-[#5c297c]/10 bg-[#faf7ff] p-4" onSubmit={handlePreview}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
          <label className={fieldLabelClass}>
            Website URL
            <input
              className={inputClass}
              type="url"
              value={form.url}
              onChange={(event) => updateForm('url', event.target.value)}
              placeholder="https://mcu.edu.ph/"
              required
            />
          </label>

          <label className={fieldLabelClass}>
            Document Title
            <input
              className={inputClass}
              value={form.title}
              onChange={(event) => updateForm('title', event.target.value)}
              placeholder="MCU Main Website Import"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={primaryButtonClass} type="submit" disabled={isPreviewing}>
            {isPreviewing ? 'Crawling...' : 'Preview Website'}
          </button>
          <button
            className={secondaryButtonClass}
            type="button"
            disabled={isExporting || selectedUrls.length === 0}
            onClick={handleExportWord}
          >
            {isExporting ? 'Downloading...' : 'Download Word'}
          </button>
        </div>
      </form>

      <section className="mt-5 grid gap-3">
        {importMeta && (
          <div className="rounded-xl border border-[#5c297c]/10 bg-[#faf7ff] p-4 text-sm leading-6 text-[#667085]">
            <strong className="text-[#3b0a57]">
              Extraction mode: {importMeta.extractionMode === 'browser-interactive' ? 'Smart interactive scan' : 'Static page scan'}
            </strong>
            {importMeta.notes.map((note) => (
              <span className="mt-1 block" key={note}>{note}</span>
            ))}
          </div>
        )}

        {pages.length === 0 ? (
          <div className="rounded-xl border border-[#5c297c]/10 p-5 text-sm text-[#667085]">
            No preview yet. Enter a website URL and click Preview Website.
          </div>
        ) : pages.map((page) => (
          <article className="rounded-xl border border-[#5c297c]/10 bg-[#fbfafc] p-4" key={page.url}>
            <label className="flex items-start gap-3">
              <input
                className="mt-1 h-4 w-4 rounded border-[#d9d3e4] accent-[#5c297c]"
                type="checkbox"
                checked={selectedUrls.includes(page.url)}
                onChange={() => togglePage(page.url)}
              />
              <span className="grid gap-2">
                <strong className="text-[#241433]">{page.title}</strong>
                <a className="break-all text-sm font-bold text-[#5c297c]" href={page.url} target="_blank" rel="noreferrer">
                  {page.url}
                </a>
                <small className="font-bold text-[#667085]">{page.wordCount} words</small>
                {page.extractionMode && (
                  <small className="font-bold text-[#5c297c]">
                    {page.extractionMode === 'browser-interactive'
                      ? `Smart scan${page.interactiveItemsFound ? `, ${page.interactiveItemsFound} interactive items checked` : ''}`
                      : 'Static scan'}
                  </small>
                )}
                <span className="text-sm leading-6 text-[#475467]">{page.textPreview}</span>
              </span>
            </label>
          </article>
        ))}
      </section>
    </article>
  )
}

export default WebsiteImportPage
