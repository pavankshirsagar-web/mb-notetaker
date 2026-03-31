import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft, Mic, Monitor, Layers, ChevronDown,
  CheckCircle2, AlertCircle, Loader2, Globe, Folder
} from 'lucide-react'

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const MICROPHONES = [
  { id: 'default', label: 'Default – MacBook Pro Microphone' },
  { id: 'external', label: 'External USB Microphone' },
  { id: 'airpods', label: 'AirPods Pro Microphone' },
]

const AUDIO_SOURCES = [
  {
    id: 'mic',
    icon: Mic,
    label: 'Microphone Only',
    desc: 'Captures your voice only',
  },
  {
    id: 'system',
    icon: Monitor,
    label: 'System Audio Only',
    desc: 'Captures device audio only',
  },
  {
    id: 'both',
    icon: Layers,
    label: 'Mic + System Audio',
    desc: 'Captures both simultaneously',
  },
]

const LANGUAGES = [
  { code: 'EN', label: 'English' },
  { code: 'HI', label: 'Hindi' },
  { code: 'MR', label: 'Marathi' },
  { code: 'HG', label: 'Hinglish' },
]

/* mic-level bar heights / delays */
const BAR_HEIGHTS = [18, 28, 14, 34, 22, 40, 18, 30, 12, 26, 36, 20, 32, 16, 28, 38, 14, 24, 34, 20]
const BAR_DELAYS  = [0, .08, .16, .06, .22, .12, .30, .04, .18, .26, .10, .20, .28, .02, .14, .24, .08, .18, .06, .22]

/* ─────────────────────────────────────────────
   MIC LEVEL VISUALISER
───────────────────────────────────────────── */
function MicLevelBars({ status }) {
  const active  = status === 'testing' || status === 'working'
  const success = status === 'working'
  return (
    <div className="flex items-end gap-[3px] h-10">
      {BAR_HEIGHTS.map((h, i) => (
        <span
          key={i}
          className={`mic-bar${active ? (success ? ' success' : '') : ' idle'}`}
          style={{
            height: h,
            animationDelay: active ? `${BAR_DELAYS[i]}s` : '0s',
            animationDuration: success ? '0.6s' : '0.85s',
          }}
        />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   RECORDING SETUP PAGE
───────────────────────────────────────────── */
export default function RecordingSetup({ project, onStart, onBack }) {
  const [mic,        setMic]        = useState(MICROPHONES[0].id)
  const [micOpen,    setMicOpen]    = useState(false)
  const [source,     setSource]     = useState('both')
  const [testStatus, setTestStatus] = useState('idle') // idle | testing | working | no-input
  const dropdownRef  = useRef(null)
  const testTimer    = useRef(null)

  /* close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMicOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedMic = MICROPHONES.find(m => m.id === mic)

  const handleTest = () => {
    if (testStatus === 'testing') return
    setTestStatus('testing')
    clearTimeout(testTimer.current)
    // simulate: after 2s → 80% chance "working", 20% "no-input"
    testTimer.current = setTimeout(() => {
      setTestStatus(Math.random() > 0.2 ? 'working' : 'no-input')
    }, 2000)
  }

  useEffect(() => () => clearTimeout(testTimer.current), [])

  const statusConfig = {
    idle:     { icon: null,          color: 'text-gray-400', bg: '',                    text: 'Click "Test" to check your microphone' },
    testing:  { icon: Loader2,       color: 'text-blue-500', bg: 'bg-blue-50',          text: 'Testing microphone…' },
    working:  { icon: CheckCircle2,  color: 'text-green-600', bg: 'bg-green-50',        text: 'Microphone working' },
    'no-input': { icon: AlertCircle, color: 'text-red-500',  bg: 'bg-red-50',           text: 'No input detected — check your mic' },
  }
  const st = statusConfig[testStatus]
  const StatusIcon = st.icon

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* ── Page header ── */}
        <div className="flex items-center gap-4 mb-8 setup-section" style={{ animationDelay: '0s' }}>
          <button
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer text-gray-500 hover:text-gray-800 shadow-sm flex-shrink-0"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="flex-1">
            <h1 className="text-gray-900 font-semibold text-xl tracking-tight">Recording Setup</h1>
            <p className="text-gray-400 text-sm mt-0.5">Configure your audio settings before starting</p>
          </div>
          {/* Project chip */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0"
            style={{ backgroundColor: project.color + '14', color: project.color }}
          >
            <Folder size={12} strokeWidth={2.5} />
            {project.name}
          </div>
        </div>

        {/* ── Section 1: Microphone Selection ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 setup-section" style={{ animationDelay: '0.06s' }}>
          <div className="px-6 pt-5 pb-2">
            <div className="flex items-center gap-2 mb-1">
              <Mic size={15} strokeWidth={2.5} style={{ color: '#7133AE' }} />
              <span className="text-gray-800 font-semibold text-sm">Microphone</span>
            </div>
            <p className="text-gray-400 text-xs mb-4">Select the microphone to use for this recording</p>

            {/* Custom dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setMicOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border bg-gray-50 text-sm font-medium text-gray-800 hover:border-gray-300 transition-colors cursor-pointer"
                style={{ borderColor: micOpen ? '#7133AE' : '#e5e7eb', boxShadow: micOpen ? '0 0 0 3px #7133AE1A' : 'none' }}
              >
                <span className="truncate">{selectedMic?.label}</span>
                <ChevronDown
                  size={16}
                  className="text-gray-400 flex-shrink-0 transition-transform duration-200"
                  style={{ transform: micOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              {micOpen && (
                <div className="absolute z-20 top-full mt-1.5 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {MICROPHONES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setMic(m.id); setMicOpen(false); setTestStatus('idle') }}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <span className={`font-medium ${m.id === mic ? '' : 'text-gray-700'}`} style={{ color: m.id === mic ? '#7133AE' : undefined }}>
                        {m.label}
                      </span>
                      {m.id === mic && (
                        <CheckCircle2 size={15} style={{ color: '#7133AE' }} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mic test sub-section */}
          <div className="px-6 pb-5 pt-4 border-t border-gray-50 mt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-700 text-sm font-medium">Microphone Test</span>
              <button
                onClick={handleTest}
                disabled={testStatus === 'testing'}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#7133AE14', color: '#7133AE' }}
                onMouseEnter={(e) => { if (testStatus !== 'testing') e.currentTarget.style.backgroundColor = '#7133AE22' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7133AE14' }}
              >
                {testStatus === 'testing'
                  ? <><Loader2 size={12} className="animate-spin" /> Testing…</>
                  : <><Mic size={12} /> Test Microphone</>
                }
              </button>
            </div>

            {/* Level visualiser */}
            <div className="flex items-end gap-3 mb-3">
              <MicLevelBars status={testStatus} />
              <span className="text-xs text-gray-400 pb-0.5">Input level</span>
            </div>

            {/* Status indicator */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${st.bg || 'bg-gray-50'}`}>
              {StatusIcon && (
                <StatusIcon
                  size={14}
                  className={`flex-shrink-0 ${st.color} ${testStatus === 'testing' ? 'animate-spin' : ''}`}
                />
              )}
              {!StatusIcon && <span className="w-3.5 h-3.5 rounded-full bg-gray-200 flex-shrink-0" />}
              <span className={`text-xs font-medium ${st.color}`}>{st.text}</span>
            </div>
          </div>
        </div>

        {/* ── Section 2: Audio Source ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 mb-4 setup-section" style={{ animationDelay: '0.12s' }}>
          <div className="flex items-center gap-2 mb-1">
            <Layers size={15} strokeWidth={2.5} style={{ color: '#7133AE' }} />
            <span className="text-gray-800 font-semibold text-sm">Audio Source</span>
          </div>
          <p className="text-gray-400 text-xs mb-4">Choose what audio to capture during the meeting</p>

          <div className="grid grid-cols-3 gap-3">
            {AUDIO_SOURCES.map((s) => {
              const isSelected = source === s.id
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  onClick={() => setSource(s.id)}
                  className="flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border-2 text-center transition-all duration-150 cursor-pointer"
                  style={{
                    borderColor: isSelected ? '#7133AE' : '#e5e7eb',
                    backgroundColor: isSelected ? '#7133AE08' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f9fafb' }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: isSelected ? '#7133AE18' : '#f3f4f6' }}
                  >
                    <Icon size={17} strokeWidth={2} style={{ color: isSelected ? '#7133AE' : '#6b7280' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold leading-tight" style={{ color: isSelected ? '#7133AE' : '#374151' }}>
                      {s.label}
                    </p>
                    <p className="text-xs text-gray-400 leading-tight mt-0.5">{s.desc}</p>
                  </div>
                  {isSelected && (
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#7133AE' }}
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4.5L3 6L6.5 2.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Section 3: Language Detection ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 mb-8 setup-section" style={{ animationDelay: '0.18s' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Globe size={15} strokeWidth={2.5} style={{ color: '#7133AE' }} />
              <span className="text-gray-800 font-semibold text-sm">Language Detection</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-100">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
              <span className="text-green-700 text-xs font-semibold">Automatic</span>
            </div>
          </div>
          <p className="text-gray-400 text-xs mb-4">Language is detected automatically during recording. No manual selection needed.</p>

          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <div
                key={lang.code}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100"
              >
                <span className="text-xs font-bold text-gray-500">{lang.code}</span>
                <span className="text-xs text-gray-400">{lang.label}</span>
              </div>
            ))}
          </div>

          <p className="text-gray-300 text-xs mt-3 flex items-center gap-1">
            <Globe size={11} />
            Detected language will be shown during transcription
          </p>
        </div>

        {/* ── Start Recording CTA ── */}
        <div className="flex justify-end setup-section" style={{ animationDelay: '0.22s' }}>
          <button
            onClick={onStart}
            className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-white text-sm font-semibold shadow-lg transition-all duration-150 cursor-pointer select-none"
            style={{ backgroundColor: '#7133AE', boxShadow: '0 8px 24px rgba(113,51,174,0.35)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#5f2a94'
              e.currentTarget.style.transform = 'scale(1.02)'
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(113,51,174,0.45)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#7133AE'
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(113,51,174,0.35)'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.97)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(113,51,174,0.25)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(113,51,174,0.35)'
            }}
          >
            <Mic size={16} />
            Start Recording
          </button>
        </div>

      </div>
    </div>
  )
}
