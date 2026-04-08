import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Folder, Mic, Clock, ChevronRight, CalendarDays, Pencil,
  FileText, FolderOpen, Plus, MoreHorizontal, Trash2, X,
  Search, Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Code, List, ListOrdered, Quote, Minus,
  Image as ImageIcon, Video, Link as LinkIcon, Table as TableIcon,
  Check, Copy, CopyPlus, Columns, Rows,
  GripVertical, ChevronDown,
  AlignLeft, AlignCenter, AlignRight,
  ExternalLink, FileText as FileIcon, Download, Paperclip,
  Type, Square, SquareCheck, ListTodo,
  BookOpen, Sparkles, Lock, FolderLock, Store, Save,
} from 'lucide-react'
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import UnderlineExt from '@tiptap/extension-underline'
import ImageExt from '@tiptap/extension-image'
import LinkExt from '@tiptap/extension-link'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import Youtube from '@tiptap/extension-youtube'
import TextAlign from '@tiptap/extension-text-align'
import { Node, mergeAttributes } from '@tiptap/core'
import Sidebar from '../components/Sidebar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

/* ─────────────────────────────────────────────
   FILE ATTACHMENT — Tiptap node + React view
───────────────────────────────────────────── */
function FileAttachmentView({ node, selected }) {
  const { src, fileName, fileType, fileSize } = node.attrs
  const isPdf = fileType === 'pdf'
  const [preview, setPreview] = useState(false)

  const fmt = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`

  const open = () => {
    if (isPdf) setPreview(true)
    else {
      // DOC/DOCX — trigger download
      const a = document.createElement('a')
      a.href = src; a.download = fileName; a.click()
    }
  }

  return (
    <NodeViewWrapper>
      <div
        contentEditable={false}
        onClick={open}
        className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors my-1"
        style={{
          borderColor: selected ? '#7133AE' : '#e5e7eb',
          backgroundColor: selected ? '#7133AE08' : '#f9fafb',
        }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: isPdf ? '#fef2f2' : '#eff6ff' }}
        >
          <FileIcon size={20} style={{ color: isPdf ? '#dc2626' : '#2563eb' }} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{fileName}</p>
          <p className="text-xs text-gray-400 mt-0.5">{fileType.toUpperCase()} • {fmt(fileSize)}</p>
        </div>
        {isPdf
          ? <ExternalLink size={14} className="text-gray-400 flex-shrink-0" />
          : <Download size={14} className="text-gray-400 flex-shrink-0" />
        }
      </div>

      {/* PDF preview modal */}
      {preview && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
        >
          <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ backgroundColor: '#1a1a2e' }}>
            <span className="text-white text-sm font-medium truncate max-w-lg">{fileName}</span>
            <button onClick={() => setPreview(false)} className="text-gray-400 hover:text-white cursor-pointer ml-4 flex-shrink-0">
              <X size={20} />
            </button>
          </div>
          <iframe src={src} className="flex-1 w-full border-0" title={fileName} />
        </div>,
        document.body
      )}
    </NodeViewWrapper>
  )
}

const FileAttachmentExt = Node.create({
  name: 'fileAttachment',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src:      { default: null },
      fileName: { default: 'File' },
      fileType: { default: '' },
      fileSize: { default: 0 },
    }
  },
  parseHTML()  { return [{ tag: 'div[data-file-attachment]' }] },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes({ 'data-file-attachment': '' }, HTMLAttributes)] },
  addNodeView() { return ReactNodeViewRenderer(FileAttachmentView) },
})

/* Custom paragraph node with body2 variant support */
const CustomParagraph = Node.create({
  name: 'paragraph',
  priority: 1000,
  group: 'block',
  content: 'inline*',
  addAttributes() {
    return {
      variant: {
        default: null,
        parseHTML: el => el.getAttribute('data-variant') || null,
        renderHTML: attrs => attrs.variant ? { 'data-variant': attrs.variant, class: `para-${attrs.variant}` } : {},
      },
    }
  },
  parseHTML()  { return [{ tag: 'p' }] },
  renderHTML({ HTMLAttributes }) { return ['p', mergeAttributes(HTMLAttributes), 0] },
})

/* Heading style options */
const HEADING_OPTIONS = [
  { value: 'b1', label: 'Body 1', sub: 'Normal text',     fontSize: '15px', fontWeight: '400', color: '#374151' },
  { value: 'b2', label: 'Body 2', sub: 'Secondary text',  fontSize: '13px', fontWeight: '400', color: '#6b7280' },
  { value: '1',  label: 'H1',     sub: 'Title',            fontSize: '26px', fontWeight: '700', color: '#111827' },
  { value: '2',  label: 'H2',     sub: 'Heading',          fontSize: '20px', fontWeight: '600', color: '#1f2937' },
  { value: '3',  label: 'H3',     sub: 'Subheading',       fontSize: '16px', fontWeight: '600', color: '#374151' },
  { value: '4',  label: 'H4',     sub: 'Small heading',    fontSize: '14px', fontWeight: '600', color: '#374151' },
  { value: '5',  label: 'H5',     sub: 'Fine print',       fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' },
]

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

  /* ── URL popover state (link / image / video) ── */
  const [popover, setPopover] = useState(null) // { type: 'link'|'image'|'video', value: '' }
  const popoverRef    = useRef(null)          // always-fresh ref
  const popoverInputRef = useRef(null)
  const imageInputRef   = useRef(null)
  const fileInputRef    = useRef(null)
  const editorRef       = useRef(null)        // so popover handlers can access editor

  useEffect(() => { popoverRef.current = popover }, [popover])
  useEffect(() => {
    if (popover) setTimeout(() => popoverInputRef.current?.focus(), 50)
  }, [popover])

  // ── Drag handle ──
  const [dragHandle, setDragHandle]   = useState(null)
  const dragIsDragging                = useRef(false)
  const isOverHandle                  = useRef(false)
  const clearHandleTimer              = useRef(null)   // delayed clear so mouse can reach the icon

  const scheduleClearHandle = () => {
    clearTimeout(clearHandleTimer.current)
    clearHandleTimer.current = setTimeout(() => {
      if (!isOverHandle.current && !dragIsDragging.current) setDragHandle(null)
    }, 180)
  }
  const cancelClearHandle = () => clearTimeout(clearHandleTimer.current)

  // ── Context menu ──
  const [ctxMenu, setCtxMenu] = useState(null) // { x, y, nodeType, nodePos, attrs }
  const ctxMenuRef = useRef(null)


  // Close context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return
    const close = (e) => { if (!ctxMenuRef.current?.contains(e.target)) setCtxMenu(null) }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [ctxMenu])


  const openPopover = (type) => {
    const currentLink = type === 'link' ? editorRef.current?.getAttributes('link').href || '' : ''
    setPopover({ type, value: currentLink })
  }

  const commitPopover = (p = popoverRef.current) => {
    if (!p) return
    const url = p.value.trim()
    setPopover(null)
    if (!url) return
    const ed = editorRef.current
    if (!ed) return
    if (p.type === 'link') {
      if (url === 'remove') { ed.chain().focus().unsetLink().run() }
      else { ed.chain().focus().setLink({ href: url.startsWith('http') ? url : `https://${url}`, target: '_blank' }).run() }
    } else if (p.type === 'image') {
      ed.chain().focus().setImage({ src: url }).run()
    } else if (p.type === 'video') {
      ed.chain().focus().setYoutubeVideo({ src: url }).run()
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ paragraph: false }),
      CustomParagraph,
      UnderlineExt,
      Placeholder.configure({ placeholder: 'Start writing…' }),
      ImageExt.configure({ inline: false, allowBase64: true }),
      LinkExt.configure({ openOnClick: true, autolink: true, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({ width: '100%', height: 340, nocookie: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      FileAttachmentExt,
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

  // keep editorRef in sync so popover handlers always have fresh editor
  useEffect(() => { editorRef.current = editor }, [editor])

  useEffect(() => {
    if (editor && page?.id) {
      editor.commands.setContent(page.content || '', false)
    }
  }, [page?.id]) // eslint-disable-line

  useEffect(() => () => clearTimeout(saveTimerRef.current), [])

  if (!editor) return null

  // ── Drag: track hovered block ──
  const onEditorMouseMove = (e) => {
    if (!editor || dragIsDragging.current || isOverHandle.current) return
    cancelClearHandle()  // mouse re-entered editor — cancel any pending hide
    const view = editor.view
    const result = view.posAtCoords({ left: e.clientX, top: e.clientY })
    if (!result) { scheduleClearHandle(); return }
    try {
      const $pos = editor.state.doc.resolve(result.pos)
      const blockStart = $pos.depth >= 1 ? $pos.before(1) : 0
      const domResult = view.domAtPos(blockStart + 1)
      let el = domResult.node
      if (el.nodeType === 3) el = el.parentElement
      while (el && el.parentElement !== view.dom) el = el.parentElement
      if (!el || el === view.dom) { scheduleClearHandle(); return }
      const rect = el.getBoundingClientRect()
      const editorRect = view.dom.getBoundingClientRect()
      setDragHandle({ clientY: rect.top + rect.height / 2, editorLeft: editorRect.left, nodePos: blockStart })
    } catch { scheduleClearHandle() }
  }

  // ── Drag: start — wire ProseMirror's internal dragging state ──
  const onDragHandleDragStart = (e) => {
    if (!dragHandle || !editor) return
    cancelClearHandle()
    dragIsDragging.current = true
    const view = editor.view
    const { state } = view
    try {
      const nodePos = dragHandle.nodePos + 1
      // If user has a non-empty selection that overlaps the hovered block, drag that selection
      const existing = state.selection
      let sel
      if (!existing.empty && existing.from <= nodePos && existing.to >= nodePos) {
        sel = existing
      } else {
        sel = NodeSelection.create(state.doc, nodePos)
        view.dispatch(state.tr.setSelection(sel))
      }
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', state.doc.textBetween(sel.from, sel.to, '\n'))
      view.dragging = { slice: sel.content(), move: true }
    } catch { dragIsDragging.current = false }
  }

  // ── Drag: end — clean up ──
  const onDragHandleDragEnd = () => {
    dragIsDragging.current = false
    isOverHandle.current   = false
    setDragHandle(null)
    // Clear ProseMirror's dragging state if drop didn't happen in the editor
    if (editor?.view?.dragging) editor.view.dragging = null
  }

  // ── Context menu: right-click ──
  const onContextMenu = (e) => {
    if (!editor) return
    const view = editor.view
    const result = view.posAtCoords({ left: e.clientX, top: e.clientY })
    if (!result) return
    e.preventDefault()
    const { state } = editor
    const $pos = state.doc.resolve(result.pos)

    // Walk ancestors to detect table context (handles clicks inside cells)
    let nodeType = 'block'
    let nodePos = result.pos
    let attrs = {}

    for (let d = $pos.depth; d >= 1; d--) {
      const ancestor = $pos.node(d)
      if (ancestor.type.name === 'table') {
        nodeType = 'table'
        nodePos = $pos.before(d)
        break
      }
    }

    if (nodeType === 'block') {
      const node = state.doc.nodeAt(result.pos)
      if (node && !['doc', 'paragraph', 'text'].includes(node.type.name)) {
        nodeType = node.type.name
        attrs = node.attrs
      }
    }

    // Link mark overrides (but not inside table)
    if (nodeType !== 'table') {
      const linkMark = $pos.marks().find(m => m.type.name === 'link')
      if (linkMark) { nodeType = 'link'; attrs = linkMark.attrs }
    }

    setCtxMenu({ x: e.clientX, y: e.clientY, nodeType, nodePos, attrs })
  }

  // ── Execute context action ──
  const execCtx = (action) => {
    const m = ctxMenu
    setCtxMenu(null)
    const ed = editorRef.current
    if (!ed || !m) return

    if (action === 'deleteTable') {
      // Move cursor inside the table first, then delete
      ed.chain().focus(m.nodePos + 2).deleteTable().run()
    } else if (action === 'deleteRow') {
      ed.chain().focus(m.nodePos + 2).deleteRow().run()
    } else if (action === 'deleteColumn') {
      ed.chain().focus(m.nodePos + 2).deleteColumn().run()
    } else if (action === 'copy') {
      if (m.nodeType === 'image' || m.nodeType === 'youtube') {
        navigator.clipboard.writeText(m.attrs.src || '')
      } else if (m.nodeType === 'link') {
        navigator.clipboard.writeText(m.attrs.href || '')
      } else {
        // Copy selected text or block text content
        const { selection } = ed.state
        const text = selection.empty
          ? ed.state.doc.textBetween(m.nodePos, m.nodePos + (ed.state.doc.nodeAt(m.nodePos)?.nodeSize || 1), '\n')
          : ed.state.doc.textBetween(selection.from, selection.to, '\n')
        navigator.clipboard.writeText(text).catch(() => document.execCommand('copy'))
      }
    } else if (action === 'duplicate') {
      const node = ed.state.doc.nodeAt(m.nodePos)
      if (node) {
        const insertPos = m.nodePos + node.nodeSize
        const tr = ed.state.tr.insert(insertPos, node.copy(node.content))
        ed.view.dispatch(tr)
      }
    } else if (action === 'delete') {
      if (m.nodeType === 'link') {
        ed.chain().focus().unsetLink().run()
      } else {
        try { ed.chain().focus().setNodeSelection(m.nodePos).deleteSelection().run() }
        catch { ed.chain().focus().selectParentNode().deleteSelection().run() }
      }
    }
  }

  // ── Build context menu items ──
  const ctxItems = () => {
    if (!ctxMenu) return []
    const { nodeType } = ctxMenu
    if (nodeType === 'table') {
      return [
        { label: 'Copy',          Icon: Copy,    action: 'copy' },
        { label: 'Duplicate',     Icon: CopyPlus, action: 'duplicate' },
        { divider: true },
        { label: 'Delete Row',    Icon: Rows,    action: 'deleteRow',    danger: true },
        { label: 'Delete Column', Icon: Columns, action: 'deleteColumn', danger: true },
        { label: 'Delete Table',  Icon: Trash2,  action: 'deleteTable',  danger: true },
      ]
    }
    const deleteLabel =
      nodeType === 'horizontalRule' ? 'Delete Divider' :
      nodeType === 'image'          ? 'Delete Image'   :
      nodeType === 'youtube'        ? 'Delete Video'   :
      nodeType === 'link'           ? 'Remove Link'    :
      'Delete Block'
    return [
      { label: 'Copy',      Icon: Copy,    action: 'copy' },
      { label: 'Duplicate', Icon: CopyPlus, action: 'duplicate' },
      { divider: true },
      { label: deleteLabel, Icon: Trash2,  action: 'delete', danger: true },
    ]
  }

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

  /* popover placeholder & label */
  const popoverMeta = {
    link:  { label: 'Link URL',   placeholder: 'https://example.com' },
    image: { label: 'Image URL',  placeholder: 'https://example.com/image.png' },
    video: { label: 'YouTube / Vimeo URL', placeholder: 'https://youtube.com/watch?v=…' },
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden bg-white"
      onMouseMove={onEditorMouseMove}
      onMouseLeave={scheduleClearHandle}
    >
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

      {/* Hidden file input for local image upload — outside toolbar */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = (ev) => {
            editorRef.current?.chain().focus().setImage({ src: ev.target.result }).run()
            setPopover(null)
          }
          reader.readAsDataURL(file)
          e.target.value = ''
        }}
      />

      {/* Hidden file input for PDF / DOC uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = (ev) => {
            const ext = file.name.split('.').pop().toLowerCase()
            editorRef.current?.chain().focus().insertContent({
              type: 'fileAttachment',
              attrs: {
                src: ev.target.result,
                fileName: file.name,
                fileType: ext,
                fileSize: file.size,
              },
            }).run()
          }
          reader.readAsDataURL(file)
          e.target.value = ''
        }}
      />

      {/* Toolbar — relative so popover can be positioned below it */}
      <div className="px-10 pb-3 flex-shrink-0 relative">
        <div className="flex items-center gap-0.5 px-2 py-1.5 bg-white border border-gray-100 rounded-xl shadow-sm w-fit flex-wrap">

          {/* ── Heading / paragraph — shadcn DropdownMenu ── */}
          {(() => {
            const level   = [1,2,3,4,5].find(l => editor.isActive('heading', { level: l }))
            const isBody2 = !level && editor.isActive('paragraph', { variant: 'body2' })
            const activeVal = level ? String(level) : isBody2 ? 'b2' : 'b1'
            const activeOpt = HEADING_OPTIONS.find(o => o.value === activeVal) || HEADING_OPTIONS[0]

            const applyStyle = (val) => {
              if (val === 'b1')      editor.chain().focus().setParagraph().updateAttributes('paragraph', { variant: null }).run()
              else if (val === 'b2') editor.chain().focus().setParagraph().updateAttributes('paragraph', { variant: 'body2' }).run()
              else                   editor.chain().focus().setHeading({ level: parseInt(val) }).run()
            }

            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    className="flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-lg text-xs font-medium transition-colors select-none cursor-pointer hover:bg-accent outline-none"
                    style={{
                      color: (level || isBody2) ? '#7133AE' : '#4b5563',
                      backgroundColor: (level || isBody2) ? '#7133AE0D' : 'transparent',
                      minWidth: 72,
                    }}
                  >
                    <Type size={12} strokeWidth={2.2} />
                    <span>{activeOpt.label}</span>
                    <ChevronDown size={10} strokeWidth={2.5} className="text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start" className="w-56 p-1.5">
                  <DropdownMenuLabel className="px-2 pb-1">Text style</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {HEADING_OPTIONS.map((opt) => {
                    const isActive = opt.value === activeVal
                    return (
                      <DropdownMenuItem
                        key={opt.value}
                        onSelect={() => applyStyle(opt.value)}
                        className="flex items-center justify-between gap-3 px-2 py-2 rounded-lg cursor-pointer"
                        style={{ backgroundColor: isActive ? '#7133AE0D' : undefined }}
                      >
                        {/* Left — name + description */}
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span
                            className="text-[11px] font-medium leading-none"
                            style={{ color: isActive ? '#7133AE' : '#374151' }}
                          >
                            {opt.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-none">{opt.sub}</span>
                        </div>

                        {/* Right — live "Ag" preview */}
                        <span
                          className="shrink-0 leading-none"
                          style={{
                            fontSize: opt.fontSize,
                            fontWeight: opt.fontWeight,
                            color: isActive ? '#7133AE' : opt.color,
                            textTransform: opt.textTransform || 'none',
                            letterSpacing: opt.letterSpacing || 'normal',
                          }}
                        >
                          Ag
                        </span>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          })()}

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* ── Text formatting ── */}
          <ToolBtn action={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold"><Bold size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn action={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic"><Italic size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn action={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline"><UnderlineIcon size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn action={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough"><Strikethrough size={13} strokeWidth={2.5} /></ToolBtn>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* ── Alignment ── */}
          <ToolBtn action={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Align Left"><AlignLeft size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn action={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Align Center"><AlignCenter size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn action={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Align Right"><AlignRight size={13} strokeWidth={2.5} /></ToolBtn>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* ── Lists ── */}
          <ToolBtn action={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List"><List size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn action={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Ordered List"><ListOrdered size={13} strokeWidth={2.5} /></ToolBtn>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* ── Code / Quote / Divider ── */}
          <ToolBtn action={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Inline Code"><Code size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn action={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Blockquote"><Quote size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn action={() => editor.chain().focus().setHorizontalRule().run()} isActive={false} title="Divider"><Minus size={13} strokeWidth={2.5} /></ToolBtn>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* ── Media / Link / Table ── */}
          <ToolBtn action={() => openPopover('link')} isActive={editor.isActive('link')} title="Insert Link"><LinkIcon size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn action={() => openPopover('image')} isActive={false} title="Insert Image"><ImageIcon size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn action={() => openPopover('video')} isActive={false} title="Embed Video"><Video size={13} strokeWidth={2.5} /></ToolBtn>
          <ToolBtn
            action={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            isActive={editor.isActive('table')}
            title="Insert Table"
          ><TableIcon size={13} strokeWidth={2.5} /></ToolBtn>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* ── File attach (PDF/DOC) — label wraps input for reliable picker ── */}
          <label
            title="Attach PDF / DOC"
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors cursor-pointer select-none"
            style={{ color: '#6b7280' }}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7133AE12'; e.currentTarget.style.color = '#7133AE' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6b7280' }}
          >
            <Paperclip size={13} strokeWidth={2.5} />
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = (ev) => {
                  const ext = file.name.split('.').pop().toLowerCase()
                  editorRef.current?.chain().focus().insertContent({
                    type: 'fileAttachment',
                    attrs: { src: ev.target.result, fileName: file.name, fileType: ext, fileSize: file.size },
                  }).run()
                }
                reader.readAsDataURL(file)
                e.target.value = ''
              }}
            />
          </label>

        </div>

        {/* URL Popover — absolutely positioned below toolbar, never overflows */}
        {popover && (
          <div
            className="absolute left-10 top-full mt-1 z-50 flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl shadow-lg"
            style={{ minWidth: 340 }}
          >
            <span className="text-xs font-medium text-gray-400 whitespace-nowrap flex-shrink-0">
              {popoverMeta[popover.type].label}
            </span>
            <input
              ref={popoverInputRef}
              type="url"
              value={popover.value}
              onChange={(e) => setPopover(p => ({ ...p, value: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitPopover(popover) }
                if (e.key === 'Escape') setPopover(null)
              }}
              placeholder={popoverMeta[popover.type].placeholder}
              className="flex-1 text-xs text-gray-700 outline-none min-w-0 placeholder-gray-300"
            />
            {/* Upload button — only for image */}
            {popover.type === 'image' && (
              <button
                onClick={() => imageInputRef.current?.click()}
                className="text-xs font-medium whitespace-nowrap cursor-pointer flex-shrink-0 px-2 py-1 rounded-md hover:bg-purple-50 transition-colors"
                style={{ color: '#7133AE' }}
              >Upload</button>
            )}
            {/* Remove link */}
            {popover.type === 'link' && editor.isActive('link') && (
              <button
                onMouseDown={(e) => { e.preventDefault(); commitPopover({ type: 'link', value: 'remove' }) }}
                className="text-xs text-red-400 hover:text-red-600 whitespace-nowrap cursor-pointer flex-shrink-0"
              >Remove</button>
            )}
            {/* Confirm */}
            <button
              onMouseDown={(e) => { e.preventDefault(); commitPopover(popover) }}
              className="flex items-center justify-center w-6 h-6 rounded-md cursor-pointer flex-shrink-0"
              style={{ backgroundColor: '#7133AE', color: 'white' }}
            ><Check size={12} strokeWidth={2.5} /></button>
            {/* Close */}
            <button
              onMouseDown={(e) => { e.preventDefault(); setPopover(null) }}
              className="flex items-center justify-center w-5 h-5 rounded-md cursor-pointer text-gray-400 hover:text-gray-600 flex-shrink-0"
            ><X size={12} /></button>
          </div>
        )}
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto px-10 pb-10" onContextMenu={onContextMenu}>
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>

      {/* Drag handle — floats just left of hovered block */}
      {dragHandle && (
        <div
          draggable
          className="fixed z-40 flex items-center justify-center w-7 h-7 rounded cursor-grab active:cursor-grabbing select-none transition-colors"
          style={{
            top: dragHandle.clientY - 14,
            left: dragHandle.editorLeft - 8,
            transform: 'translateX(-100%)',
            color: '#9ca3af',
          }}
          onMouseEnter={() => { cancelClearHandle(); isOverHandle.current = true }}
          onMouseLeave={() => { isOverHandle.current = false; scheduleClearHandle() }}
          onDragStart={onDragHandleDragStart}
          onDragEnd={onDragHandleDragEnd}
          title="Drag to reorder"
        >
          <GripVertical size={18} strokeWidth={2} />
        </div>
      )}

      {/* Context menu portal */}
      {ctxMenu && createPortal(
        <div
          ref={ctxMenuRef}
          className="fixed z-[9999] bg-white border border-gray-100 rounded-xl shadow-2xl py-1.5 overflow-hidden"
          style={{
            minWidth: 180,
            left: Math.min(ctxMenu.x, window.innerWidth - 200),
            top: Math.min(ctxMenu.y, window.innerHeight - 220),
          }}
        >
          {ctxItems().map((item, i) =>
            item.divider ? (
              <div key={`div-${i}`} className="my-1 mx-3 border-t border-gray-100" />
            ) : (
              <button
                key={item.action}
                onMouseDown={(e) => { e.preventDefault(); execCtx(item.action) }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors cursor-pointer text-left"
                style={{ color: item.danger ? '#dc2626' : '#374151' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = item.danger ? '#fef2f2' : '#f9fafb' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <item.Icon size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
                {item.label}
              </button>
            )
          )}
        </div>,
        document.body
      )}
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
    if (!deleteTarget || deleteTarget.isSystemFolder) return  // system folder is protected
    if (selectedPageId && pages.find(p => p.id === selectedPageId)?.folderId === deleteTarget.id) {
      setSelectedPageId(null)
    }
    onDeleteFolder?.(deleteTarget.id)
    setDeleteTarget(null)
  }

  const activeMenu    = openMenuId ? folders.find(f => f.id === openMenuId) : null
  const selectedPage  = selectedPageId ? pages.find(p => p.id === selectedPageId) : null
  const filteredFolders = folders
    .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // System folder (Meetings Summary) always first
      if (a.isSystemFolder && !b.isSystemFolder) return -1
      if (!a.isSystemFolder && b.isSystemFolder) return  1
      return 0
    })

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

            const isSystem = !!folder.isSystemFolder

            return (
              <div key={folder.id} >
                {/* Folder row */}
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
                  {/* Folder icon — lock variant for system folder */}
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: isSystem ? '#7133AE12' : '#f3f4f6' }}
                  >
                    {isSystem
                      ? <BookOpen size={12} strokeWidth={2} style={{ color: '#7133AE' }} />
                      : <FolderOpen size={13} strokeWidth={2} style={{ color: isExpanded ? '#7133AE' : '#9ca3af' }} />
                    }
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

                  {/* System folder: show lock pill; normal folder: show ⋯ on hover */}
                  {isSystem ? (
                    <span className="flex items-center justify-center w-5 h-5 rounded flex-shrink-0"
                      style={{ color: '#7133AE' }}>
                      <Lock size={11} strokeWidth={2.5} />
                    </span>
                  ) : (
                    !isRenaming && (isHovered || menuOpen) && (
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
                    )
                  )}
                </div>

                {/* Pages nested under folder */}
                {isExpanded && (
                  <div className="ml-[40px] mb-2 mt-2">
                    {folderPages.map(pg => {
                      const isSelected = selectedPageId === pg.id
                      return (
                        <div
                          key={pg.id}
                          className="group flex items-center gap-2 px-2 py-1.5 mb-2 rounded-lg cursor-pointer transition-colors"
                          style={{ backgroundColor: isSelected ? '#7133AE0F' : 'transparent' }}
                          onClick={() => setSelectedPageId(pg.id)}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f9fafb' }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? '#7133AE0F' : 'transparent' }}
                        >
                          <FileText size={12} className="flex-shrink-0 transition-colors" style={{ color: isSelected ? '#7133AE' : '#9ca3af' }} />
                          <span className="flex-1 text-xs font-medium truncate transition-colors" style={{ color: isSelected ? '#7133AE' : '#6b7280' }}>
                            {pg.title || 'Untitled'}
                          </span>
                          {/* No delete button for system folder pages */}
                          {!isSystem && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeletePageTarget(pg) }}
                              className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-red-50 cursor-pointer opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={11} className="text-gray-300 hover:text-red-500 transition-colors" />
                            </button>
                          )}
                        </div>
                      )
                    })}

                    {/* New Page row — only for non-system folders */}
                    {!isSystem && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCreatePage(folder.id) }}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer w-full text-left transition-colors hover:bg-gray-50"
                      >
                        <Plus size={11} strokeWidth={2.5} style={{ color: '#7133AE' }} />
                        <span className="text-xs font-medium" style={{ color: '#7133AE' }}>New Page</span>
                      </button>
                    )}
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
   DAY SUMMARY — helpers + modal
───────────────────────────────────────────── */

/** Format a dateKey (YYYY-MM-DD) → "Mon, 24 Apr 2026" (page title) */
function formatPageDate(dateKey) {
  const d = new Date(dateKey + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

/** Build a structured day summary object from an array of meetings */
function buildDaySummary(meetings) {
  const valid = meetings.filter(
    m => m.summary && !m.summary._generating &&
    (m.summary.objective || (m.summary.topicsDiscussed || []).length > 0)
  )
  if (!valid.length) return null

  const clean = (title) => title.includes(' – ') ? title.split(' – ').slice(1).join(' – ') : title

  return {
    meetingCount:  valid.length,
    meetings:      valid.map(m => ({ title: clean(m.title), time: m.time, duration: m.duration })),
    objectives:    valid.map(m => m.summary.objective).filter(Boolean),
    topics:        valid.flatMap(m => m.summary.topicsDiscussed || []),
    insights:      valid.flatMap(m => m.summary.keyInsights     || []),
    decisions:     valid.flatMap(m => m.summary.decisionsMade   || [])
                       .filter(d => d && d !== 'No final decisions were made.'),
    actionItems:   valid.flatMap(m => m.summary.actionItems     || []),
  }
}

/** Generate Tiptap-compatible HTML for the workspace page */
function buildDaySummaryHTML(dateKey, summary) {
  const dateLabel = formatPageDate(dateKey)
  let html = `<h1>${dateLabel} — Meetings Summary</h1>`
  html += `<p><strong>${summary.meetingCount} meeting${summary.meetingCount > 1 ? 's' : ''}</strong> held on this day.</p>`

  // Meetings list
  html += `<h2>Meetings</h2><ul>`
  summary.meetings.forEach(m => { html += `<li>${m.title} · ${m.time} · ${m.duration}</li>` })
  html += '</ul>'

  // Overview
  if (summary.objectives.length) {
    html += `<h2>Overview</h2>`
    summary.objectives.forEach(o => { html += `<p>${o}</p>` })
  }

  // Topics
  if (summary.topics.length) {
    html += `<h2>Topics Discussed</h2><ul>`
    summary.topics.forEach(t => { html += `<li>${t}</li>` })
    html += '</ul>'
  }

  // Insights
  if (summary.insights.length) {
    html += `<h2>Key Insights</h2><ul>`
    summary.insights.forEach(i => { html += `<li>${i}</li>` })
    html += '</ul>'
  }

  // Decisions
  if (summary.decisions.length) {
    html += `<h2>Decisions Made</h2><ul>`
    summary.decisions.forEach(d => { html += `<li>${d}</li>` })
    html += '</ul>'
  }

  // Action items
  if (summary.actionItems.length) {
    html += `<h2>Action Items</h2><ul>`
    summary.actionItems.forEach(a => {
      const meta = [a.owner, a.due && a.due !== 'TBD' ? `Due: ${a.due}` : ''].filter(Boolean).join(' · ')
      html += `<li><strong>${a.task}</strong>${meta ? ` <em>(${meta})</em>` : ''}</li>`
    })
    html += '</ul>'
  }

  return html
}

/** Day Summary Modal */
function DaySummaryModal({ dateKey, meetings, onClose, onStoreInWorkspace, storing, stored }) {
  const summary    = buildDaySummary(meetings)
  const generating = meetings.some(m => m.summary?._generating)
  const dateLabel  = formatPageDate(dateKey)

  const Section = ({ title, items }) => {
    if (!items?.length) return null
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
          <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: '#7133AE' }} />
          {title}
        </h3>
        <ul className="space-y-1.5 pl-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600 leading-snug">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-300 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 flex-shrink-0 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#7133AE0F' }}>
              <BookOpen size={18} strokeWidth={1.8} style={{ color: '#7133AE' }} />
            </div>
            <div>
              <h2 className="text-gray-900 font-semibold text-base leading-tight">Day Summary</h2>
              <p className="text-xs text-gray-400 mt-0.5">{dateLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* No summaries yet */}
          {!summary && !generating && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <Sparkles size={32} className="text-gray-200" strokeWidth={1.5} />
              <p className="text-gray-500 font-medium text-sm">No AI summaries available yet.</p>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                AI summaries are generated automatically after each recording ends. Once ready, they'll appear here.
              </p>
            </div>
          )}

          {/* Still generating */}
          {generating && !summary && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-purple-200 border-t-purple-600 animate-spin" />
              <p className="text-sm text-gray-500">Generating summaries…</p>
            </div>
          )}

          {/* Summary content */}
          {summary && (
            <>
              {/* Meetings row */}
              <div className="flex flex-wrap gap-2">
                {summary.meetings.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                    style={{ backgroundColor: '#7133AE0A', color: '#5b21a6' }}>
                    <Mic size={11} strokeWidth={2.5} />
                    <span className="font-medium">{m.title}</span>
                    <span className="opacity-60">{m.time} · {m.duration}</span>
                  </div>
                ))}
              </div>

              {/* Overview */}
              {summary.objectives.length > 0 && (
                <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#7133AE08', borderLeft: '3px solid #7133AE' }}>
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">What happened today</p>
                  {summary.objectives.map((o, i) => (
                    <p key={i} className="text-sm text-gray-700 leading-relaxed">{o}</p>
                  ))}
                </div>
              )}

              <Section title="Topics Discussed"  items={summary.topics} />
              <Section title="Key Insights"      items={summary.insights} />
              <Section title="Decisions Made"    items={summary.decisions} />

              {/* Action items with owner+due */}
              {summary.actionItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                    <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: '#7133AE' }} />
                    Action Items
                  </h3>
                  <div className="space-y-2 pl-3">
                    {summary.actionItems.map((a, i) => (
                      <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-gray-50">
                        <SquareCheck size={14} strokeWidth={2} className="text-purple-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 font-medium leading-snug">{a.task}</p>
                          {(a.owner || (a.due && a.due !== 'TBD')) && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {[a.owner, a.due && a.due !== 'TBD' ? `Due: ${a.due}` : ''].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generating && (
                <p className="text-xs text-gray-400 text-center py-2">
                  ⏳ Some recordings are still generating summaries — they'll be included when you store.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50">
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <FolderLock size={12} strokeWidth={2} />
            Saves to <span className="font-medium text-gray-500">Meetings Summary</span> folder
          </p>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={onStoreInWorkspace}
              disabled={!summary || storing}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: stored ? '#16a34a' : '#7133AE' }}
              onMouseEnter={(e) => { if (!stored && !storing) e.currentTarget.style.backgroundColor = '#5f2a94' }}
              onMouseLeave={(e) => { if (!stored && !storing) e.currentTarget.style.backgroundColor = '#7133AE' }}
            >
              {storing ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Storing…
                </>
              ) : stored ? (
                <>
                  <Check size={14} strokeWidth={2.5} />
                  Stored!
                </>
              ) : (
                <>
                  <Save size={14} strokeWidth={2.5} />
                  Store in Workspace
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─────────────────────────────────────────────
   TODO TAB — day-wise tasks auto-derived from AI summaries + manual add
───────────────────────────────────────────── */
function TodoTab({ meetings, projectId }) {
  /* Keys are strictly scoped to this project */
  const storageKey = `todos_${projectId}`
  const mergedKey  = `todos_merged_${projectId}`

  const readTasks   = (key) => { try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} } }
  const readMerged  = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }

  /* ── Persisted state — initialised from THIS project's storage ── */
  const [tasks,          setTasks]          = useState(() => readTasks(storageKey))
  const [mergedMeetings, setMergedMeetings] = useState(() => readMerged(mergedKey))

  /* ── Local UI state ── */
  const [addingDay,   setAddingDay]   = useState(null)
  const [newTaskText, setNewTaskText] = useState('')
  const [editingId,   setEditingId]   = useState(null)
  const [editText,    setEditText]    = useState('')
  const newTaskInputRef = useRef(null)

  /* When project changes (projectId prop changes), reload from the new project's storage.
     This is a safety net — the parent also adds key={project.id} to force remount,
     but this useEffect handles any edge case where React reuses the instance. */
  useEffect(() => {
    setTasks(readTasks(storageKey))
    setMergedMeetings(readMerged(mergedKey))
    setAddingDay(null)
    setNewTaskText('')
    setEditingId(null)
    setEditText('')
  }, [projectId]) // eslint-disable-line

  /* Persist whenever tasks / mergedMeetings change, always under the CURRENT project's key */
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(tasks))          }, [tasks,          storageKey])
  useEffect(() => { localStorage.setItem(mergedKey,  JSON.stringify(mergedMeetings)) }, [mergedMeetings,  mergedKey])

  /* Merge AI action items from recordings that haven't been processed yet */
  useEffect(() => {
    const toMerge = meetings.filter(m =>
      !mergedMeetings.includes(m.id) &&
      Array.isArray(m.summary?.actionItems) &&
      m.summary.actionItems.length > 0 &&
      !m.summary?._generating
    )
    if (!toMerge.length) return

    setTasks(prev => {
      const next = { ...prev }
      toMerge.forEach(m => {
        const dk       = m.dateKey
        const existing = next[dk] || []
        const existIds = new Set(existing.map(t => t.id))
        const aiTasks  = m.summary.actionItems
          .map(item => ({
            id:        `ai_${m.id}_${item.id ?? Math.random()}`,
            text:      item.task,
            done:      false,
            source:    'ai',
            meetingId: m.id,
            due:       item.due   || '',   // owner intentionally omitted — tasks belong to the user
          }))
          .filter(t => !existIds.has(t.id))
        next[dk] = [...existing, ...aiTasks]
      })
      return next
    })
    setMergedMeetings(prev => [...prev, ...toMerge.map(m => m.id)])
  }, [meetings]) // eslint-disable-line

  /* All date keys — union of days that have meetings or tasks, always include today */
  const todayKey = new Date().toISOString().split('T')[0]
  const allKeys  = [...new Set([
    todayKey,
    ...Object.keys(tasks),
    ...meetings.map(m => m.dateKey),
  ])].sort((a, b) => b.localeCompare(a))

  /* ── Handlers ── */
  const dayTasks   = (dk) => tasks[dk] || []

  const toggleDone = (dk, id) =>
    setTasks(prev => ({ ...prev, [dk]: prev[dk].map(t => t.id === id ? { ...t, done: !t.done } : t) }))

  const deleteTask = (dk, id) =>
    setTasks(prev => ({ ...prev, [dk]: (prev[dk] || []).filter(t => t.id !== id) }))

  const startEdit  = (task) => { setEditingId(task.id); setEditText(task.text) }

  const commitEdit = (dk, id) => {
    const text = editText.trim()
    if (text) setTasks(prev => ({ ...prev, [dk]: prev[dk].map(t => t.id === id ? { ...t, text } : t) }))
    setEditingId(null); setEditText('')
  }

  const openAddRow = (dk) => { setAddingDay(dk); setNewTaskText(''); setTimeout(() => newTaskInputRef.current?.focus(), 60) }

  const commitAdd = (dk) => {
    const text = newTaskText.trim()
    if (text) {
      const id = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      setTasks(prev => ({ ...prev, [dk]: [...(prev[dk] || []), { id, text, done: false, source: 'manual' }] }))
    }
    setAddingDay(null); setNewTaskText('')
  }

  /* ── Empty state ── */
  if (allKeys.length === 1 && dayTasks(todayKey).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-20 text-center px-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#7133AE0D' }}>
          <ListTodo size={28} strokeWidth={1.5} style={{ color: '#7133AE' }} />
        </div>
        <div>
          <p className="text-gray-800 font-semibold text-base mb-1">No tasks yet</p>
          <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
            Tasks are auto-generated from your meeting AI summaries, or you can add them manually.
          </p>
        </div>
        <button
          onClick={() => openAddRow(todayKey)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
          style={{ backgroundColor: '#7133AE', color: 'white' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#5f2a94' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7133AE' }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Add a task
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      {allKeys.map(dk => {
        const dt        = dayTasks(dk)
        const doneCount = dt.filter(t => t.done).length
        const isToday   = dk === todayKey   // only today allows adding tasks

        return (
          <section key={dk}>
            {/* ── Day header ── */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <CalendarDays size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {formatDateGroup(dk)}
                </span>
                {dt.length > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: doneCount === dt.length ? '#f0fdf4' : '#7133AE0D', color: doneCount === dt.length ? '#16a34a' : '#7133AE' }}
                  >
                    {doneCount}/{dt.length} done
                  </span>
                )}
              </div>
              {/* Add Task — today only */}
              {isToday && (
                <button
                  onClick={() => openAddRow(dk)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer transition-colors flex-shrink-0"
                  style={{ color: '#7133AE', borderColor: '#7133AE30', backgroundColor: '#7133AE08' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7133AE15' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7133AE08' }}
                >
                  <Plus size={12} strokeWidth={2.5} />
                  Add Task
                </button>
              )}
            </div>

            {/* ── Task list ── */}
            <div className="flex flex-col gap-2">
              {/* Empty state — clickable only for today */}
              {dt.length === 0 && addingDay !== dk && (
                isToday ? (
                  <div
                    className="flex items-center gap-3 px-5 py-4 bg-white rounded-2xl border border-dashed cursor-pointer transition-colors"
                    style={{ borderColor: '#e5e7eb' }}
                    onClick={() => openAddRow(dk)}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7133AE40' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb' }}
                  >
                    <Square size={16} strokeWidth={1.5} className="text-gray-300 flex-shrink-0" />
                    <span className="text-sm text-gray-400">Click to add a task for today…</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-300 px-1">No tasks recorded for this day.</p>
                )
              )}

              {dt.map(task => (
                <div
                  key={task.id}
                  className="group flex items-start gap-3 px-5 py-3.5 bg-white rounded-2xl border border-gray-100 transition-all duration-150"
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7133AE20'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#f3f4f6'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleDone(dk, task.id)}
                    className="flex-shrink-0 mt-0.5 cursor-pointer transition-colors"
                    style={{ color: task.done ? '#7133AE' : '#d1d5db' }}
                    title={task.done ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {task.done
                      ? <SquareCheck size={18} strokeWidth={2} />
                      : <Square      size={18} strokeWidth={1.5} />
                    }
                  </button>

                  {/* Task text + metadata */}
                  <div className="flex-1 min-w-0">
                    {editingId === task.id ? (
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={() => commitEdit(dk, task.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter')  commitEdit(dk, task.id)
                          if (e.key === 'Escape') { setEditingId(null); setEditText('') }
                        }}
                        className="w-full text-sm text-gray-800 bg-transparent outline-none border-b pb-0.5"
                        style={{ borderColor: '#7133AE' }}
                      />
                    ) : (
                      <p
                        className="text-sm leading-snug select-none"
                        style={{
                          color:          task.done ? '#9ca3af' : '#374151',
                          textDecoration: task.done ? 'line-through' : 'none',
                          cursor:         isToday ? 'text' : 'default',
                        }}
                        onDoubleClick={() => isToday && startEdit(task)}
                        title={isToday ? 'Double-click to edit' : undefined}
                      >
                        {task.text}
                      </p>
                    )}

                    {/* Due date only — no owner/speaker tags */}
                    {task.source === 'ai' && task.due && task.due !== 'TBD' && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock size={10} strokeWidth={2} className="text-gray-300" />
                        <span className="text-xs text-gray-400">{task.due}</span>
                      </div>
                    )}
                  </div>

                  {/* Edit + Delete — only for today's tasks */}
                  {isToday && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                    <button
                      onClick={() => startEdit(task)}
                      className="flex items-center justify-center w-6 h-6 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Edit task"
                    >
                      <Pencil size={12} className="text-gray-400" />
                    </button>
                    <button
                      onClick={() => deleteTask(dk, task.id)}
                      className="flex items-center justify-center w-6 h-6 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 size={12} className="text-gray-300 hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                  )}
                </div>
              ))}

              {/* Inline add-task row — today only */}
              {addingDay === dk && isToday && (
                <div
                  className="flex items-center gap-3 px-5 py-3.5 bg-white rounded-2xl border shadow-sm"
                  style={{ borderColor: '#7133AE40' }}
                >
                  <Square size={18} strokeWidth={1.5} className="text-gray-300 flex-shrink-0" />
                  <input
                    ref={newTaskInputRef}
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')  commitAdd(dk)
                      if (e.key === 'Escape') { setAddingDay(null); setNewTaskText('') }
                    }}
                    onBlur={() => commitAdd(dk)}
                    placeholder="Type a task and press Enter…"
                    className="flex-1 text-sm text-gray-800 outline-none placeholder-gray-300 bg-transparent"
                  />
                  <button
                    onMouseDown={(e) => { e.preventDefault(); commitAdd(dk) }}
                    className="flex items-center justify-center w-6 h-6 rounded-md cursor-pointer flex-shrink-0"
                    style={{ backgroundColor: '#7133AE', color: 'white' }}
                  >
                    <Check size={12} strokeWidth={2.5} />
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); setAddingDay(null); setNewTaskText('') }}
                    className="flex items-center justify-center w-5 h-5 rounded-md cursor-pointer text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          </section>
        )
      })}
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
  onNavigateToTodos,
  onNavigateToDaily,
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
  onEnsureDailySummaryFolder,
  onCreatePageWithContent,
  allMeetings = [],
  currentUser = null,
  onSignOut,
}) {
  if (!project) return null

  const [activeTab,           setActiveTab]           = useState('recordings')
  const [deleteMeetingTarget, setDeleteMeetingTarget] = useState(null)
  const [daySummaryModal,     setDaySummaryModal]     = useState(null)  // { dateKey, meetings }
  const [storingSummary,      setStoringSummary]      = useState(false)
  const [storedSummary,       setStoredSummary]       = useState(false)

  /* Reset to recordings tab when switching projects */
  useEffect(() => { setActiveTab('recordings') }, [project.id])

  /* Store day summary in workspace */
  const handleStoreDaySummary = () => {
    if (!daySummaryModal || storingSummary) return
    const { dateKey, meetings: dayMeetings } = daySummaryModal
    const summary = buildDaySummary(dayMeetings)
    if (!summary) return

    setStoringSummary(true)
    const folderId  = onEnsureDailySummaryFolder()
    const pageTitle = formatPageDate(dateKey)
    const content   = buildDaySummaryHTML(dateKey, summary)

    // Check if a page for this date already exists in the system folder
    const existing = workspacePages.find(
      p => p.folderId === folderId && p.title === pageTitle
    )
    if (existing) {
      onUpdateWorkspacePage?.({ ...existing, content, updatedAt: new Date().toISOString() })
    } else {
      onCreatePageWithContent?.(folderId, pageTitle, content)
    }

    setStoringSummary(false)
    setStoredSummary(true)
    setTimeout(() => setStoredSummary(false), 2500)
  }

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
        meetings={allMeetings}
        activeProjectId={project.id}
        activeSidebarTab={null}
        onNavigateToProject={onNavigateToProject}
        onNavigateToDashboard={onNavigateToDashboard}
        onNavigateToTodos={onNavigateToTodos}
        onNavigateToDaily={onNavigateToDaily}
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
          {/* New Recording — always in top-right of header */}
          <button
            onClick={() => onStartRecording(project)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all duration-150 cursor-pointer flex-shrink-0"
            style={{ backgroundColor: '#7133AE' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#5f2a94' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7133AE' }}
          >
            <Mic size={14} strokeWidth={2.5} />
            New Recording
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-100 bg-white px-4 flex-shrink-0">
          {[
            { key: 'recordings', label: 'Recordings', icon: <Mic      size={13} strokeWidth={2.5} /> },
            { key: 'workspace',  label: 'Workspace',  icon: <FileText size={13} strokeWidth={2.5} /> },
            { key: 'todos',      label: 'To-Do',      icon: <ListTodo size={13} strokeWidth={2.5} /> },
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
                    Hit <span className="font-medium text-gray-600">New Recording</span> in the top right to capture your first meeting.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-8 w-full">
                {allDateKeys.map(dateKey => {
                  const dayMeetings = grouped[dateKey] || []
                  const hasSummary  = dayMeetings.some(m => m.summary && !m.summary._generating && m.summary.objective)
                  return (
                  <section key={dateKey}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={14} className="text-gray-400" />
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {formatDateGroup(dateKey)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Summarize Meetings CTA — only shown when day has 2+ meetings */}
                        {dayMeetings.length > 1 && (
                          <button
                            onClick={() => { setDaySummaryModal({ dateKey, meetings: dayMeetings }); setStoredSummary(false) }}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer transition-colors"
                            style={{ color: '#7133AE', borderColor: '#7133AE30', backgroundColor: '#7133AE08' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7133AE15' }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7133AE08' }}
                            title={hasSummary ? 'View cumulative summary for this day' : 'Summaries still generating…'}
                          >
                            <BookOpen size={12} strokeWidth={2.5} />
                            Summarize Meetings
                          </button>
                        )}
                      </div>
                    </div>

                    {/* No recordings for today */}
                    {dateKey === todayKey && dayMeetings.length === 0 && (
                      <p className="text-sm text-gray-400 py-3 px-1">
                        No recordings yet today. Start a new recording to capture your meeting.
                      </p>
                    )}

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
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
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
                  )
                })}
              </div>
            )
          )}

          {/* ── To-Do Tab ── */}
          {activeTab === 'todos' && (
            <TodoTab meetings={meetings} projectId={project.id} />
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

        {/* ── Day Summary Modal ── */}
        {daySummaryModal && (
          <DaySummaryModal
            dateKey={daySummaryModal.dateKey}
            meetings={daySummaryModal.meetings}
            onClose={() => { setDaySummaryModal(null); setStoredSummary(false) }}
            onStoreInWorkspace={handleStoreDaySummary}
            storing={storingSummary}
            stored={storedSummary}
          />
        )}

        {/* ── "Stored" toast — briefly shown after saving to workspace ── */}
        {storedSummary && !daySummaryModal && createPortal(
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg text-white text-sm font-medium"
            style={{ backgroundColor: '#16a34a' }}
          >
            <Check size={15} strokeWidth={2.5} />
            Summary saved to Meetings Summary folder
          </div>,
          document.body
        )}
      </main>
    </div>
  )
}
