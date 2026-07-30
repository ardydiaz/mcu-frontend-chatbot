import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import {
  createEmbedOrigin,
  deleteEmbedOrigin,
  fetchEmbedOrigins,
  regenerateEmbedOriginToken,
  updateEmbedOrigin,
} from '../services/embedOriginService'
import { fallbackScopeOptions, fetchScopeOptions } from '../services/scopeService'
import { checkboxClass, dangerButtonClass, fieldLabelClass, inputClass, primaryButtonClass, secondaryButtonClass, smallButtonClass, tokenButtonClass } from '../ui/classes'

const emptyForm = {
  id: null,
  label: '',
  siteScope: 'general',
  origin: '',
  isActive: true,
}

const toast = Swal.mixin({
  toast: true,
  position: 'center',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true,
})


function getOriginHelpText(origin) {
  if (!origin.trim()) {
    return 'Example: https://queue.mcu.edu.ph or http://postclasssurvey.test'
  }

  try {
    const parsedUrl = new URL(origin)
    return `This will save as ${parsedUrl.origin}`
  } catch {
    return 'Enter a valid website URL with http:// or https://'
  }
}

function WebsiteAccessPage() {
  const [origins, setOrigins] = useState([])
  const [scopeOptions, setScopeOptions] = useState(fallbackScopeOptions)
  const [form, setForm] = useState(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const groupedOrigins = useMemo(
    () => scopeOptions.map((scope) => ({
      ...scope,
      origins: origins.filter((origin) => origin.siteScope === scope.value),
    })),
    [origins, scopeOptions],
  )

  async function loadOrigins() {
    setIsLoading(true)
    setError('')

    try {
      const data = await fetchEmbedOrigins()
      const scopes = await fetchScopeOptions()
      setOrigins(data.origins || [])
      setScopeOptions(scopes)
    } catch (requestError) {
      setError(requestError.message || 'Unable to load website access list.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadOrigins()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  function resetForm() {
    setForm(emptyForm)
  }

  function handleEdit(origin) {
    setForm({
      id: origin.id,
      label: origin.label || '',
      siteScope: origin.siteScope,
      origin: origin.origin,
      isActive: origin.isActive,
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)

    try {
      if (form.id) {
        await updateEmbedOrigin(form.id, form)
      } else {
        await createEmbedOrigin(form)
      }

      await loadOrigins()
      resetForm()
      toast.fire({ icon: 'success', title: 'Website access saved.' })
    } catch (requestError) {
      toast.fire({ icon: 'error', title: requestError.message || 'Unable to save website access.' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(origin) {
    const result = await Swal.fire({
      title: 'Remove website access?',
      text: origin.origin,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#642B87',
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      await deleteEmbedOrigin(origin.id)
      await loadOrigins()
      toast.fire({ icon: 'success', title: 'Website access removed.' })
    } catch (requestError) {
      toast.fire({ icon: 'error', title: requestError.message || 'Unable to remove website access.' })
    }
  }

  async function handleCopyToken(embedToken) {
    try {
      await navigator.clipboard.writeText(embedToken)
      toast.fire({ icon: 'success', title: 'Embed token copied.' })
    } catch {
      toast.fire({ icon: 'error', title: 'Unable to copy token.' })
    }
  }

  async function handleRegenerateToken(origin) {
    const result = await Swal.fire({
      title: 'Regenerate embed token?',
      text: 'Old copied widget codes for this website will stop working.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Regenerate',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#642B87',
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      const data = await regenerateEmbedOriginToken(origin.id)
      await loadOrigins()
      await navigator.clipboard.writeText(data.origin.embedToken)
      toast.fire({ icon: 'success', title: 'New token copied.' })
    } catch (requestError) {
      toast.fire({ icon: 'error', title: requestError.message || 'Unable to regenerate token.' })
    }
  }

  return (
    <article className="rounded-2xl border border-[#642B87]/12 bg-white p-5 text-[#241433] shadow-[0_18px_50px_rgba(48,0,69,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FFBA2E]">Embed Security</p>
          <h3 className="m-0 text-xl font-bold text-[#300045]">Website Access</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
            Add the websites that are allowed to use each chatbot scope. The URL must match the website origin exactly.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form className="grid gap-4 rounded-xl border border-[#642B87]/10 bg-[#faf7ff] p-4" onSubmit={handleSubmit}>
          <div>
            <strong className="text-[#300045]">{form.id ? 'Edit Website' : 'Add Website'}</strong>
            <p className="mt-1 text-sm leading-6 text-[#667085]">
              Use the same protocol and domain shown in the browser address bar.
            </p>
          </div>

          <label className={fieldLabelClass}>
            Display Name
            <input
              className={inputClass}
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              placeholder="Post-Class Survey"
            />
          </label>

          <label className={fieldLabelClass}>
            Scope
            <select
              className={inputClass}
              value={form.siteScope}
              onChange={(event) => setForm((current) => ({ ...current, siteScope: event.target.value }))}
            >
              {scopeOptions.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className={fieldLabelClass}>
            Website URL
            <input
              className={inputClass}
              type="url"
              value={form.origin}
              onChange={(event) => setForm((current) => ({ ...current, origin: event.target.value }))}
              placeholder="https://queue.mcu.edu.ph"
              required
            />
            <small className="text-xs font-semibold text-[#667085]">{getOriginHelpText(form.origin)}</small>
          </label>

          <label className="flex items-center gap-2 text-sm font-extrabold text-[#300045]">
            <input
              className={checkboxClass}
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Active
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              className={primaryButtonClass}
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : form.id ? 'Update Website' : 'Add Website'}
            </button>
            {form.id && (
              <button
                className={secondaryButtonClass}
                type="button"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <section className="grid gap-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="rounded-xl border border-[#642B87]/10 p-5 text-sm text-[#667085]">Loading website access...</div>
          ) : groupedOrigins.map((group) => (
            <section className="rounded-xl border border-[#642B87]/10 bg-white p-4" key={group.value}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <strong className="text-[#300045]">{group.label}</strong>
                <span className="rounded-full bg-[#efe8f7] px-3 py-1 text-xs font-bold text-[#642B87]">
                  {group.origins.length} websites
                </span>
              </div>

              {group.origins.length === 0 ? (
                <p className="m-0 text-sm text-[#667085]">No websites added for this scope.</p>
              ) : (
                <div className="grid gap-2">
                  {group.origins.map((origin) => (
                    <div
                      className="flex flex-col gap-3 rounded-lg border border-[#642B87]/10 bg-[#fbfafc] p-3 md:flex-row md:items-center md:justify-between"
                      key={origin.id}
                    >
                      <div>
                        <strong className="block text-sm text-[#241433]">{origin.label || origin.origin}</strong>
                        <span className="block break-all text-sm text-[#667085]">{origin.origin}</span>
                        <code className="mt-2 block max-w-xl break-all rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#642B87]">
                          {origin.embedToken || 'No token yet'}
                        </code>
                        <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                          origin.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {origin.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          className={smallButtonClass}
                          type="button"
                          onClick={() => handleEdit(origin)}
                        >
                          Edit
                        </button>
                        {origin.embedToken && (
                          <button
                            className={tokenButtonClass}
                            type="button"
                            onClick={() => handleCopyToken(origin.embedToken)}
                          >
                            Copy Token
                          </button>
                        )}
                        <button
                          className={tokenButtonClass}
                          type="button"
                          onClick={() => handleRegenerateToken(origin)}
                        >
                          Regenerate
                        </button>
                        <button
                          className={dangerButtonClass}
                          type="button"
                          onClick={() => handleDelete(origin)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </section>
      </div>
    </article>
  )
}

export default WebsiteAccessPage


