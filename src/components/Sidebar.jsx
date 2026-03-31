import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Plus, Folder, MoreHorizontal, Pencil, Trash2, X, Search } from 'lucide-react'

/* ─── Portal dropdown — renders at document.body to escape overflow clipping ─── */
function ProjectMenu({ project, anchorRect, onRename, onDelete, onClose, menuRef }) {
  const MENU_WIDTH = 172
  const left = Math.min(anchorRect.right + 6, window.innerWidth - MENU_WIDTH - 8)
  const top  = anchorRect.top

  return createPortal(
    <div
      ref={menuRef}
      className="bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden"
      style={{ position: 'fixed', top, left, width: MENU_WIDTH, zIndex: 9999 }}
    >
      <button
        onMouseDown={(e) => { e.preventDefault(); onRename(project) }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-left"
      >
        <Pencil size={13} className="text-gray-400 flex-shrink-0" />
        Rename project
      </button>
      <div className="mx-3 border-t border-gray-100" />
      <button
        onMouseDown={(e) => { e.preventDefault(); onDelete(project); onClose() }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
      >
        <Trash2 size={13} className="flex-shrink-0" />
        Delete project
      </button>
    </div>,
    document.body
  )
}

export default function Sidebar({
  projects = [],
  activeProjectId = null,
  onNavigateToProject,
  onNavigateToDashboard,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}) {
  const [hoveredId,    setHoveredId]    = useState(null)
  const [openMenuId,   setOpenMenuId]   = useState(null)
  const [menuAnchor,   setMenuAnchor]   = useState(null)
  const [renamingId,   setRenamingId]   = useState(null)
  const [renameValue,  setRenameValue]  = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [searchQuery,  setSearchQuery]  = useState('')

  const menuRef   = useRef(null)
  const renameRef = useRef(null)

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!openMenuId) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
        setMenuAnchor(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenuId])

  /* Close dropdown on scroll */
  useEffect(() => {
    if (!openMenuId) return
    const handler = () => { setOpenMenuId(null); setMenuAnchor(null) }
    window.addEventListener('scroll', handler, true)
    return () => window.removeEventListener('scroll', handler, true)
  }, [openMenuId])

  /* Focus rename input when it appears */
  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.focus()
  }, [renamingId])

  const handleNewProject = () => {
    const id = onCreateProject?.()
    if (id != null) {
      setRenamingId(id)
      setRenameValue('New Project')
    }
  }

  const openMenu = (e, projectId) => {
    e.stopPropagation()
    if (openMenuId === projectId) {
      setOpenMenuId(null); setMenuAnchor(null)
    } else {
      setMenuAnchor(e.currentTarget.getBoundingClientRect())
      setOpenMenuId(projectId)
    }
  }

  const startRename = (project) => {
    setOpenMenuId(null); setMenuAnchor(null)
    setRenamingId(project.id)
    setRenameValue(project.name)
  }

  const commitRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== projects.find(p => p.id === renamingId)?.name) {
      onRenameProject?.(renamingId, trimmed)
    }
    setRenamingId(null)
  }

  const confirmDelete = () => {
    onDeleteProject?.(deleteTarget.id)
    setDeleteTarget(null)
  }

  const activeMenu = openMenuId ? projects.find(p => p.id === openMenuId) : null

  return (
    <>
      <aside className="flex flex-col h-screen w-[272px] flex-shrink-0 border-r border-gray-100 bg-white">

        {/* Section 1 — Logo */}
        <div className="flex items-center px-5 border-b border-gray-100 flex-shrink-0" style={{ height: 72 }}>
          <button
            onClick={onNavigateToDashboard}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#7133AE' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1.5" fill="white" />
                <rect x="9" y="2" width="5" height="5" rx="1.5" fill="white" fillOpacity="0.65" />
                <rect x="2" y="9" width="5" height="5" rx="1.5" fill="white" fillOpacity="0.65" />
                <rect x="9" y="9" width="5" height="5" rx="1.5" fill="white" fillOpacity="0.35" />
              </svg>
            </div>
            <span className="text-gray-900 font-semibold text-sm tracking-tight">MB Notetaker</span>
          </button>
        </div>

        {/* Section 2 — Projects */}
        <div className="flex-1 flex flex-col overflow-hidden px-3 py-4">

          {/* ── Fixed top: label + New Project + search ── */}
          <div className="flex-shrink-0">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2 mb-2 block">
              Projects
            </span>

            {/* New Project button */}
            <button
              onClick={handleNewProject}
              className="group flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-left w-full transition-all duration-150 cursor-pointer hover:bg-gray-50 mb-1"
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-gray-100">
                <Plus size={13} strokeWidth={2.5} className="text-gray-400" />
              </div>
              <span className="text-sm font-medium flex-1 truncate text-gray-500 group-hover:text-gray-700 transition-colors">
                New Project
              </span>
            </button>

            {/* Search */}
            <div className="relative mb-2">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects…"
                className="w-full pl-7 pr-3 py-2 text-xs rounded-lg bg-gray-50 border border-gray-100 text-gray-700 placeholder-gray-400 outline-none focus:border-purple-300 focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* ── Scrollable project list ── */}
          <nav className="sidebar-nav flex flex-col gap-1 overflow-y-auto flex-1">
            {/* Project list */}
            {projects.filter(p =>
              p.name.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((project) => {
              const isActive   = project.id === activeProjectId
              const isHovered  = hoveredId === project.id
              const isRenaming = renamingId === project.id
              const menuOpen   = openMenuId === project.id

              return (
                <div
                  key={project.id}
                  className="relative"
                  onMouseEnter={() => setHoveredId(project.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <button
                    onClick={() => { if (!isRenaming) onNavigateToProject?.(project.id) }}
                    className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-left w-full transition-all duration-150 cursor-pointer"
                    style={{
                      backgroundColor: isActive ? '#7133AE0F' : isHovered || menuOpen ? '#f9fafb' : 'transparent',
                    }}
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-gray-100">
                      <Folder size={13} strokeWidth={2} className="text-gray-400" />
                    </div>

                    {/* Name or inline rename input */}
                    {isRenaming ? (
                      <input
                        ref={renameRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename()
                          if (e.key === 'Escape') setRenamingId(null)
                          e.stopPropagation()
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-sm font-medium bg-white border border-gray-300 rounded px-1.5 py-0.5 outline-none focus:border-purple-400 min-w-0"
                        style={{ color: '#374151' }}
                      />
                    ) : (
                      <span
                        className="text-sm font-medium flex-1 truncate transition-colors"
                        style={{ color: isActive ? '#7133AE' : '#374151' }}
                      >
                        {project.name}
                      </span>
                    )}

                    {/* ⋯ button — visible on row hover or when menu is open */}
                    {!isRenaming && (isHovered || menuOpen) && (
                      <button
                        onClick={(e) => openMenu(e, project.id)}
                        className="flex items-center justify-center w-5 h-5 rounded transition-colors cursor-pointer flex-shrink-0"
                        style={{
                          backgroundColor: menuOpen ? '#f3e8ff' : 'transparent',
                          color: menuOpen ? '#7133AE' : 'rgba(107,114,128,0.7)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3e8ff'; e.currentTarget.style.color = '#7133AE' }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = menuOpen ? '#f3e8ff' : 'transparent'
                          e.currentTarget.style.color = menuOpen ? '#7133AE' : 'rgba(107,114,128,0.7)'
                        }}
                      >
                        <MoreHorizontal size={13} />
                      </button>
                    )}
                  </button>
                </div>
              )
            })}

            {/* No results */}
            {searchQuery && projects.filter(p =>
              p.name.toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4 px-2">
                No projects match "<span className="font-medium">{searchQuery}</span>"
              </p>
            )}
          </nav>
        </div>

        {/* Section 3 — Bottom: User profile + notification */}
        <div className="border-t border-gray-100 px-3 py-4">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold"
              style={{ backgroundColor: '#7133AE' }}
            >
              PK
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate leading-tight">Pavan K.</p>
              <p className="text-xs text-gray-400 truncate leading-tight">pavan@company.com</p>
            </div>
            <button className="relative flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <Bell size={17} className="text-gray-400 hover:text-gray-600 transition-colors" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 border border-white" />
            </button>
          </div>
        </div>

      </aside>

      {/* Portal dropdown — rendered at body level, never clipped */}
      {activeMenu && menuAnchor && (
        <ProjectMenu
          project={activeMenu}
          anchorRect={menuAnchor}
          menuRef={menuRef}
          onRename={startRename}
          onDelete={(p) => setDeleteTarget(p)}
          onClose={() => { setOpenMenuId(null); setMenuAnchor(null) }}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                  <Trash2 size={18} className="text-red-500" />
                </div>
                <h3 className="text-gray-900 font-semibold text-base">Delete project?</h3>
                <p className="text-sm text-gray-500 mt-1 leading-snug">
                  <span className="font-medium text-gray-700">"{deleteTarget.name}"</span> and all its meetings will be permanently deleted. This can't be undone.
                </p>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0 ml-2"
              >
                <X size={15} className="text-gray-400" />
              </button>
            </div>
            <div className="flex gap-2.5 px-6 pb-6">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer"
                style={{ backgroundColor: '#DC2626' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#B91C1C' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#DC2626' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
