import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Folder, Mic, Clock, ChevronRight, CalendarDays, Pencil,
  FileText, FolderOpen, Plus, MoreHorizontal, Trash2, X,
  Search, Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Code, List, ListOrdered, Quote, Minus,
} from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import UnderlineExt from '@tiptap/extension-underline'
import Sidebar from '../components/Sidebar'

/* ─────────────────────────────────────────────
   DATE GROUP LABEL
───────────────────────────────────────────── */
function formatDateGroup(dateKey) {
  const today     = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateKey === today)     return 'Today'
  if (dateKey === yesterday) return 'Yesterday'
  const d = new Date(dateKey)
  return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/* ─────────────────────────────────────────────
   EDITABLE DESCRIPTION
───────────────────────────────────────────── */
function EditableDescription({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const divRef = useRef(null)

  useEffect(() => { setEditing(false) }, [value])

  useEffect(() => {
    if (!editing || !divRef.current) return
    const el = divRef.current
    el.innerText = value || ''
    el.focus()
    const range = document.createRange()
    const sel   = window.getSelection()
    range.selectNodeContents(el)
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    const text = divRef.current?.innerText?.trim() || ''
    setEditing(false)
    if (text !== (value || '')) onSave(text)
  }

  const cancel = () => {
    if (divRef.current) divRef.current.innerText = value || ''
    setEditing(false)
  }

  if (editing) {
    return (
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() }
          if (e.key === 'Escape') { e.preventDefault(); cancel() }
        }}
        data-placeholder="Add a description…"
        className="text-sm text-gray-500 outline-none border-b border-purple-400 leading-relaxed w-full block empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:italic"
        style={{ maxHeight: 46, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowX: 'hidden' }}
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Click to edit description"
      className="cursor-text w-full text-left overflow-hidden"
    >
      <p className={[
        'text-xs truncate',
        value ? 'text-gray-400 hover:text-gray-600' : 'text-gray-300 italic',
        'transition-colors',
      ].join(' ')}>
        {value || 'Add a description…'}
      </p>
    </button>
  )
}

/* ─────────────────────────────────────────────
   EMPTY STATES
───────────────────────────────────────────── */
const EmptyRecordings = () => (
  <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-44 h-auto">
    <rect x="30" y="40" width="140" height="100" rx="12" fill="#7133AE" fillOpacity="0.06" stroke="#7133AE" strokeOpacity="0.15" strokeWidth="1.5" />
    <rect x="50" y="62" width="60" height="8"  rx="4" fill="#7133AE" fillOpacity="0.25" />
    <rect x="50" y="78" width="100" height="6" rx="3" fill="#7133AE" fillOpacity="0.12" />
    <rect x="50" y="90" width="80"  height="6" rx="3" fill="#7133AE" fillOpacity="0.09" />
    <rect x="50" y="102" width="90" height="6" rx="3" fill="#7133AE" fillOpacity="0.07" />
    <circle cx="100" cy="150" r="18" fill="#7133AE" fillOpacity="0.08" stroke="#7133AE" strokeOpacity="0.2" strokeWidth="1.5" />
    <rect x="93" y="142" width="14" height="18" rx="7" fill="#7133AE" fillOpacity="0.5" />
    <path d="M89 158c0 6.075 4.925 11 11 11s11-4.925 11-11" stroke="#7133AE" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="99" y="169" width="2"  height="5"  rx="1" fill="#7133AE" fillOpacity="0.4" />
    <rect x="95" y="174" width="10" height="2"  rx="1" fill="#7133AE" fillOpacity="0.4" />
  </svg>
)

const EmptyWorkspace = () => (
  <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-40 h-auto">
    <rect x="40" y="50" width="120" height="90" rx="10" fill="#7133AE" fillOpacity="0.06" stroke="#7133AE" strokeOpacity="0.15" strokeWidth="1.5" />
    <rect x="58" y="70" width="84" height="7"  rx="3.5" fill="#7133AE" fillOpacity="0.25" />
    <rect x="58" y="84" width="60" height="5"  rx="2.5" fill="#7133AE" fillOpacity="0.13" />
    <rect x="58" y="95" width="72" height="5"  rx="2.5" fill="#7133AE" fillOpacity="0.10" />
    <rect x="58" y="106" width="50" height="5" rx="2.5" fill="#7133AE" fillOpacity="0.08" />
  </svg>
)

/* ─────────────────────────────────────────────
   WORKSPACE FOLDER CONTEXT MENU (portal)
───────────────────────────────────────────── */
function FolderMenu({ folder, anchorRect, onNewPage, onRename, onDelete, onClose, menuRef }) {
  const MENU_WIDTH = 160
  const left = Math.min(anchorRect.right + 6, window.innerWidth - MENU_WIDTH - 8)
  const top  = anchorRect.top

  return createPortal(
    <div
      ref={menuRef}
      className="bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden"
      style={{ position: 'fixed', top, left, width: MENU_WIDTH, zIndex: 9999 }}
    >
      <button
        onMouseDown={(e) => { e.preventDefault(); onNewPage(folder.id); onClose() }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-left"
      >
        <Plus size={13} className="text-gray-400 flex-shrink-0" />
        New Page
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); onRename(folder) }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-left"
      >
        <Pencil size={13} className="text-gray-400 flex-shrink-0" />
        Rename
      </button>
      <div className="mx-3 border-t border-gray-100" />
      <button
        onMouseDown={(e) => { e.preventDefault(); onDelete(folder); onClose() }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
      >
        <Trash2 size={13} className="flex-shrink-0" />
        Delete
      </button>
    </div>,
    document.body
  )
}

/* ─────────────────────────────────────────────
   INLINE PAGE EDITOR (Tiptap, embedded in workspace split view)
───────────────────────────────────────────── */
function InlinePageEditor({ page, onUpdate }) {
  const [saveStatus, setSaveStatus]   = useState('saved')
  const saveTimerRef = useRef(null)
  const pageRef      = useRef(page)
  useEffect(() => { pageRef.current = page }, [page])

  /* ── Editable title ── */
  const titleRef = useRef(null)

  // Keep the DOM in sync when a different page is selected
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.innerText = page?.title || 'Untitled'
    }
  }, [page?.id]) // eslint-disable-line

  const saveTitle = () => {
    const newTitle = titleRef.current?.innerText?.trim() || 'Untitled'
    if (newTitle !== (pageRef.current?.title || 'Untitled')) {
      const updated = { ...pageRef.current, title: newTitle, updatedAt: new Date().toISOString() }
      onUpdate?.(updated)
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: page?.content || '',
    onUpdate: ({ editor }) => {
      setSaveStatus('saving')
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        onUpdate?.({ ...pageRef.current, content: editor.getHTML(), updatedAt: new Date().toISOString() })
        setSaveStatus('saved')
      }, 800)
    },
  })

  useEffect(() => {
    if (editor && page?.id) {
      editor.commands.setContent(page.content || '', false)
    }
  }, [page?.id]) // eslint-disable-line

  useEffect(() => () => clearTimeout(saveTimerRef.current), [])

  if (!editor) return null

  const ToolBtn = ({ action, isActive, title, children }) => (
    <button
      onMouseDown={(e) => { e.preventDefault(); action() }}
      title={title}
      className="flex items-center justify-center w-7 h-7 rounded-md transition-colors cursor-pointer"
      style={{ backgroundColor: isActive ? '#7133AE12' : 'transparent', color: isActive ? '#7133AE' : '#6b7280' }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7133AE12'; e.currentTarget.style.color = '#7133AE' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isActive ? '#7133AE12' : 'transparent'; e.currentTarget.style.color = isActive ? '#7133AE' : '#6b7280' }}
    >{children}</button>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Title + save status */}
      <div className="px-10 pt-8 pb-2 flex-shrink-0 flex items-start justify-between gap-4">
        <h1
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          data-placeholder="Untitled"
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); titleRef.current?.blur() }
            if (e.key === 'Escape') {
              titleRef.current.innerText = pageRef.current?.title || 'Untitled'
              titleRef.current?.blur()
            }
          }}
          className="text-2xl font-bold text-gray-900 leading-tight outline-none cursor-text flex-1 min-w-0 focus:border-b-2 focus:border-purple-300 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 transition-colors"
          style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
        >
          {page.title || 'Untitled'}
        </h1>
        <span className="text-xs text-gray-300 mt-2 flex-shrink-0">
          {saveStatus === 'saving' ? 'Saving…' : 'All changes saved'}
        </span>
      </div>

      {/* Toolbar */}
      <div className="px-10 pb-4 flex-shrink-0">
        <div className="flex items-center gap-0.5 px-2 py-1.5 bg-white border border-gray-100 rounded-xl shadow-sm w-fit flex-wrap">
          <ToolBtn action={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold"><Bold size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn action={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic"><Italic size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn action={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline"><UnderlineIcon size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn action={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strike"><Strikethrough size={13} strokeWidth={2.5} /></ToolBtn>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <ToolBtn action={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List"><List size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn action={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Ordered List"><ListOrdered size={13} strokeWidth={2.5} /></ToolBtn>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <ToolBtn action={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Code"><Code size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn action={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Blockquote"><Quote size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn action={() => editor.chain().focus().setHorizontalRule().run()} isActive={false} title="Divider"><Minus size={13} strokeWidth={2.5} /></ToolBtn>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto px-10 pb-10">
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   WORKSPACE TAB — split panel (sidebar nav + inline editor)
───────────────────────────────────────────── */
function WorkspaceTab({
  projectId,
  folders,
  pages,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onCreatePage,
  onDeletePage,
  onUpdatePage,
}) {
  const [expandedId,       setExpandedId]        = useState(null)   // accordion — only one open
  const [selectedPageId,   setSelectedPageId]   = useState(null)
  const [searchQuery,      setSearchQuery]       = useState('')
  const [openMenuId,       setOpenMenuId]        = useState(null)
  const [menuAnchor,       setMenuAnchor]        = useState(null)
  const [renamingId,       setRenamingId]        = useState(null)
  const [renameValue,      setRenameValue]       = useState('')
  const [hoveredId,        setHoveredId]         = useState(null)
  const [deleteTarget,     setDeleteTarget]      = useState(null)
  const [deletePageTarget, setDeletePageTarget]  = useState(null)

  const menuRef   = useRef(null)
  const renameRef = useRef(null)

  useEffect(() => {
    if (!openMenuId) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null); setMenuAnchor(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenuId])

  useEffect(() => {
    if (!openMenuId) return
    const handler = () => { setOpenMenuId(null); setMenuAnchor(null) }
    window.addEventListener('scroll', handler, true)
    return () => window.removeEventListener('scroll', handler, true)
  }, [openMenuId])

  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.focus()
  }, [renamingId])

  useEffect(() => { setExpandedId(null); setSelectedPageId(null) }, [projectId])

  const toggleExpand = (folderId) => {
    setExpandedId(prev => prev === folderId ? null : folderId)
  }

  const openMenu = (e, folderId) => {
    e.stopPropagation()
    if (openMenuId === folderId) { setOpenMenuId(null); setMenuAnchor(null) }
    else { setMenuAnchor(e.currentTarget.getBoundingClientRect()); setOpenMenuId(folderId) }
  }

  const startRename = (folder) => {
    setOpenMenuId(null); setMenuAnchor(null)
    setRenamingId(folder.id); setRenameValue(folder.name)
  }

  const commitRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== folders.find(f => f.id === renamingId)?.name) {
      onRenameFolder?.(renamingId, trimmed)
    }
    setRenamingId(null)
  }

  const handleCreateFolder = () => {
    const id = onCreateFolder?.()
    if (id != null) {
      setRenamingId(id); setRenameValue('New Folder')
      setExpandedId(id)
    }
  }

  const handleCreatePage = (folderId) => {
    setExpandedId(folderId)
    const id = onCreatePage?.(folderId)
    if (id != null) setSelectedPageId(id)
  }

  const handleDeleteFolder = () => {
    if (selectedPageId && pages.find(p => p.id === selectedPageId)?.folderId === deleteTarget.id) {
      setSelectedPageId(null)
    }
    onDeleteFolder?.(deleteTarget.id)
    setDeleteTarget(null)
  }

  const activeMenu    = openMenuId ? folders.find(f => f.id === openMenuId) : null
  const selectedPage  = selectedPageId ? pages.find(p => p.id === selectedPageId) : null
  const filteredFolders = folders.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-full">

      {/* ── Left panel: folder / page navigator ── */}
      <div className="w-72 border-r border-gray-100 flex flex-col bg-white flex-shrink-0 overflow-hidden px-4">

        {/* Header — matches sidebar spacing exactly */}
        <div className="pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between px-0 mb-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Folders</span>
            <button
              onClick={handleCreateFolder}
              className="flex items-center gap-1 text-xs font-medium cursor-pointer transition-colors hover:opacity-80"
              style={{ color: '#7133AE' }}
            >
              <Plus size={12} strokeWidth={2.5} />
              New Folder
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search folders…"
              className="w-full pl-7 pr-3 py-2 text-xs rounded-lg bg-gray-50 border border-gray-100 text-gray-700 placeholder-gray-400 outline-none focus:border-purple-300 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Folder list — matches sidebar nav */}
        <nav className="workspace-folder-nav flex-1 overflow-y-auto pb-4 flex flex-col gap-1">
          {folders.length === 0 && (
            <div className="text-center py-8 px-4">
              <FolderOpen size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-xs text-gray-400 mb-1">No folders yet</p>
              <button onClick={handleCreateFolder} className="text-xs cursor-pointer" style={{ color: '#7133AE' }}>
                Create your first folder
              </button>
            </div>
          )}

          {filteredFolders.map(folder => {
            const isExpanded = expandedId === folder.id
            const isRenaming = renamingId === folder.id
            const menuOpen   = openMenuId === folder.id
            const isHovered  = hoveredId === folder.id
            const folderPages = pages.filter(p => p.folderId === folder.id)

            return (
              <div key={folder.id} >
                {/* Folder row — same layout as sidebar project rows */}
                <div
                  className="relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 select-none"
                  style={{
                    backgroundColor: isExpanded ? '#7133AE0F' : isHovered || menuOpen ? '#f9fafb' : 'transparent',
                  }}
                  onMouseEnter={() => setHoveredId(folder.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => { if (!isRenaming) toggleExpand(folder.id) }}
                >
                  <ChevronRight
                    size={12} strokeWidth={2}
                    className="flex-shrink-0 transition-transform duration-150"
                    style={{
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      color: isExpanded ? '#7133AE' : '#9ca3af',
                    }}
                  />
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-gray-100">
                    <FolderOpen size={13} strokeWidth={2} style={{ color: isExpanded ? '#7133AE' : '#9ca3af' }} />
                  </div>

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
                    />
                  ) : (
                    <span
                      className="flex-1 text-sm font-medium truncate transition-colors"
                      style={{ color: isExpanded ? '#7133AE' : '#374151' }}
                    >
                      {folder.name}
                    </span>
                  )}

                  {!isRenaming && (isHovered || menuOpen) && (
                    <button
                      onClick={(e) => openMenu(e, folder.id)}
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
                </div>

                {/* Pages nested under folder (accordion — only this folder) */}
                {isExpanded && (
                  <div className="ml-[40px] mb-2 mt-2">
                    {folderPages.map(pg => {
                      const isSelected = selectedPageId === pg.id
                      return (
                        <div
                          key={pg.id}
                          className="group flex items-center gap-2 px-2 py-1.5 mb-2  rounded-lg cursor-pointer transition-colors"
                          style={{ backgroundColor: isSelected ? '#7133AE0F' : 'transparent' }}
                          onClick={() => setSelectedPageId(pg.id)}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f9fafb' }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? '#7133AE0F' : 'transparent' }}
                        >
                          <FileText size={12} className="flex-shrink-0 transition-colors" style={{ color: isSelected ? '#7133AE' : '#9ca3af' }} />
                          <span className="flex-1 text-xs font-medium truncate transition-colors" style={{ color: isSelected ? '#7133AE' : '#6b7280' }}>
                            {pg.title || 'Untitled'}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletePageTarget(pg) }}
                            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 size={11} className="text-gray-300 hover:text-red-500 transition-colors" />
                          </button>
                        </div>
                      )
                    })}

                    {/* New Page row */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCreatePage(folder.id) }}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer w-full text-left transition-colors hover:bg-gray-50"
                    >
                      <Plus size={11} strokeWidth={2.5} style={{ color: '#7133AE' }} />
                      <span className="text-xs font-medium" style={{ color: '#7133AE' }}>New Page</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {searchQuery && filteredFolders.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4 px-2">
              No folders match "{searchQuery}"
            </p>
          )}
        </nav>
      </div>

      {/* ── Right panel: editor or empty state ── */}
      <div className="flex-1 overflow-hidden">
        {selectedPage ? (
          <InlinePageEditor page={selectedPage} onUpdate={onUpdatePage} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8 bg-gray-50">
            <EmptyWorkspace />
            <p className="text-gray-700 font-semibold text-base">Select a page to start editing</p>
            <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
              Choose a page from the folder list, or create a new folder and page.
            </p>
          </div>
        )}
      </div>

      {/* Context menu portal */}
      {activeMenu && menuAnchor && (
        <FolderMenu
          folder={activeMenu}
          anchorRect={menuAnchor}
          menuRef={menuRef}
          onNewPage={handleCreatePage}
          onRename={startRename}
          onDelete={(f) => setDeleteTarget(f)}
          onClose={() => { setOpenMenuId(null); setMenuAnchor(null) }}
        />
      )}

      {/* Delete folder confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3"><Trash2 size={18} className="text-red-500" /></div>
                <h3 className="text-gray-900 font-semibold text-base">Delete folder?</h3>
                <p className="text-sm text-gray-500 mt-1 leading-snug"><span className="font-medium text-gray-700">"{deleteTarget.name}"</span> and all its pages will be permanently deleted.</p>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0 ml-2"><X size={15} className="text-gray-400" /></button>
            </div>
            <div className="flex gap-2.5 px-6 pb-6">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer">Cancel</button>
              <button onClick={handleDeleteFolder} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer" style={{ backgroundColor: '#DC2626' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#B91C1C' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#DC2626' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete page confirmation */}
      {deletePageTarget && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setDeletePageTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3"><Trash2 size={18} className="text-red-500" /></div>
                <h3 className="text-gray-900 font-semibold text-base">Delete page?</h3>
                <p className="text-sm text-gray-500 mt-1 leading-snug"><span className="font-medium text-gray-700">"{deletePageTarget.title || 'Untitled'}"</span> will be permanently deleted.</p>
              </div>
              <button onClick={() => setDeletePageTarget(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0 ml-2"><X size={15} className="text-gray-400" /></button>
            </div>
            <div className="flex gap-2.5 px-6 pb-6">
              <button onClick={() => setDeletePageTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer">Cancel</button>
              <button
                onClick={() => {
                  if (selectedPageId === deletePageTarget.id) setSelectedPageId(null)
                  onDeletePage?.(deletePageTarget.id)
                  setDeletePageTarget(null)
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer"
                style={{ backgroundColor: '#DC2626' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#B91C1C' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#DC2626' }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   PROJECT PAGE
───────────────────────────────────────────── */
export default function ProjectPage({
  project,
  meetings = [],
  projects = [],
  onNavigateToMeeting,
  onNavigateToProject,
  onNavigateToDashboard,
  onStartRecording,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onUpdateDescription,
  /* workspace props */
  workspaceFolders = [],
  workspacePages   = [],
  onCreateWorkspaceFolder,
  onRenameWorkspaceFolder,
  onDeleteWorkspaceFolder,
  onCreateWorkspacePage,
  onUpdateWorkspacePage,
  onDeleteMeeting,
  onDeleteWorkspacePage,
  currentUser = null,
  onSignOut,
}) {
  if (!project) return null

  const [activeTab,        setActiveTab]        = useState('recordings')
  const [deleteMeetingTarget, setDeleteMeetingTarget] = useState(null)

  /* Reset to recordings tab when switching projects */
  useEffect(() => { setActiveTab('recordings') }, [project.id])

  /* Group meetings by dateKey, sorted newest first */
  const grouped = meetings.reduce((acc, m) => {
    if (!acc[m.dateKey]) acc[m.dateKey] = []
    acc[m.dateKey].push(m)
    return acc
  }, {})
  const sortedDateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
  const todayKey    = new Date().toISOString().split('T')[0]
  /* Always include today so the New Recording button is always visible in Today */
  const allDateKeys = sortedDateKeys.includes(todayKey)
    ? sortedDateKeys
    : [todayKey, ...sortedDateKeys]

  /* Workspace folders/pages scoped to this project */
  const projectFolders = workspaceFolders.filter(f => f.projectId === project.id)
  const projectPages   = workspacePages.filter(p => p.projectId === project.id)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        projects={projects}
        activeProjectId={project.id}
        onNavigateToProject={onNavigateToProject}
        onNavigateToDashboard={onNavigateToDashboard}
        onCreateProject={onCreateProject}
        onRenameProject={onRenameProject}
        onDeleteProject={onDeleteProject}
        currentUser={currentUser}
        onSignOut={onSignOut}
      />

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0 gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: '#7133AE12' }}
            >
              <Folder size={16} strokeWidth={2} style={{ color: '#7133AE' }} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-gray-900 font-semibold text-base tracking-tight leading-tight truncate">
                {project.name}
              </h1>
              <EditableDescription
                value={project.description}
                onSave={(text) => onUpdateDescription?.(project.id, text)}
              />
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-100 bg-white px-4 flex-shrink-0">
          {[
            { key: 'recordings', label: 'Recordings',  icon: <Mic size={13} strokeWidth={2.5} /> },
            { key: 'workspace',  label: 'Workspace',   icon: <FileText size={13} strokeWidth={2.5} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-1 py-3 mr-6 text-sm font-medium transition-colors cursor-pointer"
              style={{
                color: activeTab === tab.key ? '#7133AE' : '#9ca3af',
                borderBottom: activeTab === tab.key ? '2px solid #7133AE' : '2px solid transparent',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className={activeTab === 'workspace' ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto px-4 pt-4 pb-6'}>

          {/* ── Recordings Tab ── */}
          {activeTab === 'recordings' && (
            meetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <EmptyRecordings />
                <div>
                  <p className="text-gray-700 font-semibold text-base mb-1">No meetings yet</p>
                  <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
                    Start a recording to capture your first meeting in this project.
                  </p>
                </div>
                <button
                  onClick={() => onStartRecording(project)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-150 cursor-pointer"
                  style={{ backgroundColor: '#7133AE' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#5f2a94' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7133AE' }}
                >
                  <Mic size={15} />
                  New Recording
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-8 w-full">
                {allDateKeys.map(dateKey => (
                  <section key={dateKey}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={14} className="text-gray-400" />
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {formatDateGroup(dateKey)}
                        </span>
                      </div>
                      {dateKey === todayKey && (
                        <button
                          onClick={() => onStartRecording(project)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer transition-colors"
                          style={{ color: '#7133AE', borderColor: '#7133AE30', backgroundColor: '#7133AE08' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7133AE15' }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7133AE08' }}
                        >
                          <Mic size={12} strokeWidth={2.5} />
                          New Recording
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {(grouped[dateKey] || []).map(meeting => (
                        <div
                          key={meeting.id}
                          className="group relative w-full bg-white rounded-2xl border border-gray-100 px-5 py-4 transition-all duration-150 cursor-pointer"
                          onClick={() => onNavigateToMeeting(meeting.id)}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7133AE30'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#f3f4f6'; e.currentTarget.style.boxShadow = 'none' }}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 font-semibold text-sm leading-snug truncate group-hover:text-purple-700 transition-colors">
                                {meeting.title.includes(' – ') ? meeting.title.split(' – ').slice(1).join(' – ') : meeting.title}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <span className="flex items-center gap-1 text-gray-400 text-xs">
                                  <Clock size={11} strokeWidth={2} />
                                  {meeting.time} · {meeting.duration}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                Transcript
                              </span>
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ backgroundColor: '#7133AE12', color: '#7133AE' }}
                              >
                                AI Summary
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteMeetingTarget(meeting) }}
                                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all cursor-pointer hover:bg-red-50"
                                title="Delete recording"
                              >
                                <Trash2 size={13} className="text-gray-300 hover:text-red-500 transition-colors" />
                              </button>
                              <ChevronRight
                                size={16}
                                className="text-gray-300 group-hover:text-purple-400 transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )
          )}

          {/* ── Workspace Tab ── */}
          {activeTab === 'workspace' && (
            <WorkspaceTab
              projectId={project.id}
              folders={projectFolders}
              pages={projectPages}
              onCreateFolder={onCreateWorkspaceFolder}
              onRenameFolder={onRenameWorkspaceFolder}
              onDeleteFolder={onDeleteWorkspaceFolder}
              onCreatePage={onCreateWorkspacePage}
              onUpdatePage={onUpdateWorkspacePage}
              onDeletePage={onDeleteWorkspacePage}
            />
          )}
        </div>

        {/* ── Delete Recording confirmation ── */}
        {deleteMeetingTarget && (
          <div
            className="fixed inset-0 z-[9998] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={() => setDeleteMeetingTarget(null)}
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
                  <h3 className="text-gray-900 font-semibold text-base">Delete recording?</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-snug">
                    <span className="font-medium text-gray-700">"{deleteMeetingTarget.title}"</span> will be permanently deleted.
                  </p>
                </div>
                <button onClick={() => setDeleteMeetingTarget(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0 ml-2">
                  <X size={15} className="text-gray-400" />
                </button>
              </div>
              <div className="flex gap-2.5 px-6 pb-6">
                <button onClick={() => setDeleteMeetingTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer">Cancel</button>
                <button
                  onClick={() => { onDeleteMeeting?.(deleteMeetingTarget.id); setDeleteMeetingTarget(null) }}
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
      </main>
    </div>
  )
}
