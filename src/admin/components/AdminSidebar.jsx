import { useState } from 'react'
import mcuHorizontalLogo from '../../assets/mcu-horizontal-reverse.png'
import { adminNavigationSections } from '../config/navigation'

function AdminSidebar({ activeView, onViewChange, onLogout }) {
  const [openMenus, setOpenMenus] = useState({ embed: true })

  return (
    <aside className="nexus-sidebar flex flex-col border-r border-white/10 bg-[#300045] text-white">
      <div className="flex h-[52px] items-center justify-between border-b border-white/10 px-5">
        <div className="flex items-center gap-2">
          <img className="admin-sidebar-logo" src={mcuHorizontalLogo} alt="Manila Central University" />
        </div>
      </div>

      <nav className="grid gap-5 p-3" aria-label="Admin navigation">
        {adminNavigationSections.map((section) => (
          <div className="grid gap-1" key={section.title}>
            <p className="mb-2 px-2 text-xs font-bold text-[#FFBA2E]">{section.title}</p>
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
                        <span className="grid h-5 w-5 place-items-center rounded border border-[#FFBA2E]/30 text-[0.65rem] text-white">
                          {item.icon}
                        </span>
                        {item.label}
                      </span>
                      <span className={isActive || isOpen ? 'text-[#FFBA2E]' : 'text-white/60'}>
                        {isOpen ? String.fromCharCode(8964) : String.fromCharCode(8250)}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="ml-4 grid gap-1 border-l border-[#FFBA2E]/20 pl-3">
                        {item.children.map((child) => {
                          const isChildSelected = activeView === child.view

                          return (
                            <button
                              className={`flex items-center justify-between rounded-md px-2.5 py-2 text-left text-xs font-bold transition ${
                                isChildSelected
                                  ? 'bg-[#FFBA2E] text-[#300045]'
                                  : 'text-white/75 hover:bg-white/10 hover:text-white'
                              }`}
                              type="button"
                              key={`${item.label}-${child.label}`}
                              onClick={() => onViewChange(child.view)}
                            >
                              <span className="flex items-center gap-3">
                                <span className={`grid h-5 w-5 place-items-center rounded border text-[0.65rem] ${
                                  isChildSelected
                                    ? 'border-[#300045]/20 text-[#300045]'
                                    : 'border-[#FFBA2E]/30 text-white'
                                }`}>
                                  {child.icon}
                                </span>
                                {child.label}
                              </span>
                              <span className={isChildSelected ? 'text-[#300045]' : 'text-[#FFBA2E]'}>&rsaquo;</span>
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
                      ? 'bg-[#FFBA2E] text-[#300045]'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`}
                  type="button"
                  key={`${section.title}-${item.label}`}
                  onClick={() => onViewChange(item.view)}
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-5 w-5 place-items-center rounded border border-[#FFBA2E]/30 text-[0.65rem] text-white">
                      {item.icon}
                    </span>
                    {item.label}
                  </span>
                  <span className={isActive ? 'text-[#300045]' : 'text-[#FFBA2E]'}>&rsaquo;</span>
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/10 p-3">
        <button
          className="flex w-full items-center justify-between rounded-md border border-[#FFBA2E]/30 px-2.5 py-2 text-left text-sm font-bold text-[#FFBA2E] transition hover:bg-white/10 hover:text-white"
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


