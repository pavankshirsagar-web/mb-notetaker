import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus, Folder, MoreHorizontal, Pencil, Trash2, X, Search,
  BookOpen,
  Square, SquareCheck, CalendarDays, Sparkles,
  RefreshCw,
} from 'lucide-react'

/* ─── Portal project ⋯ menu ──────────────────────────────────────────────── */
function ProjectMenu({ project, anchorRect, onRename, onDelete, onClose, menuRef }) {
  const MENU_WIDTH = 172
  const left = Math.min(anchorRect.right + 6, window.innerWidth - MENU_WIDTH - 8)
  const top  = anchorRect.top
  return createPortal(
    <div ref={menuRef} className="bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden"
      style={{ position: 'fixed', top, left, width: MENU_WIDTH, zIndex: 9999 }}>
      <button onMouseDown={(e) => { e.preventDefault(); onRename(project) }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-left">
        <Pencil size={13} className="text-gray-400 flex-shrink-0" />
        Rename project
      </button>
      <div className="mx-3 border-t border-gray-100" />
      <button onMouseDown={(e) => { e.preventDefault(); onDelete(project); onClose() }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left">
        <Trash2 size={13} className="flex-shrink-0" />
        Delete project
      </button>
    </div>,
    document.body
  )
}

/* ─── Date helpers ───────────────────────────────────────────────────────── */
function fmtKey(dk) {
  const today     = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dk === today)     return 'TODAY'
  if (dk === yesterday) return 'YESTERDAY'
  const d = new Date(dk + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 1 — GLOBAL TO-DO LIST
═══════════════════════════════════════════════════════════════════════════ */
export function GlobalTodoTab({ projects, meetings, activeProjectId, fullPage = false }) {
  const todayKey = new Date().toISOString().split('T')[0]

  /* ── read/write helpers ─────────────────────────────────────────────── */
  const readProj = (pid) => { try { return JSON.parse(localStorage.getItem(`todos_${pid}`) || '{}') } catch { return {} } }
  const saveProj = (pid, data) => localStorage.setItem(`todos_${pid}`, JSON.stringify(data))
  const readPersonal = () => { try { return JSON.parse(localStorage.getItem('todos_personal') || '{}') } catch { return {} } }
  const savePersonal = (data) => localStorage.setItem('todos_personal', JSON.stringify(data))

  /* ── state ──────────────────────────────────────────────────────────── */
  /* tasksByProject: { [projectId|'personal']: { [dateKey]: Task[] } } */
  const initTasks = () => {
    const r = { personal: readPersonal() }
    projects.forEach(p => { r[p.id] = readProj(p.id) })
    return r
  }
  const [tasksByProject, setTasksByProject] = useState(initTasks)
  const [addingDay,  setAddingDay]  = useState(null)
  const [newText,    setNewText]    = useState('')
  const [editingId,  setEditingId]  = useState(null)
  const [editText,   setEditText]   = useState('')
  const inputRef = useRef(null)

  /* Reload when projects list changes */
  useEffect(() => {
    setTasksByProject(initTasks())
  }, [projects.length]) // eslint-disable-line

  /* Focus new-task input */
  useEffect(() => { if (addingDay && inputRef.current) inputRef.current.focus() }, [addingDay])

  /* ── Reload todos when localStorage changes (from MeetingDetail mine toggles) ── */
  useEffect(() => {
    const onStorage = () => setTasksByProject(initTasks())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [projects.length]) // eslint-disable-line

  /* ── Flatten for day-wise view ───────────────────────────────────────── */
  const byDay = (() => {
    const r = {}
    const projMap = Object.fromEntries(projects.map(p => [p.id, p.name]))

    // project tasks
    projects.forEach(proj => {
      const pTasks = tasksByProject[proj.id] || {}
      Object.entries(pTasks).forEach(([dk, tasks]) => {
        if (!r[dk]) r[dk] = []
        tasks.forEach(t => r[dk].push({ ...t, projectId: proj.id, projectName: projMap[proj.id] || '', dateKey: dk }))
      })
    })
    // personal tasks
    const personal = tasksByProject.personal || {}
    Object.entries(personal).forEach(([dk, tasks]) => {
      if (!r[dk]) r[dk] = []
      tasks.forEach(t => r[dk].push({ ...t, projectId: 'personal', projectName: '', dateKey: dk }))
    })
    return r
  })()

  const allKeys = [...new Set([todayKey, ...Object.keys(byDay)])].sort((a, b) => b.localeCompare(a))

  /* ── CRUD ────────────────────────────────────────────────────────────── */
  const updateProjTasks = (pid, dk, updater) => {
    setTasksByProject(prev => {
      const projTasks = { ...(prev[pid] || {}) }
      projTasks[dk]   = updater(projTasks[dk] || [])
      const next      = { ...prev, [pid]: projTasks }
      if (pid === 'personal') savePersonal(next.personal)
      else saveProj(pid, next[pid])
      return next
    })
  }

  const toggleDone = (task) => {
    updateProjTasks(task.projectId, task.dateKey, tasks =>
      tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t)
    )
  }

  const commitAdd = (dk) => {
    const txt = newText.trim()
    if (!txt) { setAddingDay(null); setNewText(''); return }
    const pid = activeProjectId || 'personal'
    const newTask = { id: `manual_${Date.now()}`, text: txt, done: false, source: 'manual', due: '' }
    updateProjTasks(pid, dk, tasks => [...tasks, newTask])
    setNewText('')
    // keep addingDay open for another entry; blur will close
  }

  const commitEdit = (task) => {
    const txt = editText.trim()
    if (txt && txt !== task.text)
      updateProjTasks(task.projectId, task.dateKey, tasks =>
        tasks.map(t => t.id === task.id ? { ...t, text: txt } : t)
      )
    setEditingId(null); setEditText('')
  }

  const deleteTask = (task) => {
    updateProjTasks(task.projectId, task.dateKey, tasks => tasks.filter(t => t.id !== task.id))
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {fullPage && (
        <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7133AE12' }}>
            <ListTodo size={16} style={{ color: '#7133AE' }} />
          </div>
          <div>
            <h1 className="text-gray-900 font-semibold text-base leading-tight">To-Do</h1>
            <p className="text-xs text-gray-400 leading-tight">Tasks across all your projects</p>
          </div>
        </div>
      )}
    <div className="flex flex-col flex-1 overflow-y-auto py-3 px-3 gap-6">
      {allKeys.map(dk => {
        const dayTasks  = byDay[dk] || []
        const doneCount = dayTasks.filter(t => t.done).length
        const isToday   = dk === todayKey

        return (
          <section key={dk}>
            {/* Day header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <CalendarDays size={11} className="text-gray-400 flex-shrink-0" />
                <span className="text-[10px] font-semibold text-gray-400 tracking-wider">{fmtKey(dk)}</span>
                {dayTasks.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ backgroundColor: doneCount === dayTasks.length && dayTasks.length > 0 ? '#f0fdf4' : '#7133AE0D',
                             color: doneCount === dayTasks.length && dayTasks.length > 0 ? '#16a34a' : '#7133AE' }}>
                    {doneCount}/{dayTasks.length}
                  </span>
                )}
              </div>
              {isToday && (
                <button onClick={() => setAddingDay(dk)}
                  className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer transition-all px-2.5 py-1 rounded-lg border"
                  style={{ color: '#7133AE', borderColor: '#7133AE40', backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7133AE0A'; e.currentTarget.style.borderColor = '#7133AE80' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#7133AE40' }}>
                  <Plus size={10} strokeWidth={2.5} />
                  Add
                </button>
              )}
            </div>

            {/* Task list */}
            <div className="flex flex-col gap-1.5">
              {dayTasks.length === 0 && !addingDay && isToday && (
                <button onClick={() => setAddingDay(dk)}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl border border-dashed text-xs text-gray-400 cursor-pointer w-full text-left transition-colors"
                  style={{ borderColor: '#e5e7eb' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7133AE40' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb' }}>
                  <Square size={13} strokeWidth={1.5} className="text-gray-300 flex-shrink-0" />
                  Click to add a task…
                </button>
              )}
              {dayTasks.length === 0 && !isToday && (
                <p className="text-xs text-gray-300 px-1">No tasks for this day.</p>
              )}

              {dayTasks.map(task => (
                <div key={task.id}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all"
                  style={{
                    backgroundColor: task.done ? '#fafafa' : '#ffffff',
                    borderColor: task.done ? '#f0f0f0' : '#f3f4f6',
                    opacity: task.done ? 0.55 : 1,
                  }}
                  onMouseEnter={(e) => { if (!task.done) e.currentTarget.style.borderColor = '#7133AE20' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = task.done ? '#f0f0f0' : '#f3f4f6' }}>

                  {/* Checkbox */}
                  <button onClick={() => toggleDone(task)}
                    className="flex-shrink-0 cursor-pointer transition-colors">
                    {task.done
                      ? <SquareCheck size={16} strokeWidth={2} style={{ color: '#9ca3af' }} />
                      : <Square size={16} strokeWidth={1.5} className="text-gray-300" />
                    }
                  </button>

                  {/* Task text — inline edit for today */}
                  <div className="flex-1 min-w-0">
                    {editingId === task.id ? (
                      <input value={editText} onChange={(e) => setEditText(e.target.value)}
                        onBlur={() => commitEdit(task)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(task); if (e.key === 'Escape') { setEditingId(null); setEditText('') } }}
                        autoFocus
                        className="w-full text-sm text-gray-800 bg-transparent outline-none border-b"
                        style={{ borderColor: '#7133AE' }}
                      />
                    ) : (
                      <p className="text-sm leading-snug"
                        style={{
                          color: task.done ? '#b0b7c3' : '#374151',
                          textDecoration: task.done ? 'line-through' : 'none',
                          textDecorationColor: '#c4c9d4',
                          cursor: !task.done ? 'text' : 'default',
                        }}
                        onDoubleClick={() => { if (!task.done) { setEditingId(task.id); setEditText(task.text) } }}>
                        {task.text}
                      </p>
                    )}
                  </div>

                  {/* Project chip — neutral, end of row */}
                  {task.projectName && (
                    <span className="flex-shrink-0 px-2 py-0.5 rounded-md text-[11px] font-medium leading-tight"
                      style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                      {task.projectName}
                    </span>
                  )}

                  {/* Edit + Delete — always visible, tightly grouped */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {!task.done && editingId !== task.id && (
                      <button
                        onClick={() => { setEditingId(task.id); setEditText(task.text) }}
                        className="w-6 h-6 flex items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-blue-50"
                        title="Edit task">
                        <Pencil size={12} className="text-gray-300 hover:text-blue-400 transition-colors" />
                      </button>
                    )}
                    <button onClick={() => deleteTask(task)}
                      className="w-6 h-6 flex items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-red-50"
                      title="Delete task">
                      <Trash2 size={12} className="text-gray-300 hover:text-red-400 transition-colors" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Inline add row — today only */}
              {addingDay === dk && isToday && (
                <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-white border"
                  style={{ borderColor: '#7133AE40' }}>
                  <Square size={15} strokeWidth={1.5} className="text-gray-300 flex-shrink-0" />
                  <input ref={inputRef} value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(dk); if (e.key === 'Escape') { setAddingDay(null); setNewText('') } }}
                    onBlur={() => { commitAdd(dk); setAddingDay(null) }}
                    placeholder="Type task + Enter…"
                    className="flex-1 text-xs text-gray-800 bg-transparent outline-none placeholder-gray-300 min-w-0"
                  />
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 2 — DAILY SUMMARIES
═══════════════════════════════════════════════════════════════════════════ */
export function DailySummaryTab({ projects, meetings, fullPage = false }) {
  const todayKey = new Date().toISOString().split('T')[0]

  const loadSummaries = () => { try { return JSON.parse(localStorage.getItem('mb_day_summaries') || '{}') } catch { return {} } }

  const [summaries,  setSummaries]  = useState(loadSummaries)
  const [generating, setGenerating] = useState(null) // dateKey

  const saveSummary = (dk, data) => {
    setSummaries(prev => {
      const next = { ...prev, [dk]: data }
      localStorage.setItem('mb_day_summaries', JSON.stringify(next))
      return next
    })
  }

  const meetingsForDay = (dk) => meetings.filter(m => m.dateKey === dk)
  const validMtgs      = (dk) => meetingsForDay(dk).filter(m => m.summary && !m.summary._generating && m.summary.objective)

  /* Days that have meetings (+ today always) */
  const meetingDays = [...new Set(meetings.map(m => m.dateKey))]
  const allDays     = [...new Set([todayKey, ...meetingDays])].sort((a, b) => b.localeCompare(a))

  /* Stale check — new meetings added since last generation */
  const isStale = (dk) => {
    const stored = summaries[dk]
    if (!stored) return false
    const currentIds = validMtgs(dk).map(m => m.id)
    const storedIds  = stored.meetingIds || []
    return currentIds.length !== storedIds.length || !currentIds.every(id => storedIds.includes(id))
  }

  /* ── AI-powered generation ── */
  const generate = async (dk) => {
    const valid = validMtgs(dk)
    if (!valid.length) return
    setGenerating(dk)

    const apiKey     = import.meta.env.VITE_GROQ_API_KEY
    const projNameMap = Object.fromEntries(projects.map(p => [p.id, p.name]))

    /* Group meetings by project */
    const projMap = {}
    valid.forEach(m => {
      const pName = projNameMap[m.projectId] || 'Unknown Project'
      if (!projMap[m.projectId]) projMap[m.projectId] = { name: pName, meetings: [] }
      projMap[m.projectId].meetings.push(m)
    })

    /* Todos per project for this day */
    const projTodos = {}
    projects.forEach(proj => {
      try {
        const stored = JSON.parse(localStorage.getItem(`todos_${proj.id}`) || '{}')
        projTodos[proj.id] = stored[dk] || []
      } catch { projTodos[proj.id] = [] }
    })

    /* Generate bullet-point summary per project */
    const projectSummaries = []

    for (const [projId, projData] of Object.entries(projMap)) {
      const todos    = projTodos[projId] || []
      const doneTasks   = todos.filter(t => t.done)
      const pendingTasks = todos.filter(t => !t.done)

      /* Build context string */
      let context = `Project: ${projData.name}\n`
      projData.meetings.forEach(m => {
        context += `\nMeeting: "${m.title}"\n`
        if (m.summary.objective)               context += `Objective: ${m.summary.objective}\n`
        if (m.summary.topicsDiscussed?.length)  context += `Topics discussed: ${m.summary.topicsDiscussed.join(', ')}\n`
        if (m.summary.keyInsights?.length)      context += `Key insights: ${m.summary.keyInsights.join('; ')}\n`
        if (m.summary.decisionsMade?.length)    context += `Decisions made: ${m.summary.decisionsMade.filter(d => d !== 'No final decisions were made.').join('; ')}\n`
        if (m.summary.actionItems?.length)      context += `Action items: ${m.summary.actionItems.map(a => a.task).join(', ')}\n`
      })
      if (doneTasks.length)   context += `\nCompleted tasks: ${doneTasks.map(t => t.text).join(', ')}\n`
      if (pendingTasks.length) context += `Pending tasks: ${pendingTasks.map(t => t.text).join(', ')}\n`

      let bullets = []

      if (apiKey && apiKey !== 'your_groq_api_key_here') {
        try {
          const prompt = `You are a professional work-log writer. Based on the project context below, write 3–5 concise bullet points summarizing what was accomplished, discussed, and decided today. Focus on outcomes and progress. Each bullet max 18 words. Professional third-person tone. No fluff.

${context}

Return ONLY a valid JSON array of strings. Example: ["Finalized API integration approach for v2 release.", "Decided to prioritize mobile UI before backend refactor."]`

          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
              model:       'llama-3.3-70b-versatile',
              messages:    [{ role: 'user', content: prompt }],
              temperature: 0.3,
              max_tokens:  512,
            }),
          })

          if (res.ok) {
            const data = await res.json()
            const text = data.choices?.[0]?.message?.content?.trim() ?? ''
            const match = text.match(/\[[\s\S]*\]/)
            if (match) bullets = JSON.parse(match[0])
          }
        } catch (e) {
          console.error('[DailySummary] Groq error:', e)
        }
      }

      /* Fallback bullets if API unavailable */
      if (!bullets.length) {
        const allTopics    = projData.meetings.flatMap(m => m.summary.topicsDiscussed || [])
        const allDecisions = projData.meetings.flatMap(m => (m.summary.decisionsMade || []).filter(d => d !== 'No final decisions were made.'))
        if (projData.meetings[0]?.summary.objective) bullets.push(projData.meetings[0].summary.objective)
        allTopics.slice(0, 2).forEach(t => bullets.push(t))
        allDecisions.slice(0, 1).forEach(d => bullets.push(d))
        if (doneTasks.length) bullets.push(`Completed ${doneTasks.length} task${doneTasks.length !== 1 ? 's' : ''}: ${doneTasks.slice(0, 2).map(t => t.text).join(', ')}`)
      }

      projectSummaries.push({
        projectId:    projId,
        name:         projData.name,
        meetingCount: projData.meetings.length,
        bullets,
        todosDone:    doneTasks.length,
        todosTotal:   todos.length,
      })
    }

    saveSummary(dk, {
      generatedAt: new Date().toISOString(),
      meetingIds:  valid.map(m => m.id),
      projects:    projectSummaries,
    })
    setGenerating(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {fullPage && (
        <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7133AE12' }}>
            <BookOpen size={16} style={{ color: '#7133AE' }} />
          </div>
          <div>
            <h1 className="text-gray-900 font-semibold text-base leading-tight">Daily Work Summary</h1>
            <p className="text-xs text-gray-400 leading-tight">AI-generated daily summaries of your work</p>
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-y-auto py-5 px-6 gap-8">
        {allDays.map(dk => {
          const dayMeetings  = meetingsForDay(dk)
          if (dk !== todayKey && !dayMeetings.length) return null

          const summary      = summaries[dk]
          const stale        = isStale(dk)
          const isGenerating = generating === dk
          const hasValid     = validMtgs(dk).length > 0

          return (
            <section key={dk}>
              {/* Day header */}
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays size={12} className="text-gray-400 flex-shrink-0" />
                <span className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">{fmtKey(dk)}</span>
                {summary && (
                  <>
                    <span className="flex-1" />
                    <span className="text-[11px] text-gray-400">
                      Updated {new Date(summary.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {dk === todayKey && (
                      <button
                        onClick={() => generate(dk)}
                        disabled={isGenerating}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer flex-shrink-0"
                        style={{ borderColor: '#7133AE40', color: '#7133AE', backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7133AE0A' }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        {isGenerating
                          ? <><div className="w-2.5 h-2.5 rounded-full border border-purple-300 border-t-purple-600 animate-spin" />Generating…</>
                          : <><RefreshCw size={11} strokeWidth={2.5} />Re-summarize Day</>
                        }
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* No meetings */}
              {!dayMeetings.length && (
                <p className="text-sm text-gray-300 px-1">No meetings recorded for this day.</p>
              )}

              {/* Has meetings — not yet summarised */}
              {dayMeetings.length > 0 && !summary && (
                <button
                  onClick={() => generate(dk)}
                  disabled={!hasValid || isGenerating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer border"
                  style={{
                    color: '#7133AE', borderColor: '#7133AE30', backgroundColor: '#7133AE06',
                    opacity: (!hasValid && !isGenerating) ? 0.5 : 1,
                  }}
                  title={!hasValid ? 'Generate AI meeting summaries first, then come back.' : undefined}
                >
                  {isGenerating
                    ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin" />Generating…</>
                    : <><Sparkles size={14} strokeWidth={2} />Summarize My Day</>
                  }
                </button>
              )}

              {/* Summary card */}
              {summary && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

                  {/* Per-project sections */}
                  {(summary.projects || []).length === 0 && (
                    <div className="px-5 py-4">
                      <p className="text-sm text-gray-300 italic">No summary content — click Re-summarize Day.</p>
                    </div>
                  )}
                  {(summary.projects || []).map((proj, pi) => (
                    <div key={proj.projectId ?? pi} className={`px-5 py-4 ${pi > 0 ? 'border-t border-gray-100' : ''}`}>

                      {/* Project heading */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: '#7133AE' }} />
                        <span className="text-sm font-semibold text-gray-800 flex-1">{proj.name}</span>
                      </div>

                      {/* AI bullet points */}
                      {(proj.bullets || []).length === 0
                        ? <p className="text-sm text-gray-300 italic">No summary content — click Re-summarize Day.</p>
                        : (
                          <ul className="flex flex-col gap-2">
                            {(proj.bullets || []).map((b, bi) => (
                              <li key={bi} className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 rounded-full mt-[7px] flex-shrink-0 bg-gray-300" />
                                <span className="text-sm text-gray-600 leading-relaxed">{b}</span>
                              </li>
                            ))}
                          </ul>
                        )
                      }
                    </div>
                  ))}

                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 3 — PROJECTS  (inline list only — accordion toggle lives in nav row)
═══════════════════════════════════════════════════════════════════════════ */
function ProjectsTab({ projects, activeProjectId, onNavigateToProject, onCreateProject, onRenameProject, onDeleteProject, createTick }) {
  const [hoveredId,    setHoveredId]    = useState(null)
  const [openMenuId,   setOpenMenuId]   = useState(null)
  const [menuAnchor,   setMenuAnchor]   = useState(null)
  const [renamingId,   setRenamingId]   = useState(null)
  const [renameValue,  setRenameValue]  = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [searchQuery,  setSearchQuery]  = useState('')
  const menuRef   = useRef(null)
  const renameRef = useRef(null)

  /* Close portal menu on outside click */
  useEffect(() => {
    if (!openMenuId) return
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) { setOpenMenuId(null); setMenuAnchor(null) } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [openMenuId])

  /* Focus rename input when opened */
  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.focus()
  }, [renamingId])

  /* Triggered by "+ New" button in the parent nav row */
  useEffect(() => {
    if (!createTick) return
    const id = onCreateProject?.()
    if (id != null) { setRenamingId(id); setRenameValue('New Project') }
  }, [createTick]) // eslint-disable-line

  const openMenu = (e, pid) => {
    e.stopPropagation()
    if (openMenuId === pid) { setOpenMenuId(null); setMenuAnchor(null) }
    else { setMenuAnchor(e.currentTarget.getBoundingClientRect()); setOpenMenuId(pid) }
  }

  const commitRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== projects.find(p => p.id === renamingId)?.name) onRenameProject?.(renamingId, trimmed)
    setRenamingId(null)
  }

  const activeMenu = openMenuId ? projects.find(p => p.id === openMenuId) : null
  const filtered   = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search — only when > 3 projects */}
      {projects.length > 3 && (
        <div className="px-3 pt-1 pb-2">
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects…"
              className="w-full pl-6 pr-2.5 py-1.5 text-xs rounded-lg bg-gray-50 border border-gray-100 text-gray-700 placeholder-gray-400 outline-none focus:border-purple-300 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Project list */}
      <div className="flex flex-col gap-0.5 px-3 pb-2 overflow-y-auto h-full">

        {filtered.map(project => {
          const isActive   = project.id === activeProjectId
          const isHovered  = hoveredId === project.id
          const isRenaming = renamingId === project.id
          const menuOpen   = openMenuId === project.id

          return (
            <div key={project.id} className="relative"
              onMouseEnter={() => setHoveredId(project.id)}
              onMouseLeave={() => setHoveredId(null)}>
              <button onClick={() => { if (!isRenaming) onNavigateToProject?.(project.id) }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left w-full transition-all duration-150 cursor-pointer"
                style={{ backgroundColor: isActive ? '#7133AE0F' : isHovered || menuOpen ? '#f9fafb' : 'transparent' }}>

                <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isActive ? '#7133AE1A' : '#f3f4f6' }}>
                  <Folder size={11} strokeWidth={2} style={{ color: isActive ? '#7133AE' : '#9ca3af' }} />
                </div>

                {isRenaming ? (
                  <input ref={renameRef} value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); e.stopPropagation() }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-xs font-medium bg-white border border-gray-300 rounded px-1 py-0.5 outline-none focus:border-purple-400 min-w-0"
                  />
                ) : (
                  <span className="text-xs font-medium flex-1 truncate"
                    style={{ color: isActive ? '#7133AE' : '#374151' }}>
                    {project.name}
                  </span>
                )}

                {!isRenaming && (isHovered || menuOpen) && (
                  <button onClick={(e) => openMenu(e, project.id)}
                    className="flex items-center justify-center w-4 h-4 rounded transition-colors cursor-pointer flex-shrink-0"
                    style={{ backgroundColor: menuOpen ? '#f3e8ff' : 'transparent', color: menuOpen ? '#7133AE' : 'rgba(107,114,128,0.7)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3e8ff'; e.currentTarget.style.color = '#7133AE' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = menuOpen ? '#f3e8ff' : 'transparent'; e.currentTarget.style.color = menuOpen ? '#7133AE' : 'rgba(107,114,128,0.7)' }}>
                    <MoreHorizontal size={11} />
                  </button>
                )}
              </button>
            </div>
          )
        })}

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 py-5 px-3 text-center">
            <Folder size={22} strokeWidth={1.5} className="text-gray-200" />
            <p className="text-[11px] text-gray-400 leading-snug">No projects yet.</p>
          </div>
        )}

        {searchQuery && filtered.length === 0 && (
          <p className="text-[11px] text-gray-400 text-center py-3 px-2">
            No match for "<span className="font-medium">{searchQuery}</span>"
          </p>
        )}
      </div>

      {/* Portal context menu */}
      {activeMenu && menuAnchor && (
        <ProjectMenu project={activeMenu} anchorRect={menuAnchor} menuRef={menuRef}
          onRename={(p) => { setOpenMenuId(null); setMenuAnchor(null); setRenamingId(p.id); setRenameValue(p.name) }}
          onDelete={(p) => setDeleteTarget(p)}
          onClose={() => { setOpenMenuId(null); setMenuAnchor(null) }}
        />
      )}

      {/* Delete confirm modal */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                  <Trash2 size={18} className="text-red-500" />
                </div>
                <h3 className="text-gray-900 font-semibold text-base">Delete project?</h3>
                <p className="text-sm text-gray-500 mt-1 leading-snug">
                  <span className="font-medium text-gray-700">"{deleteTarget.name}"</span> and all its meetings will be permanently deleted.
                </p>
              </div>
              <button onClick={() => setDeleteTarget(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0 ml-2">
                <X size={15} className="text-gray-400" />
              </button>
            </div>
            <div className="flex gap-2.5 px-6 pb-6">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer">Cancel</button>
              <button onClick={() => { onDeleteProject?.(deleteTarget.id); setDeleteTarget(null) }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer"
                style={{ backgroundColor: '#DC2626' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#B91C1C' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#DC2626' }}>Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIDEBAR — main export
═══════════════════════════════════════════════════════════════════════════ */
export default function Sidebar({
  projects = [],
  meetings = [],
  activeProjectId = null,
  activeSidebarTab = null,  // 'todos' | 'daily' | null
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
  const [createProjTick,    setCreateProjTick]    = useState(0)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const navBtn = (id, icon, label, onClick) => {
    const active = activeSidebarTab === id
    return (
      <button key={id} onClick={onClick}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer text-left w-full"
        style={{ backgroundColor: active ? '#7133AE0F' : 'transparent', color: active ? '#7133AE' : '#6b7280' }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = '#f9fafb' }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}>
        {icon}
        <span>{label}</span>
      </button>
    )
  }

  return (
    <>
    <aside className="flex flex-col h-screen w-[272px] flex-shrink-0 border-r border-gray-100 bg-white">

      {/* Logo */}
      <div className="flex items-center px-5 border-b border-gray-100 flex-shrink-0" style={{ height: 64 }}>
        <button onClick={onNavigateToDashboard}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7133AE' }}>
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

      {/* ── Nav + Projects (fills remaining height, profile is pinned) ────── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Top nav: Daily Summary only */}
        <nav className="flex flex-col gap-0.5 px-3 pt-3 pb-1 flex-shrink-0">
          {navBtn('daily',
            <BookOpen size={13} strokeWidth={activeSidebarTab === 'daily' ? 2.5 : 2} className="flex-shrink-0" />,
            'Daily Work Summary',
            () => onNavigateToDaily?.()
          )}
        </nav>

        {/* Divider */}
        <div className="mx-3 border-t border-gray-100 my-2 flex-shrink-0" />

        {/* Projects header: label + "Add new project" */}
        <div className="flex items-center justify-between px-3 mb-2 flex-shrink-0">
          <span className="text-[10px] font-bold tracking-widest text-gray-400">PROJECTS</span>
          <button onClick={() => setCreateProjTick(t => t + 1)}
            className="text-[11px] font-semibold cursor-pointer transition-colors hover:opacity-80"
            style={{ color: '#7133AE' }}>
            + Add new
          </button>
        </div>

        {/* Scrollable project list */}
        <div className="flex-1 overflow-hidden">
          <ProjectsTab
            projects={projects}
            activeProjectId={activeProjectId}
            onNavigateToProject={onNavigateToProject}
            onCreateProject={onCreateProject}
            onRenameProject={onRenameProject}
            onDeleteProject={onDeleteProject}
            createTick={createProjTick}
          />
        </div>
      </div>

      {/* User profile — always pinned to bottom */}
      <div className="border-t border-gray-100 px-3 py-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg group">
          {currentUser?.photoURL ? (
            <img src={currentUser.photoURL} alt={currentUser.displayName ?? 'User'}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold"
              style={{ backgroundColor: '#7133AE' }}>
              {currentUser?.displayName ? currentUser.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate leading-tight">{currentUser?.displayName ?? 'User'}</p>
            <p className="text-[10px] text-gray-400 truncate leading-tight">{currentUser?.email ?? ''}</p>
          </div>
          {onSignOut && (
            <button onClick={() => setShowLogoutConfirm(true)} title="Sign out"
              className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </div>

    </aside>

    {/* ── Logout confirmation modal ─────────────────────────────────────── */}
    {showLogoutConfirm && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        onClick={() => setShowLogoutConfirm(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4">
            <div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: '#7133AE12' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7133AE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <h3 className="text-gray-900 font-semibold text-base">Sign out?</h3>
              <p className="text-sm text-gray-500 mt-1 leading-snug">
                Your work is saved automatically. You can safely sign out without losing anything.
              </p>
            </div>
            <button onClick={() => setShowLogoutConfirm(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0 ml-2">
              <X size={15} className="text-gray-400" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 px-6 pb-6">
            <button onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer">
              Cancel
            </button>
            <button
              onClick={() => { setShowLogoutConfirm(false); onSignOut?.() }}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer"
              style={{ backgroundColor: '#7133AE' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#5f2a94' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7133AE' }}>
              Sign out
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  )
}
