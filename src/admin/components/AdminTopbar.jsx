function AdminTopbar({ isProfileOpen, onProfileToggle, onLogout }) {
  return (
    <header className="nexus-topbar flex h-[52px] items-center justify-between border-b border-white/10 bg-[#3b0a57] px-5 text-white">
      <div className="flex items-center gap-5">
        <button className="text-2xl text-white/80" type="button" aria-label="Open menu">
          &#9776;
        </button>
        <label className="relative hidden sm:block">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ffc52f]">Q</span>
          <input
            className="h-9 w-48 rounded border border-[#ffc52f]/30 bg-[#2a003f] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/60 focus:border-[#ffc52f] md:w-64"
            type="search"
            placeholder="Search"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-lg sm:inline">US</span>
        <button className="hidden h-8 w-8 place-items-center rounded-full border border-[#ffc52f]/30 text-sm text-white sm:grid" type="button" aria-label="Theme">
          C
        </button>
        <button className="hidden h-8 w-8 place-items-center rounded-full border border-[#ffc52f]/30 text-sm text-white sm:grid" type="button" aria-label="Settings">
          S
        </button>
        <button className="relative hidden h-8 w-8 place-items-center rounded-full border border-[#ffc52f]/30 text-sm text-white sm:grid" type="button" aria-label="Notifications">
          N
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#f20b5f]"></span>
        </button>
        <div className="relative">
          <button
            className="flex items-center gap-2 border-0 bg-transparent text-left"
            type="button"
            aria-label="Open admin profile menu"
            aria-expanded={isProfileOpen}
            onClick={onProfileToggle}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#ffc52f] to-[#f20b5f] font-black text-white">
              AD
            </span>
            <span className="hidden leading-tight md:grid">
              <strong className="text-sm text-white">Admin</strong>
              <span className="text-xs text-[#ffc52f]">Team</span>
            </span>
          </button>
          {isProfileOpen && (
            <div className="absolute right-0 top-[calc(100%+12px)] z-20 w-72 rounded-xl border border-[#ffc52f]/30 bg-[#2a003f] p-4 shadow-2xl shadow-black/40">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[#ffc52f] to-[#f20b5f] font-black text-white" aria-hidden="true">
                  AD
                </div>
                <div className="grid gap-1">
                  <strong className="text-white">Admin User</strong>
                  <span className="text-sm text-[#ffc52f]">admin@mcu.edu.ph</span>
                </div>
              </div>
              <button
                className="mt-3 w-full rounded-lg border-0 bg-[#ffc52f] px-4 py-3 text-left font-black text-[#2a003f] hover:bg-[#ffd966]"
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
