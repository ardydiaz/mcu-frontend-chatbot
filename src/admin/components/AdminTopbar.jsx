function getInitials(name = '', email = '') {
  const source = name || email
  const parts = source
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return 'A'
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function formatRole(role) {
  if (role === 'admin') {
    return 'Admin'
  }

  if (role === 'student') {
    return 'Student'
  }

  return 'User'
}

function AdminTopbar({ currentUser, isProfileOpen, onProfileToggle, onLogout }) {
  const displayName = currentUser?.name || currentUser?.email || 'Admin'
  const displayEmail = currentUser?.email || ''
  const displayRole = formatRole(currentUser?.role)
  const initials = getInitials(currentUser?.name, currentUser?.email)
  const photoUrl = currentUser?.photoUrl

  return (
    <header className="nexus-topbar flex h-[52px] items-center justify-between border-b border-white/10 bg-[#300045] px-5 text-white">
      <div className="flex items-center gap-5">
        <button className="text-2xl text-white/80" type="button" aria-label="Open menu">
          &#9776;
        </button>
        <label className="relative hidden sm:block">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FFBA2E]">Q</span>
          <input
            className="h-9 w-48 rounded border border-[#FFBA2E]/30 bg-[#300045] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/60 focus:border-[#FFBA2E] md:w-64"
            type="search"
            placeholder="Search"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            className="flex items-center gap-2 border-0 bg-transparent text-left"
            type="button"
            aria-label="Open admin profile menu"
            aria-expanded={isProfileOpen}
            onClick={onProfileToggle}
          >
            {photoUrl ? (
              <img
                className="h-9 w-9 rounded-full object-cover"
                src={photoUrl}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#FFBA2E] to-[#F20F5B] font-black text-white">
                {initials}
              </span>
            )}
            <span className="hidden leading-tight md:grid">
              <strong className="max-w-40 truncate text-sm text-white">{displayName}</strong>
              <span className="text-xs text-[#FFBA2E]">{displayRole}</span>
            </span>
          </button>
          {isProfileOpen && (
            <div className="absolute right-0 top-[calc(100%+12px)] z-20 w-72 rounded-xl border border-[#FFBA2E]/30 bg-[#300045] p-4 shadow-2xl shadow-black/40">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                {photoUrl ? (
                  <img
                    className="h-12 w-12 rounded-full object-cover"
                    src={photoUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[#FFBA2E] to-[#F20F5B] font-black text-white" aria-hidden="true">
                    {initials}
                  </div>
                )}
                <div className="grid min-w-0 gap-1">
                  <strong className="truncate text-white">{displayName}</strong>
                  {displayEmail && <span className="truncate text-sm text-[#FFBA2E]">{displayEmail}</span>}
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/60">{displayRole}</span>
                </div>
              </div>
              <button
                className="mt-3 w-full rounded-lg border-0 bg-[#FFBA2E] px-4 py-3 text-left font-black text-[#300045] hover:bg-[#FFD400]"
                type="button"
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default AdminTopbar

