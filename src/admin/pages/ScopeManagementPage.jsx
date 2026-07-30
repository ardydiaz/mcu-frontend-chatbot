import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { createScope, deleteScope, fetchScopeOptions, updateScope } from '../services/scopeService'
import { checkboxClass, dangerButtonClass, fieldLabelClass, inputClass, primaryButtonClass, secondaryButtonClass, smallButtonClass } from '../ui/classes'

const emptyForm = {
  id: null,
  scopeKey: '',
  label: '',
  description: '',
  sortOrder: 100,
  isActive: true,
}

const toast = Swal.mixin({
  toast: true,
  position: 'center',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true,
})


function ScopeManagementPage() {
  const [scopes, setScopes] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  async function loadScopes() {
    setIsLoading(true)

    try {
      setScopes(await fetchScopeOptions({ activeOnly: false }))
    } catch (error) {
      toast.fire({ icon: 'error', title: error.message || 'Unable to load scopes.' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadScopes()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  function resetForm() {
    setForm(emptyForm)
  }

  function handleEdit(scope) {
    setForm({
      id: scope.id,
      scopeKey: scope.value,
      label: scope.label,
      description: scope.description || '',
      sortOrder: scope.sortOrder || 100,
      isActive: scope.isActive,
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)

    try {
      if (form.id) {
        await updateScope(form.id, form)
      } else {
        await createScope(form)
      }

      await loadScopes()
      resetForm()
      toast.fire({ icon: 'success', title: 'Scope saved.' })
    } catch (error) {
      toast.fire({ icon: 'error', title: error.message || 'Unable to save scope.' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(scope) {
    const result = await Swal.fire({
      title: 'Delete scope?',
      text: `${scope.label} (${scope.value})`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#642B87',
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      await deleteScope(scope.id)
      await loadScopes()
      toast.fire({ icon: 'success', title: 'Scope deleted.' })
    } catch (error) {
      toast.fire({ icon: 'error', title: error.message || 'Unable to delete scope.' })
    }
  }

  return (
    <article className="rounded-2xl border border-[#642B87]/12 bg-white p-5 text-[#241433] shadow-[0_18px_50px_rgba(48,0,69,0.08)]">
      <div>
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FFBA2E]">Chatbot Routing</p>
        <h3 className="m-0 text-xl font-bold text-[#300045]">Scope Management</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
          Create target website scopes used by uploads, embed code generation, and website access rules.
        </p>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form className="grid gap-4 rounded-xl border border-[#642B87]/10 bg-[#faf7ff] p-4" onSubmit={handleSubmit}>
          <strong className="text-[#300045]">{form.id ? 'Edit Scope' : 'Add Scope'}</strong>

          <label className={fieldLabelClass}>
            Scope Key
            <input
              className={inputClass}
              value={form.scopeKey}
              onChange={(event) => setForm((current) => ({ ...current, scopeKey: event.target.value }))}
              placeholder="library"
              required
            />
            <small className="text-xs font-semibold text-[#667085]">Use lowercase letters, numbers, dash, or underscore.</small>
          </label>

          <label className={fieldLabelClass}>
            Display Label
            <input
              className={inputClass}
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              placeholder="Library Website"
              required
            />
          </label>

          <label className={fieldLabelClass}>
            Description
            <input
              className={inputClass}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Library chatbot scope"
            />
          </label>

          <label className={fieldLabelClass}>
            Sort Order
            <input
              className={inputClass}
              type="number"
              value={form.sortOrder}
              onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
            />
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
              {isSaving ? 'Saving...' : form.id ? 'Update Scope' : 'Add Scope'}
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

        <section className="grid gap-3">
          {isLoading ? (
            <div className="rounded-xl border border-[#642B87]/10 p-5 text-sm text-[#667085]">Loading scopes...</div>
          ) : scopes.map((scope) => (
            <div
              className="flex flex-col gap-3 rounded-xl border border-[#642B87]/10 bg-[#fbfafc] p-4 md:flex-row md:items-center md:justify-between"
              key={scope.value}
            >
              <div>
                <strong className="block text-[#241433]">{scope.label}</strong>
                <span className="block text-sm text-[#667085]">{scope.value}</span>
                {scope.description && <small className="block text-[#667085]">{scope.description}</small>}
                <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                  scope.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {scope.isActive ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  className={smallButtonClass}
                  type="button"
                  onClick={() => handleEdit(scope)}
                >
                  Edit
                </button>
                <button
                  className={dangerButtonClass}
                  type="button"
                  onClick={() => handleDelete(scope)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </article>
  )
}

export default ScopeManagementPage


