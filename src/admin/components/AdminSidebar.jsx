import { useState } from 'react'

function AdminSidebar({ activeView, onViewChange, onLogout }) {
  const [openMenus, setOpenMenus] = useState({ embed: true })
  const sections = [
    {
      title: 'Admin',
      items: [
        { label: 'Documents', view: 'documents', icon: 'D' },
        { label: 'Website Importer', view: 'websiteImport', icon: 'I' },
        {
          label: 'Embed Generator',
          icon: 'E',
          children: [
            { label: 'Chatbot Generator', view: 'embedGenerator', icon: 'C' },
            { label: 'Website Access', view: 'websiteAccess', icon: 'W' },
            { label: 'Scope Management', view: 'scopeManagement', icon: 'S' },
          ],
          menuKey: 'embed',
        },
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
              const childViews = item.children?.map((child) => child.view) || []
              const isChildActive = childViews.includes(activeView)
              const isActive = activeView === item.view || isChildActive || (activeView === 'upload' && item.view === 'documents')
              const isOpen = item.menuKey ? openMenus[item.menuKey] : false

              if (item.children) {
                return (
                  <div className="grid gap-1" key={`${section.title}-${item.label}`}>
                    <button
                      className={`flex items-center justify-between rounded-md px-2.5 py-2 text-left text-sm font-bold transition ${
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/85 hover:bg-white/10 hover:text-white'
                      }`}
                      type="button"
                      onClick={() => {
                        setOpenMenus((current) => ({
                          ...current,
                          [item.menuKey]: !current[item.menuKey],
                        }))
                      }}
                      aria-expanded={isOpen}
                    >
                      <span className="flex items-center gap-3">
                        <span className="grid h-5 w-5 place-items-center rounded border border-[#ffc52f]/30 text-[0.65rem] text-white">
                          {item.icon}
                        </span>
                        {item.label}
                      </span>
                      <span className={isActive || isOpen ? 'text-[#ffc52f]' : 'text-white/60'}>
                        {isOpen ? '⌄' : '›'}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="ml-4 grid gap-1 border-l border-[#ffc52f]/20 pl-3">
                        {item.children.map((child) => {
                          const isChildSelected = activeView === child.view

                          return (
                            <button
                              className={`flex items-center justify-between rounded-md px-2.5 py-2 text-left text-xs font-bold transition ${
                                isChildSelected
                                  ? 'bg-[#ffc52f] text-[#2a003f]'
                                  : 'text-white/75 hover:bg-white/10 hover:text-white'
                              }`}
                              type="button"
                              key={`${item.label}-${child.label}`}
                              onClick={() => onViewChange(child.view)}
                            >
                              <span className="flex items-center gap-3">
                                <span className={`grid h-5 w-5 place-items-center rounded border text-[0.65rem] ${
                                  isChildSelected
                                    ? 'border-[#2a003f]/20 text-[#2a003f]'
                                    : 'border-[#ffc52f]/30 text-white'
                                }`}>
                                  {child.icon}
                                </span>
                                {child.label}
                              </span>
                              <span className={isChildSelected ? 'text-[#2a003f]' : 'text-[#ffc52f]'}>&rsaquo;</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

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

      <div className="mt-auto border-t border-white/10 p-3">
        <button
          className="flex w-full items-center justify-between rounded-md border border-[#ffc52f]/30 px-2.5 py-2 text-left text-sm font-bold text-[#ffc52f] transition hover:bg-white/10 hover:text-white"
          type="button"
          onClick={onLogout}
        >
          <span>Logout</span>
          <span aria-hidden="true">&rsaquo;</span>
        </button>
      </div>
    </aside>
  )
}

export default AdminSidebar
