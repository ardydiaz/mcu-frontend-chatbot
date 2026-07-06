import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  updateAnnouncement,
} from '../services/announcementService'
import { fallbackScopeOptions, fetchScopeOptions } from '../services/scopeService'

const emptyForm = {
  id: null,
  siteScope: 'general',
  title: '',
  body: '',
  priority: 'normal',
  startDate: '',
  endDate: '',
  isActive: true,
}

const toast = Swal.mixin({
  toast: true,
  position: 'center',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true,
})

const fieldLabelClass = 'grid gap-2 text-sm font-extrabold text-[#3b0a57]'
const inputClass = 'min-h-11 w-full rounded-lg border border-[#d9d3e4] bg-white px-4 py-3 text-sm font-bold text-[#241433] outline-none transition placeholder:text-[#9b8aaa] focus:border-[#5c297c] focus:ring-4 focus:ring-[#5c297c]/10'
const textareaClass = `${inputClass} min-h-28 resize-y leading-6`

function formatDate(value) {
  return value ? String(value).slice(0, 10) : ''
}

function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [scopeOptions, setScopeOptions] = useState(fallbackScopeOptions)
  const [form, setForm] = useState(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  async function loadAnnouncements() {
    setIsLoading(true)

    try {
      const [announcementData, scopes] = await Promise.all([
        fetchAnnouncements(),
        fetchScopeOptions(),
      ])
      setAnnouncements(announcementData.announcements || [])
      setScopeOptions(scopes)
    } catch (error) {
      toast.fire({ icon: 'error', title: error.message || 'Unable to load announcements.' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAnnouncements()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  function resetForm() {
    setForm(emptyForm)
  }

  function handleEdit(announcement) {
    setForm({
      id: announcement.id,
      siteScope: announcement.siteScope || 'general',
      title: announcement.title || '',
      body: announcement.body || '',
      priority: announcement.priority || 'normal',
      startDate: formatDate(announcement.startDate),
      endDate: formatDate(announcement.endDate),
      isActive: announcement.isActive,
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)

    try {
      if (form.id) {
        await updateAnnouncement(form.id, form)
      } else {
        await createAnnouncement(form)
      }

      await loadAnnouncements()
      resetForm()
      toast.fire({ icon: 'success', title: 'Announcement saved.' })
    } catch (error) {
      toast.fire({ icon: 'error', title: error.message || 'Unable to save announcement.' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(announcement) {
    const result = await Swal.fire({
      title: 'Delete announcement?',
      text: announcement.title,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#5c297c',
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      await deleteAnnouncement(announcement.id)
      await loadAnnouncements()
      toast.fire({ icon: 'success', title: 'Announcement deleted.' })
    } catch (error) {
      toast.fire({ icon: 'error', title: error.message || 'Unable to delete announcement.' })
    }
  }

  return (
    <article className="rounded-2xl border border-[#5c297c]/12 bg-white p-5 text-[#241433] shadow-[0_18px_50px_rgba(42,0,63,0.08)]">
      <div>
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0a733]">Campus Updates</p>
        <h3 className="m-0 text-xl font-bold text-[#3b0a57]">University Announcements</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
          Publish date-based announcements that the chatbot can answer when students ask what is new today.
        </p>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form className="grid gap-4 rounded-xl border border-[#5c297c]/10 bg-[#faf7ff] p-4" onSubmit={handleSubmit}>
          <strong className="text-[#3b0a57]">{form.id ? 'Edit Announcement' : 'Add Announcement'}</strong>

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
            Title
            <input
              className={inputClass}
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Enrollment starts tomorrow"
              required
            />
          </label>

          <label className={fieldLabelClass}>
            Message
            <textarea
              className={textareaClass}
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              placeholder="Online enrollment opens tomorrow at 8:00 AM."
              required
            />
          </label>

          <label className={fieldLabelClass}>
            Priority
            <select
              className={inputClass}
              value={form.priority}
              onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
            >
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className={fieldLabelClass}>
              Start Date
              <input
                className={inputClass}
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
              />
            </label>

            <label className={fieldLabelClass}>
              End Date
              <input
                className={inputClass}
                type="date"
                value={form.endDate}
                onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm font-extrabold text-[#3b0a57]">
            <input
              className="h-4 w-4 rounded border-[#d9d3e4] accent-[#5c297c]"
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Active
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg bg-[#ffc52f] px-4 py-3 font-extrabold text-[#2a003f] shadow-[0_10px_20px_rgba(255,197,47,0.24)] disabled:opacity-60"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : form.id ? 'Update Announcement' : 'Add Announcement'}
            </button>
            {form.id && (
              <button
                className="rounded-lg border border-[#5c297c]/20 px-4 py-3 font-extrabold text-[#5c297c]"
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
            <div className="rounded-xl border border-[#5c297c]/10 p-5 text-sm text-[#667085]">Loading announcements...</div>
          ) : announcements.length === 0 ? (
            <div className="rounded-xl border border-[#5c297c]/10 p-5 text-sm text-[#667085]">No announcements yet.</div>
          ) : announcements.map((announcement) => (
            <div
              className="flex flex-col gap-3 rounded-xl border border-[#5c297c]/10 bg-[#fbfafc] p-4 md:flex-row md:items-start md:justify-between"
              key={announcement.id}
            >
              <div>
                <strong className="block text-[#241433]">{announcement.title}</strong>
                <p className="my-2 text-sm leading-6 text-[#667085]">{announcement.body}</p>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-[#efe8f7] px-2 py-1 text-[#5c297c]">{announcement.siteScope}</span>
                  <span className="rounded-full bg-[#fff4cf] px-2 py-1 text-[#7a4a00]">{announcement.priority}</span>
                  <span className={`rounded-full px-2 py-1 ${
                    announcement.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {announcement.isActive ? 'Active' : 'Disabled'}
                  </span>
                  {(announcement.startDate || announcement.endDate) && (
                    <span className="rounded-full bg-white px-2 py-1 text-[#667085]">
                      {formatDate(announcement.startDate) || 'Anytime'} to {formatDate(announcement.endDate) || 'No end'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-[#5c297c]/20 px-3 py-2 text-sm font-bold text-[#5c297c]"
                  type="button"
                  onClick={() => handleEdit(announcement)}
                >
                  Edit
                </button>
                <button
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600"
                  type="button"
                  onClick={() => handleDelete(announcement)}
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

export default AnnouncementsPage
