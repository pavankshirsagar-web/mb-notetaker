import { useState, useEffect } from 'react'
import {
  ArrowLeft, Folder, Clock, Globe, Download,
  Pencil, Check, ChevronRight, Users, X, Copy, CheckCheck,
  Target, Hash, Lightbulb, CheckCircle2, ListChecks, Calendar,
  Square, SquareCheck, Sparkles,
} from 'lucide-react'
import Sidebar from '../components/Sidebar'

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function getInitials(name) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function resolveInitials(speakerId, overrideName) {
  if (overrideName && overrideName !== speakerId) return getInitials(overrideName)
  // defaults for generic IDs
  if (speakerId === 'You') return 'PK'
  if (speakerId.startsWith('Speaker ')) return speakerId.replace('Speaker ', 'S')
  return speakerId.slice(0, 2).toUpperCase()
}

/* ─────────────────────────────────────────────
   OBJECTIVE DISPLAY (read-only)
───────────────────────────────────────────── */
function ObjectiveDisplay({ value }) {
  return (
    <div className="rounded-xl border px-4 py-3.5" style={{ borderColor: '#f3f4f6', backgroundColor: '#fafafa' }}>
      {value
        ? <p className="text-sm leading-relaxed text-gray-700">{value}</p>
        : <p className="text-sm text-gray-300 italic">No objective recorded.</p>
      }
    </div>
  )
}

/* ─────────────────────────────────────────────
   BULLET ITEM (read-only)
───────────────────────────────────────────── */
function ReadOnlyBullet({ text }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5 px-1">
      <span className="w-1.5 h-1.5 rounded-full mt-[7px] flex-shrink-0 bg-gray-300" />
      <p className="text-sm text-gray-700 leading-relaxed flex-1">{text}</p>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SUMMARY SECTION WRAPPER
───────────────────────────────────────────── */
function SummarySection({ title, icon, headerRight, children }) {
  return (
    <div className="mb-7">
      {/* Section header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-gray-100">
              {icon}
            </div>
          )}
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            {title}
          </span>
        </div>
        {headerRight && <div className="flex-shrink-0">{headerRight}</div>}
      </div>
      {/* Items */}
      <div className="flex flex-col">{children}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   ACTION ITEM ROW — checkbox only (read-only)
───────────────────────────────────────────── */
function ActionItemRow({ item, onToggleMine, isLast }) {
  return (
    <div className={`flex items-center gap-3 py-2.5 ${!isLast ? 'border-b border-gray-100' : ''}`}>

      {/* Checkbox */}
      <button
        onClick={() => onToggleMine(!item.mine)}
        className="flex-shrink-0 cursor-pointer transition-colors"
        title={item.mine ? 'Unmark as mine' : 'Mark as mine'}
      >
        {item.mine
          ? <SquareCheck size={15} strokeWidth={2} style={{ color: '#7133AE' }} />
          : <Square     size={15} strokeWidth={1.5} className="text-gray-300 hover:text-gray-400" />
        }
      </button>

      {/* Task text */}
      <span
        className="flex-1 text-sm leading-snug select-none"
        style={{ color: item.mine ? '#374151' : '#6b7280' }}
      >
        {item.task}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MEETING DETAIL
───────────────────────────────────────────── */
export default function MeetingDetail({
  meeting,
  project,
  onBack,
  onUpdate,
  onRegenerateSummary,
  projects = [],
  onNavigateToProject,
  onNavigateToDashboard,
  onNavigateToTodos,
  onNavigateToDaily,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  currentUser = null,
  onSignOut,
}) {
  const [title,        setTitle]        = useState(meeting?.title ?? '')
  const [editingTitle, setEditingTitle] = useState(false)
  const [summary,      setSummary]      = useState(meeting?.summary ?? { objective: '', topicsDiscussed: [], keyInsights: [], decisionsMade: [], actionItems: [], _generating: false })

  /* ── Speaker rename state ── */
  const [speakerNames,   setSpeakerNames]   = useState(meeting?.speakerNames ?? {})
  const [showRename,     setShowRename]     = useState(false)
  const [draftNames,     setDraftNames]     = useState({})

  /* ── Copy feedback ── */
  const [transcriptCopied, setTranscriptCopied] = useState(false)
  const [summaryCopied,    setSummaryCopied]    = useState(false)

  // Sync summary from prop whenever it changes (covers _generating true→false and content updates)
  useEffect(() => {
    if (meeting?.summary) setSummary(meeting.summary)
  }, [meeting?.summary?._generating, meeting?.summary?.objective]) // eslint-disable-line

  if (!meeting || !project) return null

  /* Unique speaker IDs found in transcript */
  const uniqueSpeakers = [...new Set(meeting.transcript.map(l => l.speaker))]

  const openRenamePanel = () => {
    const init = {}
    uniqueSpeakers.forEach(s => { init[s] = speakerNames[s] || s })
    setDraftNames(init)
    setShowRename(true)
  }

  const applyRenames = () => {
    // Remove entries that were not actually changed from the ID
    const updated = {}
    uniqueSpeakers.forEach(s => {
      const trimmed = draftNames[s]?.trim()
      if (trimmed && trimmed !== s) updated[s] = trimmed
    })
    const merged = { ...speakerNames, ...updated }
    setSpeakerNames(merged)
    setShowRename(false)
    onUpdate({ ...meeting, speakerNames: merged })
  }

  /* ── Copy helpers ── */
  const copyTranscript = () => {
    const text = meeting.transcript
      .map(l => `${displayName(l.speaker)}: ${l.text}`)
      .join('\n\n')
    navigator.clipboard.writeText(text).then(() => {
      setTranscriptCopied(true)
      setTimeout(() => setTranscriptCopied(false), 2000)
    })
  }

  const buildSummaryText = () => {
    const parts = []
    if (summary.objective)              parts.push(`OBJECTIVE\n${summary.objective}`)
    if (summary.topicsDiscussed?.length) parts.push(`TOPICS DISCUSSED\n${summary.topicsDiscussed.map(t => `• ${t}`).join('\n')}`)
    if (summary.keyInsights?.length)    parts.push(`KEY INSIGHTS\n${summary.keyInsights.map(i => `• ${i}`).join('\n')}`)
    if (summary.decisionsMade?.length)  parts.push(`DECISIONS MADE\n${summary.decisionsMade.map(d => `• ${d}`).join('\n')}`)
    if (summary.actionItems?.length)    parts.push(`ACTION ITEMS\n${summary.actionItems.map(a => `• ${a.task} — Owner: ${a.owner}, Due: ${a.due}`).join('\n')}`)
    return parts.join('\n\n')
  }

  const copySummary = () => {
    navigator.clipboard.writeText(buildSummaryText()).then(() => {
      setSummaryCopied(true)
      setTimeout(() => setSummaryCopied(false), 2000)
    })
  }

  const downloadTranscript = () => {
    const text = meeting.transcript.map(l => `${displayName(l.speaker)}: ${l.text}`).join('\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${title} – Transcript.txt` })
    a.click(); URL.revokeObjectURL(a.href)
  }

  const downloadSummary = () => {
    const blob = new Blob([buildSummaryText()], { type: 'text/plain' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${title} – Summary.txt` })
    a.click(); URL.revokeObjectURL(a.href)
  }

  /* ── Display helpers ── */
  const displayName     = (speakerId) => speakerNames[speakerId] || speakerId
  const displayInitials = (speakerId) => resolveInitials(speakerId, speakerNames[speakerId])

  /* ── Title helpers ── */
  const updateTitle = () => {
    setEditingTitle(false)
    onUpdate({ ...meeting, title: title.trim() || meeting.title })
  }

  /* ── Objective helper ── */
  const updateObjective = (val) => {
    const updated = { ...summary, objective: val }
    setSummary(updated); onUpdate({ ...meeting, summary: updated })
  }

  /* ── Bullet helpers ── */
  const updateBullet = (section, idx, val) => {
    const next = [...(summary[section] || [])]; next[idx] = val
    const updated = { ...summary, [section]: next }
    setSummary(updated); onUpdate({ ...meeting, summary: updated })
  }
  const deleteBullet = (section, idx) => {
    const next = (summary[section] || []).filter((_, i) => i !== idx)
    const updated = { ...summary, [section]: next }
    setSummary(updated); onUpdate({ ...meeting, summary: updated })
  }
  const addBullet = (section) => {
    const next = [...(summary[section] || []), 'New item — click to edit']
    const updated = { ...summary, [section]: next }
    setSummary(updated); onUpdate({ ...meeting, summary: updated })
  }

  /* ── Action item → localStorage todo sync ── */
  const syncToTodos = (actionItems) => {
    if (!meeting.projectId || !meeting.dateKey) return
    const storageKey = `todos_${meeting.projectId}`
    let todos = {}
    try { todos = JSON.parse(localStorage.getItem(storageKey) || '{}') } catch { todos = {} }
    const dk = meeting.dateKey
    // Keep non-meeting-action todos intact; rebuild mine items
    const existing = (todos[dk] || []).filter(t => !t.id?.startsWith(`mact_${meeting.id}_`))
    const mineItems = actionItems
      .filter(item => item.mine)
      .map(item => ({
        id:        `mact_${meeting.id}_${item.id}`,
        text:      item.task,
        done:      false,
        source:    'ai',
        meetingId: meeting.id,
      }))
    todos[dk] = [...existing, ...mineItems]
    localStorage.setItem(storageKey, JSON.stringify(todos))
  }

  /* ── Action item helpers ── */
  const [todosSaved, setTodosSaved] = useState(false)

  const toggleMineAction = (idx, mine) => {
    setTodosSaved(false)
    const next = summary.actionItems.map((a, i) => i === idx ? { ...a, mine } : a)
    const updated = { ...summary, actionItems: next }
    setSummary(updated); onUpdate({ ...meeting, summary: updated })
  }
  const updateAction = (idx, val) => {
    const next = summary.actionItems.map((a, i) => i === idx ? val : a)
    const updated = { ...summary, actionItems: next }
    setSummary(updated); onUpdate({ ...meeting, summary: updated })
  }
  const deleteAction = (idx) => {
    const next = summary.actionItems.filter((_, i) => i !== idx)
    const updated = { ...summary, actionItems: next }
    setSummary(updated); onUpdate({ ...meeting, summary: updated })
    syncToTodos(next)
  }
  const addAction = () => {
    setTodosSaved(false)
    const newItem = { id: Date.now(), task: 'New action item', owner: '', due: '', mine: true }
    const next = [...(summary.actionItems || []), newItem]
    const updated = { ...summary, actionItems: next }
    setSummary(updated); onUpdate({ ...meeting, summary: updated })
  }
  const handleAddToTodos = () => {
    syncToTodos(summary.actionItems || [])
    setTodosSaved(true)
  }
  const checkedCount = (summary.actionItems || []).filter(a => a.mine).length

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        projects={projects}
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

        {/* ── Header — single row, 72px ── */}
        <div className="flex items-center gap-3 px-6 bg-white border-b border-gray-100 flex-shrink-0" style={{ height: 72 }}>

          {/* Back */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex-shrink-0"
          >
            <ArrowLeft size={15} />
            Back
          </button>

          <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

          {/* Editable title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={updateTitle}
                onKeyDown={(e) => { if (e.key === 'Enter') updateTitle() }}
                className="text-base font-semibold text-gray-900 tracking-tight border-b-2 border-purple-400 outline-none bg-transparent pb-0.5 min-w-0 w-64"
              />
            ) : (
              <>
                <h1 className="text-base font-semibold text-gray-900 tracking-tight truncate">{title}</h1>
                <button
                  onClick={() => setEditingTitle(true)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex-shrink-0"
                >
                  <Pencil size={13} />
                </button>
              </>
            )}
          </div>

          {/* Meta — right side */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Clock size={11} strokeWidth={2} />
              {meeting.date} · {meeting.time} · {meeting.duration}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Globe size={11} strokeWidth={2} />
              {meeting.language}
            </span>
          </div>

        </div>

        {/* ── Body: Transcript + AI Summary ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* LEFT — Transcript (40%) */}
          <div className="w-[40%] flex flex-col border-r border-gray-100 bg-white overflow-hidden">

            {/* Transcript header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <span className="text-sm font-semibold text-gray-700">Transcript</span>
                <span className="ml-2 text-xs text-gray-400">{meeting.transcript.length} segments</span>
              </div>
              <div className="flex items-center gap-0.5">
                {/* Copy transcript */}
                <button
                  onClick={copyTranscript}
                  title="Copy transcript"
                  className="p-1.5 rounded-lg transition-colors cursor-pointer"
                  style={{ color: transcriptCopied ? '#059669' : '#6b7280' }}
                  onMouseEnter={(e) => { if (!transcriptCopied) { e.currentTarget.style.backgroundColor = '#f3f4f6'; e.currentTarget.style.color = '#111827' } }}
                  onMouseLeave={(e) => { if (!transcriptCopied) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6b7280' } }}
                >
                  {transcriptCopied ? <CheckCheck size={14} /> : <Copy size={14} />}
                </button>
                {/* Download transcript */}
                <button
                  onClick={downloadTranscript}
                  title="Download transcript"
                  className="p-1.5 rounded-lg transition-colors cursor-pointer text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                >
                  <Download size={14} />
                </button>
                {/* Rename speakers */}
                <button
                  onClick={openRenamePanel}
                  title="Rename speakers"
                  className="p-1.5 rounded-lg transition-colors cursor-pointer"
                  style={{ backgroundColor: showRename ? '#7133AE12' : 'transparent', color: showRename ? '#7133AE' : '#6b7280' }}
                  onMouseEnter={(e) => { if (!showRename) { e.currentTarget.style.backgroundColor = '#f3f4f6'; e.currentTarget.style.color = '#111827' } }}
                  onMouseLeave={(e) => { if (!showRename) { e.currentTarget.style.backgroundColor = showRename ? '#7133AE12' : 'transparent'; e.currentTarget.style.color = showRename ? '#7133AE' : '#6b7280' } }}
                >
                  <Users size={14} />
                </button>
              </div>
            </div>

            {/* ── Rename panel ── */}
            {showRename && (
              <div className="flex-shrink-0 border-b border-purple-100 bg-purple-50 px-5 py-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-purple-800">Rename Speakers</p>
                    <p className="text-xs text-purple-500 mt-0.5 leading-relaxed">
                      Changes apply across the entire transcript.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowRename(false)}
                    className="p-1 rounded-lg hover:bg-purple-100 text-purple-400 hover:text-purple-600 cursor-pointer transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  {uniqueSpeakers.map(speakerId => (
                    <div key={speakerId} className="flex items-center gap-2.5">
                      {/* Avatar */}
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-semibold"
                        style={{ backgroundColor: meeting.transcript.find(l => l.speaker === speakerId)?.color ?? '#9ca3af' }}
                      >
                        {resolveInitials(speakerId, speakerNames[speakerId])}
                      </div>
                      {/* Current ID label */}
                      <span className="text-xs text-purple-700 font-medium w-20 flex-shrink-0 truncate">{speakerId}</span>
                      {/* Arrow */}
                      <ChevronRight size={11} className="text-purple-300 flex-shrink-0" />
                      {/* Input */}
                      <input
                        type="text"
                        value={draftNames[speakerId] ?? speakerId}
                        onChange={(e) => setDraftNames(d => ({ ...d, [speakerId]: e.target.value }))}
                        placeholder="Enter real name"
                        className="flex-1 text-xs text-gray-700 bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 outline-none transition-all"
                        onFocus={(e) => { e.target.style.borderColor = '#7133AE'; e.target.style.boxShadow = '0 0 0 2px #7133AE14' }}
                        onBlur={(e)  => { e.target.style.borderColor = '#e9d5ff'; e.target.style.boxShadow = 'none' }}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={applyRenames}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer"
                    style={{ backgroundColor: '#7133AE' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#5f2a94' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7133AE' }}
                  >
                    <Check size={12} />
                    Apply Changes
                  </button>
                  <button
                    onClick={() => setShowRename(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Transcript lines */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
              {meeting.transcript.length === 0 ? (
                <p className="text-gray-400 text-sm text-center pt-8">No transcript available.</p>
              ) : (
                meeting.transcript.map((line) => (
                  <div key={line.id} className="flex gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold mt-0.5"
                      style={{ backgroundColor: line.color }}
                    >
                      {displayInitials(line.speaker)}
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-gray-500 block mb-1">
                        {displayName(line.speaker)}
                      </span>
                      <p className="text-sm text-gray-700 leading-relaxed">{line.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT — AI Summary (60%) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
            <div className="px-6 py-3.5 border-b border-gray-100 flex-shrink-0 bg-white flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">AI Summary</span>
              <div className="flex items-center gap-0.5">
                {/* Copy summary */}
                <button
                  onClick={copySummary}
                  title="Copy summary"
                  className="p-1.5 rounded-lg transition-colors cursor-pointer"
                  style={{ color: summaryCopied ? '#059669' : '#6b7280' }}
                  onMouseEnter={(e) => { if (!summaryCopied) { e.currentTarget.style.backgroundColor = '#f3f4f6'; e.currentTarget.style.color = '#111827' } }}
                  onMouseLeave={(e) => { if (!summaryCopied) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6b7280' } }}
                >
                  {summaryCopied ? <CheckCheck size={14} /> : <Copy size={14} />}
                </button>
                {/* Download summary */}
                <button
                  onClick={downloadSummary}
                  title="Download summary"
                  className="p-1.5 rounded-lg transition-colors cursor-pointer text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* ── Loading state ── */}
              {summary._generating && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-purple-200 border-t-purple-600 animate-spin" />
                  <p className="text-sm text-gray-400 font-medium">Generating AI summary…</p>
                  <p className="text-xs text-gray-300">This usually takes 5–10 seconds</p>
                </div>
              )}

              {/* ── Empty summary — no AI run yet OR failed, show generate CTA ── */}
              {!summary._generating && !summary.objective && !(summary.topicsDiscussed?.length) && !(summary.keyInsights?.length) && !(summary.decisionsMade?.length) && !(summary.actionItems?.length) && meeting?.transcript?.length > 0 && (
                <div className="flex flex-col items-center justify-center py-14 gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#7133AE12' }}>
                    <Sparkles size={22} style={{ color: '#7133AE' }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      {summary._failed ? 'Generation failed' : 'AI Summary not generated yet'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {summary._failed
                        ? 'Check your Groq API key in .env and restart the dev server.'
                        : 'Your transcript is ready. Generate a structured summary now.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSummary(s => ({ ...s, _generating: true }))
                      onRegenerateSummary?.(meeting.id)
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer"
                    style={{ backgroundColor: '#7133AE' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#5f2a94' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7133AE' }}
                  >
                    <Sparkles size={14} strokeWidth={2} />
                    {summary._failed ? 'Retry Generation' : 'Generate AI Summary'}
                  </button>
                </div>
              )}

              {/* ── Summary content ── */}
              {!summary._generating && (
                <>
                  {/* 1. Objective */}
                  <div className="mb-7">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-gray-100">
                        <Target size={11} className="text-gray-400" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                        Objective
                      </span>
                    </div>
                    <ObjectiveDisplay value={summary.objective} />
                  </div>

                  {/* 2. Topics Discussed */}
                  <SummarySection title="Topics Discussed"
                    icon={<Hash size={11} className="text-gray-400" />}>
                    {(summary.topicsDiscussed || []).map((t, i) => (
                      <ReadOnlyBullet key={i} text={t} />
                    ))}
                  </SummarySection>

                  {/* 3. Key Insights */}
                  <SummarySection title="Key Insights"
                    icon={<Lightbulb size={11} className="text-gray-400" />}>
                    {(summary.keyInsights || []).map((h, i) => (
                      <ReadOnlyBullet key={i} text={h} />
                    ))}
                  </SummarySection>

                  {/* 4. Decisions Made */}
                  <SummarySection title="Decisions Made"
                    icon={<CheckCircle2 size={11} className="text-gray-400" />}>
                    {(summary.decisionsMade || []).map((d, i) => (
                      <ReadOnlyBullet key={i} text={d} />
                    ))}
                  </SummarySection>

                  {/* 5. Action Items */}
                  <SummarySection title="Action Items"
                    icon={<ListChecks size={11} className="text-gray-400" />}
                    headerRight={(summary.actionItems || []).length > 0 && (
                      <button
                        onClick={handleAddToTodos}
                        disabled={checkedCount === 0 && !todosSaved}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all"
                        style={{
                          borderColor:     todosSaved ? '#16a34a' : checkedCount > 0 ? '#7133AE' : '#e5e7eb',
                          color:           todosSaved ? '#16a34a' : checkedCount > 0 ? '#7133AE' : '#d1d5db',
                          backgroundColor: todosSaved ? '#f0fdf4'  : checkedCount > 0 ? '#7133AE0A' : 'transparent',
                          cursor:          checkedCount === 0 && !todosSaved ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {todosSaved
                          ? <><Check size={11} strokeWidth={2.5} /> Saved to To-Do list</>
                          : <><SquareCheck size={11} strokeWidth={2.5} /> Add to To-Do list</>
                        }
                      </button>
                    )}>

                    {(summary.actionItems || []).length === 0 ? (
                      <p className="text-xs text-gray-300 py-1">No action items recorded.</p>
                    ) : (
                      <div className="rounded-xl border border-gray-100 overflow-hidden px-3">
                        {(summary.actionItems || []).map((item, i, arr) => (
                          <ActionItemRow
                            key={item.id ?? i}
                            item={item}
                            isLast={i === arr.length - 1}
                            onToggleMine={(mine) => toggleMineAction(i, mine)}
                          />
                        ))}
                      </div>
                    )}
                  </SummarySection>
                </>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
