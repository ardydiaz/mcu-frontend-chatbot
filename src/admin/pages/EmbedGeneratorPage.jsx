import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
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

function EmbedGeneratorPage() {
  const [scope, setScope] = useState('general')
  const [scopeOptions, setScopeOptions] = useState(fallbackScopeOptions)
  const [position, setPosition] = useState('right')
  const [baseUrl, setBaseUrl] = useState(window.location.origin)

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        setScopeOptions(await fetchScopeOptions())
      } catch {
        setScopeOptions(fallbackScopeOptions)
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const embedCode = useMemo(() => {
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')
    const chatbotUrl = `${normalizedBaseUrl}/chatbot?embed=1&compact=1&scope=${encodeURIComponent(scope)}`

    return [
      '<script',
      `  src="${normalizedBaseUrl}/mcu-chatbot-widget.js"`,
      `  data-chatbot-url="${chatbotUrl}"`,
      `  data-position="${position}">`,
      '</script>'
    ].join('\n')
  }, [baseUrl, position, scope])

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
          className="rounded-lg bg-[#ffc52f] px-4 py-3 font-extrabold text-[#2a003f] shadow-[0_10px_20px_rgba(255,197,47,0.24)]"
          type="button"
          onClick={handleCopy}
        >
          Copy Code
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="grid gap-4 rounded-xl border border-[#5c297c]/10 bg-[#faf7ff] p-4">
          <label className="upload-field">
            Chatbot URL / Domain
            <input
              type="url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://chatbot.mcu.edu.ph"
            />
          </label>

          <label className="upload-field">
            Target Website / Scope
            <select value={scope} onChange={(event) => setScope(event.target.value)}>
              {scopeOptions.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="upload-field">
            Widget Position
            <select value={position} onChange={(event) => setPosition(event.target.value)}>
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
