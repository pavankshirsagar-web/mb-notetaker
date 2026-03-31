import { Folder, Mic, Clock, Globe, ChevronRight, CalendarDays } from 'lucide-react'
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
   EMPTY STATE
───────────────────────────────────────────── */
const EmptyIllustration = () => (
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
}) {
  if (!project) return null

  /* Group meetings by dateKey, sorted newest first */
  const grouped = meetings.reduce((acc, m) => {
    if (!acc[m.dateKey]) acc[m.dateKey] = []
    acc[m.dateKey].push(m)
    return acc
  }, {})
  const sortedDateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

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
      />

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between px-8 bg-white border-b border-gray-100 flex-shrink-0" style={{ height: 72 }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#7133AE12' }}
            >
              <Folder size={18} strokeWidth={2} style={{ color: '#7133AE' }} />
            </div>
            <div>
              <h1 className="text-gray-900 font-semibold text-xl tracking-tight">{project.name}</h1>
              <p className="text-gray-400 text-xs mt-0.5">
                {meetings.length} {meetings.length === 1 ? 'meeting' : 'meetings'}
              </p>
            </div>
          </div>

          <button
            onClick={() => onStartRecording(project)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-150 cursor-pointer"
            style={{ backgroundColor: '#7133AE' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#5f2a94' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7133AE' }}
          >
            <Mic size={15} />
            New Recording
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-8 py-6">

          {meetings.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <EmptyIllustration />
              <div>
                <p className="text-gray-700 font-semibold text-base mb-1">No meetings yet</p>
                <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
                  Start a recording to capture your first meeting in this project.
                </p>
              </div>
            </div>
          ) : (
            /* Meeting groups */
            <div className="flex flex-col gap-8 w-full">
              {sortedDateKeys.map(dateKey => (
                <section key={dateKey}>
                  {/* Date group header */}
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays size={14} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {formatDateGroup(dateKey)}
                    </span>
                  </div>

                  {/* Meeting cards */}
                  <div className="flex flex-col gap-2">
                    {grouped[dateKey].map(meeting => (
                      <button
                        key={meeting.id}
                        onClick={() => onNavigateToMeeting(meeting.id)}
                        className="group w-full text-left bg-white rounded-2xl border border-gray-100 px-5 py-4 hover:border-purple-200 hover:shadow-sm transition-all duration-150 cursor-pointer"
                        style={{}}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7133AE30' }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#f3f4f6' }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* Left — title + meta */}
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 font-semibold text-sm leading-snug truncate group-hover:text-purple-700 transition-colors"
                              style={{}}>
                              {meeting.title}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className="flex items-center gap-1 text-gray-400 text-xs">
                                <Clock size={11} strokeWidth={2} />
                                {meeting.time} · {meeting.duration}
                              </span>
                              <span className="flex items-center gap-1 text-gray-400 text-xs">
                                <Globe size={11} strokeWidth={2} />
                                {meeting.language}
                              </span>
                            </div>
                          </div>

                          {/* Right — badges + arrow */}
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
                            <ChevronRight
                              size={16}
                              className="text-gray-300 group-hover:text-purple-400 transition-colors ml-1"
                            />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
