import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Code, Minus,
  Heading1, Heading2, Heading3, ChevronLeft, ChevronRight, Folder, FolderOpen,
} from 'lucide-react'
import Sidebar from '../components/Sidebar'

/* ─── Toolbar button ─────────────────────────────────────────────────────── */
function ToolBtn({ onClick, active, title, children }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={[
        'flex items-center justify-center w-7 h-7 rounded-md text-sm transition-colors cursor-pointer flex-shrink-0',
        active
          ? 'bg-purple-100 text-purple-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

const Sep = () => <div className="w-px h-5 bg-gray-200 mx-0.5 flex-shrink-0" />

/* ─────────────────────────────────────────────
   WORKSPACE PAGE EDITOR
───────────────────────────────────────────── */
export default function WorkspacePageEditor({
  page,
  folder,
  project,
  projects = [],
  onBack,
  onUpdatePage,
  onNavigateToProject,
  onNavigateToDashboard,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  currentUser = null,
  onSignOut,
}) {
  if (!page) return null

  const [title, setTitle]           = useState(page.title || 'Untitled')
  const [saveStatus, setSaveStatus] = useState('saved')
  const saveTimerRef                = useRef(null)

  /* Debounced save — 800 ms after last keystroke */
  const scheduleSave = useCallback((newTitle, editorJson) => {
    setSaveStatus('saving')
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      onUpdatePage({ ...page, title: newTitle, content: editorJson, updatedAt: new Date().toISOString() })
      setSaveStatus('saved')
    }, 800)
  }, [page, onUpdatePage])  // eslint-disable-line react-hooks/exhaustive-deps

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: page.content || '',
    onUpdate: ({ editor }) => {
      scheduleSave(title, editor.getJSON())
    },
  })

  /* Sync content when page ID changes */
  useEffect(() => {
    if (!editor) return
    setTitle(page.title || 'Untitled')
    editor.commands.setContent(page.content || '', false)
  }, [page.id])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(saveTimerRef.current), [])

  const handleTitleChange = (e) => {
    setTitle(e.target.value)
    scheduleSave(e.target.value, editor?.getJSON())
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); editor?.commands.focus() }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        projects={projects}
        activeProjectId={project?.id}
        onNavigateToProject={onNavigateToProject}
        onNavigateToDashboard={onNavigateToDashboard}
        onCreateProject={onCreateProject}
        onRenameProject={onRenameProject}
        onDeleteProject={onDeleteProject}
        currentUser={currentUser}
        onSignOut={onSignOut}
      />

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* ── Header (matches ProjectPage header height) ── */}
        <div className="flex items-center justify-between px-8 py-3 bg-white border-b border-gray-100 flex-shrink-0 gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#7133AE12' }}
            >
              <Folder size={16} strokeWidth={2} style={{ color: '#7133AE' }} />
            </div>
            <h1 className="text-gray-900 font-semibold text-base tracking-tight leading-tight truncate">
              {project?.name}
            </h1>
          </div>
          <span className={[
            'text-xs tabular-nums transition-colors flex-shrink-0',
            saveStatus === 'saving' ? 'text-purple-400' : 'text-gray-300',
          ].join(' ')}>
            {saveStatus === 'saving' ? 'Saving…' : 'All changes saved'}
          </span>
        </div>

        {/* ── Breadcrumb (below header — folder › page name) ── */}
        <div className="flex items-center gap-1.5 px-8 py-2.5 bg-white border-b border-gray-100 flex-shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer flex-shrink-0"
          >
            <ChevronLeft size={13} strokeWidth={2} />
            <FolderOpen size={12} style={{ color: '#7133AE' }} />
            <span className="font-medium truncate max-w-[140px]">{folder?.name || 'Folder'}</span>
          </button>
          <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />
          <span className="text-xs font-semibold text-gray-700 truncate max-w-[240px]">
            {title || 'Untitled'}
          </span>
        </div>

        {/* ── Scrollable editor area ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 pt-6 pb-24">

            {/* Page title */}
            <input
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              placeholder="Untitled"
              className="w-full text-[2rem] font-bold text-gray-900 outline-none bg-transparent placeholder-gray-200 mb-6 leading-tight"
            />

            {/* ── Formatting toolbar ── */}
            {editor && (
              <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 bg-white border border-gray-200 rounded-xl mb-5 sticky top-3 z-10 shadow-sm">
                <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1"><Heading1 size={14} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2"><Heading2 size={14} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3"><Heading3 size={14} /></ToolBtn>

                <Sep />

                <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()}      active={editor.isActive('bold')}      title="Bold (⌘B)"><Bold size={13} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()}    active={editor.isActive('italic')}    title="Italic (⌘I)"><Italic size={13} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (⌘U)"><UnderlineIcon size={13} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()}    active={editor.isActive('strike')}    title="Strikethrough"><Strikethrough size={13} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()}      active={editor.isActive('code')}      title="Inline code"><Code size={12} /></ToolBtn>

                <Sep />

                <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive('bulletList')}  title="Bullet list"><List size={14} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list"><ListOrdered size={14} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()}  active={editor.isActive('blockquote')}  title="Blockquote"><Quote size={13} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()}   active={editor.isActive('codeBlock')}   title="Code block"><Code size={14} strokeWidth={1.5} /></ToolBtn>

                <Sep />

                <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider"><Minus size={13} /></ToolBtn>
              </div>
            )}

            {/* ── Editor content ── */}
            <EditorContent editor={editor} className="tiptap-editor" />
          </div>
        </div>
      </main>
    </div>
  )
}
