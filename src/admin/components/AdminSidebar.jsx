function AdminSidebar({ activeView, onViewChange }) {
  const sections = [
    {
      title: 'Admin',
      items: [
        { label: 'Documents', view: 'documents', icon: 'D' },
        { label: 'Chat History', view: 'chatLogs', icon: 'C' },
        { label: 'User Records', view: 'users', icon: 'U' },
      ],
    },
  ]

  return (
    <aside className="nexus-sidebar flex flex-col border-r border-white/10 bg-[#2a003f] text-white">
      <div className="flex h-[52px] items-center justify-between border-b border-white/10 px-5">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg border border-[#ffc52f]/50 bg-[#ffc52f]/10 text-sm font-black text-[#ffc52f]">
            N
          </div>
          <h1 className="m-0 text-2xl font-black leading-none text-white">Nexus</h1>
        </div>
        <button className="rounded border border-[#ffc52f]/30 px-1.5 py-0.5 text-xs text-[#ffc52f]" type="button">
          K
        </button>
      </div>

      <nav className="grid gap-5 p-3" aria-label="Admin navigation">
        {sections.map((section) => (
          <div className="grid gap-1" key={section.title}>
            <p className="mb-2 px-2 text-xs font-bold text-[#ffc52f]">{section.title}</p>
            {section.items.map((item) => {
              const isActive = activeView === item.view || (activeView === 'upload' && item.view === 'documents')

              return (
                <button
                  className={`flex items-center justify-between rounded-md px-2.5 py-2 text-left text-sm font-bold transition ${
                    isActive
                      ? 'bg-[#ffc52f] text-[#2a003f]'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`}
                  type="button"
                  key={`${section.title}-${item.label}`}
                  onClick={() => onViewChange(item.view)}
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-5 w-5 place-items-center rounded border border-[#ffc52f]/30 text-[0.65rem] text-white">
                      {item.icon}
                    </span>
                    {item.label}
                  </span>
                  <span className={isActive ? 'text-[#2a003f]' : 'text-[#ffc52f]'}>&rsaquo;</span>
                </button>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}

export default AdminSidebar
