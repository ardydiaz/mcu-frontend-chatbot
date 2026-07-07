import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import BootstrapDataTable from '../components/BootstrapDataTable'
import { StatusBadge } from '../components/Badges'
import { fetchUsers, setUserPassword, updateUserApproval } from '../services/userService'

const toast = Swal.mixin({
  toast: true,
  position: 'center',
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true,
})

const primaryButtonClass = 'rounded-lg bg-[#ffc52f] px-4 py-3 font-extrabold text-[#2a003f] shadow-[0_10px_20px_rgba(255,197,47,0.24)] transition hover:bg-[#ffd966] disabled:cursor-not-allowed disabled:opacity-60'
const approveButtonClass = 'rounded-lg border border-green-200 bg-white px-3 py-2 text-sm font-bold text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50'
const rejectButtonClass = 'rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50'
const passwordButtonClass = 'rounded-lg border border-[#5c297c]/20 bg-white px-3 py-2 text-sm font-bold text-[#5c297c] transition hover:bg-[#f7f0ff] disabled:cursor-not-allowed disabled:opacity-50'

function UsersPage() {
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [updatingUserId, setUpdatingUserId] = useState(null)

  async function loadUsers() {
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      setUsers(await fetchUsers())
    } catch (requestError) {
      setError(requestError.message || 'Unable to load users.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isCurrentRequest = true

    fetchUsers()
      .then((data) => {
        if (isCurrentRequest) {
          setUsers(data)
          setError('')
          setMessage('')
        }
      })
      .catch((requestError) => {
        if (isCurrentRequest) {
          setError(requestError.message || 'Unable to load users.')
        }
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsLoading(false)
        }
      })

    return () => {
      isCurrentRequest = false
    }
  }, [])

  async function handleApprovalChange(userId, approvalStatus) {
    const actionLabel = approvalStatus === 'approved' ? 'approve' : 'reject'
    const result = await Swal.fire({
      title: `${actionLabel === 'approve' ? 'Approve' : 'Reject'} this user?`,
      text: `This will ${actionLabel} admin access for this account.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: actionLabel === 'approve' ? '#198754' : '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: actionLabel === 'approve' ? 'Yes, approve' : 'Yes, reject',
    })

    if (!result.isConfirmed) {
      return
    }

    setUpdatingUserId(userId)
    setError('')
    setMessage('')

    try {
      const updatedUser = await updateUserApproval(userId, approvalStatus)
      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
      )
      setMessage(`User ${approvalStatus === 'approved' ? 'approved' : 'rejected'} successfully.`)
      toast.fire({
        icon: 'success',
        title: `User ${approvalStatus === 'approved' ? 'approved' : 'rejected'} successfully.`,
      })
    } catch (requestError) {
      const errorMessage = requestError.message || 'Unable to update approval status.'
      setError(errorMessage)
      toast.fire({
        icon: 'error',
        title: errorMessage,
      })
    } finally {
      setUpdatingUserId(null)
    }
  }

  async function handleSetPassword(user) {
    const result = await Swal.fire({
      title: `Set password for ${user.name}`,
      input: 'password',
      inputLabel: 'New password',
      inputPlaceholder: 'Minimum 8 characters',
      inputAttributes: {
        autocapitalize: 'off',
        autocomplete: 'new-password',
        minlength: '8',
      },
      showCancelButton: true,
      confirmButtonColor: '#5c297c',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Save password',
      preConfirm: (value) => {
        if (!value || value.length < 8) {
          Swal.showValidationMessage('Password must be at least 8 characters.')
          return false
        }

        return value
      },
    })

    if (!result.isConfirmed) {
      return
    }

    setUpdatingUserId(user.id)
    setError('')
    setMessage('')

    try {
      const updatedUser = await setUserPassword(user.id, result.value)
      setUsers((currentUsers) =>
        currentUsers.map((currentUser) => (currentUser.id === updatedUser.id ? updatedUser : currentUser)),
      )
      setMessage('Password was set successfully.')
      toast.fire({ icon: 'success', title: 'Password was set successfully.' })
    } catch (requestError) {
      const errorMessage = requestError.message || 'Unable to set password.'
      setError(errorMessage)
      toast.fire({ icon: 'error', title: errorMessage })
    } finally {
      setUpdatingUserId(null)
    }
  }

  return (
    <article className="rounded-2xl border border-[#5c297c]/12 bg-white p-5 text-[#241433] shadow-[0_18px_50px_rgba(42,0,63,0.08)] xl:col-span-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0a733]">Access Control</p>
          <h3 className="m-0 text-xl font-bold text-[#3b0a57]">User Records</h3>
        </div>
        <button className={primaryButtonClass} type="button" onClick={loadUsers}>
          Refresh
        </button>
      </div>
      {error && <p className="form-error mt-3">{error}</p>}
      {message && <p className="form-note mt-3">{message}</p>}
      <BootstrapDataTable
        columns={[
          { key: 'id', label: 'ID', className: 'fw-semibold' },
          { key: 'name', label: 'Name', className: 'fw-bold' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role' },
          { key: 'access', label: 'Access' },
          { key: 'status', label: 'Status', render: (user) => <StatusBadge value={user.status} /> },
          { key: 'createdAt', label: 'Created' },
          {
            key: 'action',
            label: 'Action',
            headerClassName: 'text-end',
            className: 'text-end',
            render: (user) => (
              <div className="flex justify-end gap-2">
                <button
                  className={approveButtonClass}
                  type="button"
                  disabled={updatingUserId === user.id || user.status === 'approved'}
                  onClick={() => handleApprovalChange(user.id, 'approved')}
                >
                  {updatingUserId === user.id ? 'Saving...' : 'Approve'}
                </button>
                <button
                  className={rejectButtonClass}
                  type="button"
                  disabled={updatingUserId === user.id || user.status === 'rejected'}
                  onClick={() => handleApprovalChange(user.id, 'rejected')}
                >
                  {updatingUserId === user.id ? 'Saving...' : 'Reject'}
                </button>
                <button
                  className={passwordButtonClass}
                  type="button"
                  disabled={updatingUserId === user.id || user.status !== 'approved'}
                  onClick={() => handleSetPassword(user)}
                >
                  Password
                </button>
              </div>
            ),
          },
        ]}
        rows={users}
        isLoading={isLoading}
        emptyMessage="No admin users found."
      />
    </article>
  )
}

export default UsersPage
