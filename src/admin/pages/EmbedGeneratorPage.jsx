import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { fetchEmbedOrigins } from '../services/embedOriginService'
import { fallbackScopeOptions, fetchScopeOptions } from '../services/scopeService'

const positionOptions = [
  { value: 'right', label: 'Right side' },
  { value: 'left', label: 'Left side' },
]

const toast = Swal.mixin({
  toast: true,
  position: 'center',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true,
})

const fieldLabelClass = 'grid gap-2 text-sm font-extrabold text-[#3b0a57]'
const inputClass = 'min-h-11 w-full rounded-lg border border-[#d9d3e4] bg-white px-4 py-3 text-sm font-bold text-[#241433] outline-none transition placeholder:text-[#9b8aaa] focus:border-[#5c297c] focus:ring-4 focus:ring-[#5c297c]/10'
const primaryButtonClass = 'rounded-lg bg-[#ffc52f] px-4 py-3 font-extrabold text-[#2a003f] shadow-[0_10px_20px_rgba(255,197,47,0.24)] transition hover:bg-[#ffd966] disabled:cursor-not-allowed disabled:opacity-60'

function EmbedGeneratorPage() {
  const [scope, setScope] = useState('general')
  const [scopeOptions, setScopeOptions] = useState(fallbackScopeOptions)
  const [websiteOptions, setWebsiteOptions] = useState([])
  const [websiteId, setWebsiteId] = useState('')
  const [position, setPosition] = useState('right')
  const [baseUrl, setBaseUrl] = useState(window.location.origin)

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const [scopes, websites] = await Promise.all([
          fetchScopeOptions(),
          fetchEmbedOrigins(),
        ])
        setScopeOptions(scopes)
        setWebsiteOptions(websites.origins || [])
      } catch {
        setScopeOptions(fallbackScopeOptions)
        setWebsiteOptions([])
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const scopedWebsiteOptions = useMemo(
    () => websiteOptions.filter((website) => website.siteScope === scope && website.isActive),
    [scope, websiteOptions],
  )
  const effectiveWebsiteId = scopedWebsiteOptions.some((website) => String(website.id) === String(websiteId))
    ? websiteId
    : String(scopedWebsiteOptions[0]?.id || '')
  const selectedWebsite = useMemo(
    () => scopedWebsiteOptions.find((website) => String(website.id) === String(effectiveWebsiteId)),
    [effectiveWebsiteId, scopedWebsiteOptions],
  )

  const embedCode = useMemo(() => {
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')
    const chatbotUrl = `${normalizedBaseUrl}/chatbot?embed=1&compact=1&scope=${encodeURIComponent(scope)}`
    const tokenLine = selectedWebsite?.embedToken
      ? [`  data-embed-token="${selectedWebsite.embedToken}"`]
      : []

    return [
      '<script',
      `  src="${normalizedBaseUrl}/mcu-chatbot-widget.js"`,
      `  data-chatbot-url="${chatbotUrl}"`,
      ...tokenLine,
      `  data-position="${position}">`,
      '</script>'
    ].join('\n')
  }, [baseUrl, position, scope, selectedWebsite])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(embedCode)
      toast.fire({
        icon: 'success',
        title: 'Embed code copied.',
      })
    } catch {
      toast.fire({
        icon: 'error',
        title: 'Unable to copy code.',
      })
    }
  }

  return (
    <article className="embed-generator rounded-2xl border border-[#5c297c]/12 bg-white p-5 text-[#241433] shadow-[0_18px_50px_rgba(42,0,63,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0a733]">Website Integration</p>
          <h3 className="m-0 text-xl font-bold text-[#3b0a57]">Embed Chatbot Generator</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
            Choose the target chatbot scope and widget position, then copy the generated code into the MCU website page.
          </p>
        </div>
        <button
          className={primaryButtonClass}
          type="button"
          onClick={handleCopy}
        >
          Copy Code
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="grid gap-4 rounded-xl border border-[#5c297c]/10 bg-[#faf7ff] p-4">
          <label className={fieldLabelClass}>
            Chatbot URL / Domain
            <input
              className={inputClass}
              type="url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://chatbot.mcu.edu.ph"
            />
          </label>

          <label className={fieldLabelClass}>
            Target Website / Scope
            <select
              className={inputClass}
              value={scope}
              onChange={(event) => {
                setScope(event.target.value)
                setWebsiteId('')
              }}
            >
              {scopeOptions.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className={fieldLabelClass}>
            Allowed Website
            <select className={inputClass} value={effectiveWebsiteId} onChange={(event) => setWebsiteId(event.target.value)}>
              {scopedWebsiteOptions.length === 0 && (
                <option value="">No active website for this scope</option>
              )}
              {scopedWebsiteOptions.map((website) => (
                <option value={website.id} key={website.id}>
                  {website.label || website.origin}
                </option>
              ))}
            </select>
            <small className="text-xs font-semibold text-[#667085]">
              The generated code includes the token for this website.
            </small>
          </label>

          <label className={fieldLabelClass}>
            Widget Position
            <select className={inputClass} value={position} onChange={(event) => setPosition(event.target.value)}>
              {positionOptions.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </section>

        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <strong className="text-[#3b0a57]">Generated Embed Code</strong>
            <span className="rounded-full bg-[#efe8f7] px-3 py-1 text-xs font-bold text-[#5c297c]">
              {scope}
            </span>
          </div>
          <textarea
            className="min-h-56 resize-y rounded-xl border border-[#5c297c]/14 bg-[#1f1430] p-4 font-mono text-sm leading-6 text-white outline-none"
            value={embedCode}
            readOnly
          />
          <p className="text-sm leading-6 text-[#667085]">
            Paste this before the closing <code>&lt;/body&gt;</code> tag of the target website.
          </p>
        </section>
      </div>
    </article>
  )
}

export default EmbedGeneratorPage
