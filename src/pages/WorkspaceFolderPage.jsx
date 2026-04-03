import { FileText, Plus, Clock, ChevronRight, FolderOpen } from 'lucide-react'
import Sidebar from '../components/Sidebar'

/* ─────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────── */
const EmptyIllustration = () => (
  <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-40 h-auto">
    <rect x="40" y="50" width="120" height="90" rx="10" fill="#7133AE" fillOpacity="0.06" stroke="#7133AE" strokeOpacity="0.15" strokeWidth="1.5" />
    <rect x="58" y="70" width="84" height="7"  rx="3.5" fill="#7133AE" fillOpacity="0.25" />
    <rect x="58" y="84" width="60" height="5"  rx="2.5" fill="#7133AE" fillOpacity="0.13" />
    <rect x="58" y="95" width="72" height="5"  rx="2.5" fill="#7133AE" fillOpacity="0.10" />
    <rect x="58" y="106" width="50" height="5" rx="2.5" fill="#7133AE" fillOpacity="0.08" />
    <circle cx="100" cy="152" r="16" fill="#7133AE" fillOpacity="0.08" stroke="#7133AE" strokeOpacity="0.18" strokeWidth="1.5" />
    <rect x="94" y="145" width="12" height="15" rx="6" fill="#7133AE" fillOpacity="0.45" />
    <path d="M91 158c0 5 4 9 9 9s9-4 9-9" stroke="#7133AE" strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

/* ─────────────────────────────────────────────
   WORKSPACE FOLDER PAGE
───────────────────────────────────────────── */
export default function WorkspaceFolderPage({
  folder,
  pages = [],
  projects = [],
  workspaceFolders = [],
  onNavigateToPage,
  onCreatePage,
  onNavigateToProject,
  onNavigateToDashboard,
  onNavigateToWorkspaceFolder,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onCreateWorkspaceFolder,
  onRenameWorkspaceFolder,
  onDeleteWorkspaceFolder,
  currentUser = null,
  onSignOut,
  onSwitchTab,
}) {
  if (!folder) return null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        projects={projects}
        sidebarTab="workspace"
        onSwitchTab={onSwitchTab}
        workspaceFolders={workspaceFolders}
        activeWorkspaceFolderId={folder.id}
        onNavigateToProject={onNavigateToProject}
        onNavigateToDashboard={onNavigateToDashboard}
        onNavigateToWorkspaceFolder={onNavigateToWorkspaceFolder}
        onCreateProject={onCreateProject}
        onRenameProject={onRenameProject}
        onDeleteProject={onDeleteProject}
        onCreateWorkspaceFolder={onCreateWorkspaceFolder}
        onRenameWorkspaceFolder={onRenameWorkspaceFolder}
        onDeleteWorkspaceFolder={onDeleteWorkspaceFolder}
        currentUser={currentUser}
        onSignOut={onSignOut}
      />

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 flex-shrink-0 gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#7133AE12' }}
            >
              <FolderOpen size={18} strokeWidth={2} style={{ color: '#7133AE' }} />
            </div>
            <h1 className="text-gray-900 font-semibold text-xl tracking-tight leading-tight truncate">
              {folder.name}
            </h1>
          </div>

          <button
            onClick={onCreatePage}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-150 cursor-pointer flex-shrink-0"
            style={{ backgroundColor: '#7133AE' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#5f2a94' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7133AE' }}
          >
            <Plus size={15} />
            New Page
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <EmptyIllustration />
              <div>
                <p className="text-gray-700 font-semibold text-base mb-1">No pages yet</p>
                <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
                  Create your first page to start writing notes, docs, or anything you need.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full">
              {pages.map(pg => (
                <button
                  key={pg.id}
                  onClick={() => onNavigateToPage(pg.id)}
                  className="group w-full text-left bg-white rounded-2xl border border-gray-100 px-5 py-4 hover:shadow-sm transition-all duration-150 cursor-pointer"
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7133AE30' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#f3f4f6' }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText
                        size={16}
                        className="text-gray-300 group-hover:text-purple-400 transition-colors flex-shrink-0"
                      />
                      <p className="text-gray-900 font-medium text-sm leading-snug truncate group-hover:text-purple-700 transition-colors">
                        {pg.title || 'Untitled'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 text-gray-400 text-xs">
                      {pg.updatedAt && (
                        <>
                          <Clock size={11} strokeWidth={2} />
                          <span>
                            {new Date(pg.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </>
                      )}
                      <ChevronRight
                        size={16}
                        className="text-gray-300 group-hover:text-purple-400 transition-colors ml-1"
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
