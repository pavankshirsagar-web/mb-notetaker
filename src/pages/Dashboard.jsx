import { useEffect, useRef, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { Folder, X, Mic, Pause, Play, Square, Search, RefreshCw, ShieldCheck, MonitorSpeaker, ChevronDown, Check } from 'lucide-react'

/* ── Short display name for a mic device ─────────────────────────────────── */
function micShortLabel(device) {
  if (!device) return 'Microphone'
  const l = device.label || 'Microphone'
  // Strip parenthetical driver info: "Microphone (Realtek Audio)" → "Microphone"
  const stripped = l.replace(/\s*\([^)]*\)\s*$/, '').trim()
  // Truncate long names
  return stripped.length > 22 ? stripped.slice(0, 20) + '…' : stripped || 'Microphone'
}

/* ── Mic change dropdown ─────────────────────────────────────────────────── */
function MicSelector({ devices = [], selectedId, onChange, onRefresh }) {
  const [open,        setOpen]        = useState(false)
  const [refreshing,  setRefreshing]  = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = devices.find(d => d.deviceId === selectedId) ?? devices[0]
  // Filter out "Communications" duplicate, keep unique labels
  const visible = devices.filter(d => d.deviceId !== 'communications')

  const handleRefresh = async (e) => {
    e.stopPropagation()
    setRefreshing(true)
    await onRefresh?.()
    setTimeout(() => setRefreshing(false), 600)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
        style={{
          backgroundColor: open ? '#7133AE10' : '#f9fafb',
          borderColor: open ? '#7133AE50' : '#e5e7eb',
          color: open ? '#7133AE' : '#6b7280',
          cursor: 'pointer',
        }}
        title="Change microphone"
      >
        <Mic size={11} />
        <span>{visible.length ? micShortLabel(selected) : 'Microphone'}</span>
        <ChevronDown size={11} className="transition-transform duration-150" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[240px]"
          style={{ maxHeight: 280, overflowY: 'auto' }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Select Microphone</p>
            <button
              onClick={handleRefresh}
              title="Refresh device list — plug in your headphone then click here"
              className="p-1 rounded-md transition-colors"
              style={{ cursor: 'pointer', color: refreshing ? '#7133AE' : '#9ca3af' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Device list */}
          {visible.length === 0 ? (
            <p className="px-3 py-3 text-xs text-gray-400 text-center">
              No microphones found.<br />
              <span className="text-gray-500">Plug in your headphone, then click ↻</span>
            </p>
          ) : (
            visible.map(d => {
              const isSel = d.deviceId === (selectedId ?? devices[0]?.deviceId)
              return (
                <button
                  key={d.deviceId}
                  onClick={() => { onChange(d.deviceId); setOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors"
                  style={{
                    backgroundColor: isSel ? '#7133AE08' : 'transparent',
                    color: isSel ? '#7133AE' : '#374151',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.backgroundColor = '#f9fafb' }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: isSel ? '#7133AE15' : '#f3f4f6' }}>
                    <Mic size={11} style={{ color: isSel ? '#7133AE' : '#9ca3af' }} />
                  </div>
                  <span className="flex-1 font-medium leading-snug" style={{ fontSize: 12 }}>
                    {d.label || `Microphone ${visible.indexOf(d) + 1}`}
                  </span>
                  {isSel && <Check size={13} style={{ color: '#7133AE', flexShrink: 0 }} />}
                </button>
              )
            })
          )}

          {/* Hint footer */}
          <div className="px-3 py-2 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Don't see your headphone? Plug it in, then click ↻ to refresh.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function fmt(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

/* ─────────────────────────────────────────────
   ANIMATED WAVEFORM
───────────────────────────────────────────── */
/* Maps a raw analyser value (0-255) to a pixel height in the waveform container.
   Container is h-16 (64px); we clamp between 4 px (silence) and 56 px (peak). */
const toBarHeight = (v) => Math.max(4, Math.round(4 + (v / 255) * 52))

function AnimatedWaveform({ isPaused, waveHeights }) {
  /* Fallback: if no real data yet show a flat baseline of 4 px bars */
  const heights = waveHeights ?? Array(20).fill(0)
  return (
    <div className="flex items-end justify-center gap-[5px] h-16">
      {heights.map((v, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: 4,
            borderRadius: 3,
            height: toBarHeight(v),
            background: isPaused ? 'rgba(113,51,174,0.35)' : 'rgba(113,51,174,0.75)',
            transition: 'height 80ms ease-out, background 300ms',
            opacity: 0.6 + (i % 4) * 0.1,
          }}
        />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   IDLE ILLUSTRATION
───────────────────────────────────────────── */
const IdleIllustration = () => (
  <svg viewBox="0 0 280 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-64 h-auto">
    <circle cx="140" cy="118" r="100" fill="#7133AE" fillOpacity="0.05" />
    <circle cx="140" cy="118" r="76"  fill="#7133AE" fillOpacity="0.08" />
    <circle cx="140" cy="118" r="54"  fill="#7133AE" fillOpacity="0.12" />
    <circle cx="140" cy="118" r="36"  fill="#7133AE" fillOpacity="0.15" stroke="#7133AE" strokeOpacity="0.3" strokeWidth="1.5" />
    <rect x="128" y="96"  width="24" height="34" rx="12" fill="#7133AE" fillOpacity="0.9" />
    <path d="M120 124c0 11.046 8.954 20 20 20s20-8.954 20-20" stroke="#7133AE" strokeOpacity="0.85" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="139" y="144" width="2"  height="10"  rx="1"    fill="#7133AE" fillOpacity="0.85" />
    <rect x="130" y="154" width="20" height="2.5" rx="1.25" fill="#7133AE" fillOpacity="0.85" />
    <rect x="132" y="105" width="16" height="1.5" rx="0.75" fill="white" fillOpacity="0.5" />
    <rect x="132" y="111" width="16" height="1.5" rx="0.75" fill="white" fillOpacity="0.4" />
    <rect x="132" y="117" width="16" height="1.5" rx="0.75" fill="white" fillOpacity="0.3" />
    <path d="M108 106 Q102 118 108 130" stroke="#7133AE" strokeOpacity="0.4"  strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M98 99 Q88 118 98 137"    stroke="#7133AE" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M172 106 Q178 118 172 130" stroke="#7133AE" strokeOpacity="0.4"  strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M182 99 Q192 118 182 137"  stroke="#7133AE" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
)

/* ─────────────────────────────────────────────
   PROJECT SELECTION MODAL
───────────────────────────────────────────── */
function ProjectModal({ projects, onStart, onClose }) {
  const [selected, setSelected] = useState(null)
  const [search,   setSearch]   = useState('')

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(15,10,25,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-gray-900 text-lg font-semibold tracking-tight">Save recording to…</h2>
            <p className="text-gray-400 text-sm mt-0.5">Choose a project for this meeting</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-gray-400 hover:text-gray-600 mt-0.5">
            <X size={18} />
          </button>
        </div>

        <div className="h-px bg-gray-100" />

        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 outline-none transition-all duration-150"
              onFocus={(e) => { e.target.style.borderColor = '#7133AE'; e.target.style.boxShadow = '0 0 0 3px #7133AE14' }}
              onBlur={(e)  => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }}
            />
          </div>
        </div>

        <div className="px-4 pb-4 flex flex-col gap-1 max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">No projects match your search</div>
          ) : (
            filtered.map((p) => {
              const isSel = selected?.id === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full transition-all duration-150 cursor-pointer"
                  style={{
                    backgroundColor: isSel ? '#7133AE12' : 'transparent',
                    border: `1.5px solid ${isSel ? '#7133AE40' : 'transparent'}`,
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.backgroundColor = '#f9fafb' }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100">
                    <Folder size={13} strokeWidth={2} className="text-gray-400" />
                  </div>
                  <span className="text-sm font-medium flex-1" style={{ color: isSel ? '#7133AE' : '#374151' }}>
                    {p.name}
                  </span>
                  {isSel && (
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7133AE' }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4.5L3 6L6.5 2.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onStart(selected)}
            disabled={!selected}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#7133AE' }}
            onMouseEnter={(e) => { if (selected) e.currentTarget.style.backgroundColor = '#5f2a94' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7133AE' }}
          >
            <Mic size={15} />
            Start Recording
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   RECOVERY MODAL
───────────────────────────────────────────── */
function RecoveryModal({ data, onResume, onDiscard, onSaveAndStart }) {
  const savedTime = data?.savedAt
    ? new Date(data.savedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(15,10,25,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 pt-5 pb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7133AE14' }}>
              <RefreshCw size={17} style={{ color: '#7133AE' }} />
            </div>
            <div>
              <h2 className="text-gray-900 font-semibold text-base leading-snug">Interrupted Recording Found</h2>
              <p className="text-gray-400 text-sm mt-0.5">Your last session was not saved properly.</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 mb-5">
            <div className="flex items-center gap-2 mb-1.5">
              <Folder size={13} strokeWidth={2} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-800">{data?.project?.name ?? 'Unknown project'}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>Autosaved at {savedTime}</span>
              <span>·</span>
              <span>{fmt(data?.seconds ?? 0)} recorded</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={onResume}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 cursor-pointer"
              style={{ backgroundColor: '#7133AE' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#5f2a94' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7133AE' }}
            >
              <RefreshCw size={14} />
              Resume Recording
            </button>
            <button
              onClick={onSaveAndStart}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all duration-150 cursor-pointer"
            >
              Save & Start New
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   DASHBOARD
   Recording state lives in App — received as props.
   Navigation away is unrestricted; the floating
   widget (rendered by App) keeps the session alive.
───────────────────────────────────────────── */
const DEEPGRAM_KEY_SET =
  import.meta.env.VITE_DEEPGRAM_API_KEY &&
  import.meta.env.VITE_DEEPGRAM_API_KEY !== 'your_deepgram_api_key_here'

export default function Dashboard({
  projects       = [],
  isRecording    = false,
  isPaused       = false,
  recSeconds     = 0,
  recProject     = null,
  recLines       = [],
  interimText    = '',
  savedFlash     = false,
  recoveryData   = null,
  onStartRecording,
  onPause,
  onResume,
  onEnd,
  onRecoveryResume,
  onRecoveryDiscard,
  onRecoverySaveAndStart,
  systemAudioOn    = false,
  sysAudioLoading  = false,
  sysAudioError    = '',
  onClearSysAudioError,
  onStopSystemAudio,
  onEnableSystemAudio,
  micDevices      = [],
  selectedMicId   = null,
  onChangeMic,
  onRefreshMicDevices,
  onNavigateToProject,
  onNavigateToDashboard,
  onNavigateToTodos,
  onNavigateToDaily,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  currentUser = null,
  onSignOut,
  waveHeights = null,
}) {
  const [showModal,    setShowModal]    = useState(false)
  const [isCtaPressed, setIsCtaPressed] = useState(false)
  const transcriptRef = useRef(null)

  /* ── Auto-scroll transcript ── */
  useEffect(() => {
    if (transcriptRef.current)
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
  }, [recLines, interimText])

  /* ─────────────────────────────────────────────
     RENDER — IDLE
  ───────────────────────────────────────────── */
  if (!isRecording) return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        projects={projects}
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

      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
        <IdleIllustration />

        <div className="text-center ">
          <p className="text-gray-800 font-semibold text-lg leading-snug mb-1 whitespace-nowrap">
            Stay focused. Let every meeting turn into clear notes.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed max-w-md" >
            Record your meetings and let AI capture transcripts, summaries, and action items automatically.
          </p>
        </div>

        <button
          onMouseDown={() => setIsCtaPressed(true)}
          onMouseUp={() => setIsCtaPressed(false)}
          onMouseLeave={() => { setIsCtaPressed(false) }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-white text-sm font-semibold transition-all duration-150 cursor-pointer select-none"
          style={{
            backgroundColor: '#7133AE',
            transform:  isCtaPressed ? 'scale(0.96)' : 'scale(1)',
            boxShadow:  isCtaPressed ? '0 2px 8px rgba(113,51,174,0.25)' : '0 8px 24px rgba(113,51,174,0.35)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#5f2a94'
            e.currentTarget.style.transform = 'scale(1.03)'
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(113,51,174,0.45)'
          }}
        >
          <Mic size={17} />
          Start Recording
        </button>
      </main>

      {showModal && (
        <ProjectModal
          projects={projects}
          onStart={(p) => { onStartRecording(p); setShowModal(false) }}
          onClose={() => setShowModal(false)}
        />
      )}

      {recoveryData && (
        <RecoveryModal
          data={recoveryData}
          onResume={onRecoveryResume}
          onDiscard={onRecoveryDiscard}
          onSaveAndStart={onRecoverySaveAndStart}
        />
      )}
    </div>
  )

  /* ─────────────────────────────────────────────
     RENDER — RECORDING
     Navigation is unrestricted here — leaving
     will cause App to show the float widget.
  ───────────────────────────────────────────── */
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        projects={projects}
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

        {/* ROW 1 — Live Transcription */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white mx-6 mt-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-gray-900 font-semibold text-base">Live Transcription</span>
              {DEEPGRAM_KEY_SET ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#7133AE12', color: '#7133AE' }}>
                  nova-2 · EN / HI / MR
                </span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                  Web Speech (fallback)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* ── Mic selector — always shown so user can refresh/select even if list seems empty ── */}
              <MicSelector
                devices={micDevices}
                selectedId={selectedMicId}
                onChange={onChangeMic}
                onRefresh={onRefreshMicDevices}
              />

              {/* ── System Audio toggle ── */}
              <div className="relative">
                <button
                  onClick={systemAudioOn ? onStopSystemAudio : onEnableSystemAudio}
                  disabled={sysAudioLoading}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                  style={{
                    backgroundColor: systemAudioOn  ? '#05966910'
                                   : sysAudioLoading ? '#fef9c310'
                                   : '#f9fafb',
                    borderColor:     systemAudioOn  ? '#05966940'
                                   : sysAudioLoading ? '#fbbf2440'
                                   : '#e5e7eb',
                    color:           systemAudioOn  ? '#059669'
                                   : sysAudioLoading ? '#d97706'
                                   : '#6b7280',
                    cursor: sysAudioLoading ? 'wait' : 'pointer',
                  }}
                  title={
                    sysAudioLoading ? 'Connecting to meeting audio…'
                    : systemAudioOn ? 'Meeting audio ON — click to turn off'
                    : 'Click to capture Google Meet / Zoom audio'
                  }
                >
                  {sysAudioLoading ? (
                    /* spinner */
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                  ) : (
                    <MonitorSpeaker size={12} />
                  )}
                  <span>
                    {sysAudioLoading ? 'Connecting…' : 'System Audio'}
                  </span>
                  {/* pill toggle — hidden while loading */}
                  {!sysAudioLoading && (
                    <div
                      className="relative w-8 h-4 rounded-full transition-colors duration-200 flex-shrink-0"
                      style={{ backgroundColor: systemAudioOn ? '#059669' : '#d1d5db' }}
                    >
                      <div
                        className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200"
                        style={{ left: systemAudioOn ? '17px' : '2px' }}
                      />
                    </div>
                  )}
                </button>

                {/* Error tooltip — shown below toggle */}
                {sysAudioError && (
                  <div className="absolute top-8 right-0 z-50 w-72 bg-white rounded-xl shadow-lg border border-red-100 p-3 text-xs">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="font-semibold text-red-600">⚠️ Could not capture audio</p>
                      <button onClick={onClearSysAudioError} className="text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0">✕</button>
                    </div>
                    <p className="text-gray-500 leading-relaxed mb-2">{sysAudioError}</p>
                    <div className="bg-gray-50 rounded-lg p-2 space-y-1 text-gray-500">
                      <p className="font-medium text-gray-600">In the sharing dialog:</p>
                      <p>1. Select <strong>Entire Screen</strong> (first tab)</p>
                      <p>2. Make sure <strong>"Also share system audio" ✅</strong> is checked</p>
                      <p>3. Click <strong>Share</strong></p>
                      <p className="text-gray-400 pt-0.5"><em>Zoom desktop?</em> Use <strong>Window</strong> tab → select Zoom window.</p>
                    </div>
                  </div>
                )}
              </div>

              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300"
                style={{
                  backgroundColor: savedFlash ? '#05966914' : '#f3f4f6',
                  color:           savedFlash ? '#059669'   : '#9ca3af',
                }}
              >
                <ShieldCheck size={11} />
                {savedFlash ? 'Autosaved' : 'Autosave ON'}
              </div>

              {recProject && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                  <Folder size={12} strokeWidth={2} />
                  {recProject.name}
                </div>
              )}
            </div>
          </div>

          <div ref={transcriptRef} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
            {recLines.length === 0 && !interimText ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                <p className="text-gray-400 text-sm">
                  {systemAudioOn ? 'Listening to you + meeting audio…' : 'Listening for speech…'}
                </p>
                <p className="text-xs flex items-center gap-1.5" style={{ color: systemAudioOn ? '#059669' : '#9ca3af' }}>
                  <MonitorSpeaker size={11} />
                  {systemAudioOn
                    ? 'System audio ON — other speakers will be transcribed'
                    : 'System audio OFF — toggle above to capture other speakers'}
                </p>
                <div className="flex gap-1 mt-1">
                  {[0, 0.2, 0.4].map((d, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300"
                      style={{ animation: `pulseDot 1.2s ${d}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {recLines.map((line) => (
                  <div key={line.id} className="transcript-line flex gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold mt-0.5"
                      style={{ backgroundColor: line.color }}
                    >
                      {line.initials}
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-gray-400 block mb-1">{line.speaker}</span>
                      <p className="text-gray-800 text-sm leading-relaxed">{line.text}</p>
                    </div>
                  </div>
                ))}

                {/* Live interim line — shown while user is speaking */}
                {interimText && !isPaused && (
                  <div className="transcript-line flex gap-3 opacity-60">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold mt-0.5"
                      style={{ backgroundColor: '#7133AE' }}
                    >
                      PK
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-gray-400 block mb-1">You</span>
                      <p className="text-gray-700 text-sm leading-relaxed italic">
                        {interimText}
                        <span className="cursor-blink ml-1 not-italic" />
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* API key banner — shown once when Deepgram key is missing */}
        {!DEEPGRAM_KEY_SET && (
          <div className="flex-shrink-0 mx-6 mb-0 mt-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M8 6V9" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="8" cy="11" r="0.75" fill="#D97706"/>
              </svg>
              <p className="text-xs text-amber-700 flex-1 leading-snug">
                <span className="font-semibold">Using Web Speech API (fallback).</span> For better multilingual accuracy, add your free{' '}
                <a href="https://console.deepgram.com" target="_blank" rel="noreferrer" className="underline font-medium">Deepgram API key</a>{' '}
                to <code className="font-mono bg-amber-100 px-1 rounded">VITE_DEEPGRAM_API_KEY</code> in <code className="font-mono bg-amber-100 px-1 rounded">.env</code>
              </p>
            </div>
          </div>
        )}

        {/* ROW 2 — Waveform + Controls */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center gap-4 py-6 px-6">
          <AnimatedWaveform isPaused={isPaused} waveHeights={waveHeights} />

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 pulse-dot" />
            <span className="text-gray-700 font-semibold text-2xl tabular-nums tracking-widest">
              {fmt(recSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={isPaused ? onResume : onPause}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 cursor-pointer shadow-sm"
            >
              {isPaused
                ? <><Play  size={15} strokeWidth={2} className="text-gray-600" />Resume</>
                : <><Pause size={15} strokeWidth={2} className="text-gray-600" />Pause</>
              }
            </button>

            <button
              onClick={onEnd}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-150 cursor-pointer shadow-md"
              style={{ backgroundColor: '#DC2626' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#b91c1c' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#DC2626' }}
            >
              <Square size={14} strokeWidth={2} fill="white" />
              End Recording
            </button>
          </div>
        </div>

      </main>
    </div>
  )
}
