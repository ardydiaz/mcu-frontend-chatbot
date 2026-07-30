import apiFetch from '../../services/apiClient'

function formatDate(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function mapUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    access: user.role === 'admin' ? 'Admin Dashboard' : 'Chatbot',
    status: user.approvalStatus || 'pending',
    createdAt: formatDate(user.createdAt),
    raw: user,
  }
}

async function fetchUsers() {
  const data = await apiFetch('/api/users')

  return (data.users || []).map(mapUser)
}

async function updateUserApproval(userId, approvalStatus) {
  if (approvalStatus === 'approved') {
    const data = await apiFetch('/api/users/approve', {
      method: 'PATCH',
      body: { userId },
    })

    return mapUser(data.user)
  }

  const data = await apiFetch(`/api/users/${userId}/approval`, {
    method: 'PATCH',
    body: { approvalStatus },
  })

  return mapUser(data.user)
}

async function setUserPassword(userId, password) {
  const data = await apiFetch('/api/users/password', {
    method: 'PATCH',
    body: { userId, password },
  })

  return mapUser(data.user)
}

export { fetchUsers, setUserPassword, updateUserApproval }


