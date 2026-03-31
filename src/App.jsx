import { useState, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { DeepgramClient } from '@deepgram/sdk'
import LoginPage    from './pages/LoginPage'
import Dashboard    from './pages/Dashboard'
import ProjectPage  from './pages/ProjectPage'
import MeetingDetail from './pages/MeetingDetail'

/* ─── Constants ─── */
const AUTOSAVE_KEY = 'mb_notetaker_autosave'

const INITIAL_PROJECTS = [
  { id: 1, name: 'Design System Q2', color: '#7133AE' },
  { id: 2, name: 'Product Roadmap',  color: '#2563EB' },
  { id: 3, name: 'User Research',    color: '#059669' },
  { id: 4, name: 'Engineering Sync', color: '#D97706' },
]

/* Speaker roster for simple gap-based diarization */
const SPEECH_SPEAKERS = [
  { id: 'You',       initials: 'PK', color: '#7133AE' },
  { id: 'Speaker 1', initials: 'S1', color: '#6366F1' },
  { id: 'Speaker 2', initials: 'S2', color: '#0891B2' },
]

/* ─── Helpers ─── */
function fmt(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}
function nowDateKey()   { return new Date().toISOString().split('T')[0] }
function nowTimeLabel() { return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) }
function nowDateLabel() { return new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) }

function generateTitle(projectName, lines) {
  if (!lines?.length) return `${projectName} – Meeting`
  const text = lines.map(l => l.text).join(' ').toLowerCase()
  if (text.includes('component') || text.includes('design system')) return `${projectName} – Component & Token Review`
  if (text.includes('roadmap')   || text.includes('plan'))           return `${projectName} – Planning Session`
  if (text.includes('research')  || text.includes('user'))           return `${projectName} – Research Sync`
  return `${projectName} – Team Sync`
}

/* ─── Summary helpers ─── */
function _cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s }

function _extractDue(sentence) {
  const m = sentence.match(
    /\b(by\s+)?(monday|tuesday|wednesday|thursday|friday|end of week|eow|end of day|eod|today|tomorrow|next week|this week)\b/i
  )
  if (!m) return 'TBD'
  return m[0].replace(/^by\s+/i, '').replace(/\b\w/g, c => c.toUpperCase())
}

const _STOP = new Set(
  'the a an and or but in on at to for of with is are was were be been have has had do does did will would could should may might shall can need that this these those it its we they i you he she our your their my also just very so if as by into from up out like make get let go use then than about here there when where who what how not no yes okay ok yeah sure right well actually really think know want need going im its just'.split(' ')
)

function generateSummaryFromTranscript(lines) {
  if (!lines?.length) return { topicsDiscussed: [], decisions: [], actionItems: [], keyHighlights: [] }

  const allText = lines.map(l => l.text).join(' ')

  // Split into sentences
  const sentences = allText
    .replace(/([.!?])\s+/g, '$1|||')
    .split('|||')
    .map(s => s.trim())
    .filter(s => s.length > 8)

  // Word frequency for keyword extraction
  const freq = {}
  allText.toLowerCase().match(/\b[a-z]{4,}\b/g)?.forEach(w => {
    if (!_STOP.has(w)) freq[w] = (freq[w] || 0) + 1
  })
  const keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    .map(([w]) => w)

  const keyScore = s => keywords.filter(k => s.toLowerCase().includes(k)).length

  // Topics: sentences with highest keyword density
  const topicsDiscussed = [...sentences]
    .filter(s => keyScore(s) >= 2)
    .sort((a, b) => keyScore(b) - keyScore(a))
    .slice(0, 5)
    .map(s => _cap(s))

  const finalTopics = topicsDiscussed.length >= 2
    ? topicsDiscussed
    : keywords.slice(0, 4).map(k => `Discussion around ${k}`)

  // Decisions
  const decisionRx = /\b(decided|agreed|going with|confirmed|we('ll| will) (use|keep|go|adopt)|let'?s (use|go|keep|adopt)|chosen|settled on|happy with|stick with)\b/i
  const decisions = sentences.filter(s => decisionRx.test(s)).slice(0, 4).map(s => _cap(s))

  // Action items
  const futureRx  = /\b(i('ll| will)|we('ll| will)|need[s]? to|going to|should|have to|will)\b/i
  const taskRx    = /\b(create|set up|update|send|share|build|write|review|check|add|fix|prepare|book|schedule|call|email|document|test|deploy|draft|design|implement|follow up|complete)\b/i
  const actionSentences = sentences.filter(s => futureRx.test(s) && taskRx.test(s)).slice(0, 5)

  const actionItems = actionSentences.map((s, i) => {
    const ownerLine = lines.find(l => s.toLowerCase().startsWith(l.text.toLowerCase().slice(0, 18).toLowerCase()))
    return { id: i + 1, task: _cap(s), owner: ownerLine?.speaker || 'Team', due: _extractDue(s) }
  })

  // Key highlights: high keyword density, not already in decisions
  const keyHighlights = [...sentences]
    .filter(s => s.length > 20 && !decisions.includes(_cap(s)))
    .sort((a, b) => keyScore(b) - keyScore(a))
    .slice(0, 4)
    .map(s => _cap(s))

  return { topicsDiscussed: finalTopics, decisions, actionItems, keyHighlights }
}

/* ─────────────────────────────────────────────
   PIP WINDOW CONTENT
   Identical look to FloatingRecordingWidget pill.
   All inline styles — no Tailwind needed.
───────────────────────────────────────────── */
/* ─── Shared icon button style — mirrors FloatingRecordingWidget exactly ─── */
const _pipIBtn = (variant = 'default') => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30, borderRadius: 8, border: 'none',
  cursor: 'pointer', flexShrink: 0,
  background: variant === 'red'    ? 'rgba(220,38,38,0.25)'
            : variant === 'subtle' ? 'rgba(255,255,255,0.06)'
            :                        'rgba(255,255,255,0.08)',
  color:      variant === 'red'    ? '#fca5a5'
            : variant === 'subtle' ? 'rgba(255,255,255,0.45)'
            :                        'rgba(255,255,255,0.8)',
})

/* PipWindowContent — pixel-perfect copy of FloatingRecordingWidget pill (no drag handle) */
function PipWindowContent({ seconds, isPaused, onPause, onResume, onStop, onReturn }) {
  return (
    /* Outer wrapper = full window, centers the pill */
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f0a1a',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      userSelect: 'none', boxSizing: 'border-box',
    }}>
      {/* Pill — exact match to widget inner div */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'linear-gradient(135deg, #1E1130 0%, #150C26 100%)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14,
        padding: '6px 10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        outline: isPaused ? 'none' : '1px solid rgba(220,38,38,0.4)',
        outlineOffset: -1,
      }}>

        {/* Recording dot */}
        <span style={{
          display: 'block', width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          backgroundColor: isPaused ? 'rgba(255,255,255,0.25)' : '#EF4444',
          boxShadow: isPaused ? 'none' : '0 0 6px #EF4444',
        }} />

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

        {/* Timer */}
        <span style={{
          fontSize: 15, fontWeight: 700, letterSpacing: '0.06em',
          fontVariantNumeric: 'tabular-nums', color: '#fff',
          minWidth: 46, textAlign: 'center', flexShrink: 0,
        }}>
          {fmt(seconds)}
        </span>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

        {/* Pause / Resume */}
        <button style={_pipIBtn()} onClick={isPaused ? onResume : onPause} title={isPaused ? 'Resume' : 'Pause'}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}>
          {isPaused ? '▶' : '⏸'}
        </button>

        {/* Stop */}
        <button style={_pipIBtn('red')} onClick={onStop} title="Stop recording"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.45)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.25)' }}>
          ■
        </button>

        {/* Return to recording */}
        <button style={_pipIBtn('subtle')} onClick={onReturn} title="Return to recording"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}>
          ↗
        </button>

      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   APP
───────────────────────────────────────────── */
export default function App() {
  /* ── Page / navigation ── */
  const [page,            setPage]            = useState('login')
  const [projects,        setProjects]        = useState(INITIAL_PROJECTS)
  const [meetings,        setMeetings]        = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [activeMeetingId, setActiveMeetingId] = useState(null)

  /* ── Recording state ── */
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused,    setIsPaused]    = useState(false)
  const [recSeconds,  setRecSeconds]  = useState(0)
  const [recProject,  setRecProject]  = useState(null)
  const [recLines,    setRecLines]    = useState([])
  const [interimText, setInterimText] = useState('')
  const [savedFlash,  setSavedFlash]  = useState(false)
  const [recoveryData,setRecoveryData]= useState(null)

  /* ── Document Picture-in-Picture ── */
  const [pipOpen,    setPipOpen]    = useState(false)
  const pipWindowRef = useRef(null)
  const pipRootRef   = useRef(null)
  const actionsRef   = useRef({})

  /* ── Deepgram live transcription refs ── */
  const deepgramRef      = useRef(null)   // V1Socket (live connection)
  const mediaRecorderRef = useRef(null)   // MediaRecorder feeding audio to Deepgram
  const isRecordingRef   = useRef(false)
  const isPausedRef      = useRef(false)

  /* ── Audio analysis refs (for energy-based speaker detection) ── */
  const micStreamRef     = useRef(null)   // raw getUserMedia stream
  const sysStreamRef     = useRef(null)   // getDisplayMedia stream
  const audioCtxRef      = useRef(null)   // shared AudioContext
  const micAnalyserRef   = useRef(null)   // AnalyserNode for mic
  const sysAnalyserRef   = useRef(null)   // AnalyserNode for system audio
  const currentSpeaker   = useRef(0)      // index into SPEECH_SPEAKERS

  const [systemAudioOn, setSystemAudioOn] = useState(false)

  // Keep refs in sync with state (used inside recognition callbacks)
  isRecordingRef.current = isRecording
  isPausedRef.current    = isPaused

  const autosaveRef = useRef({})

  /* ── On mount: detect interrupted session ── */
  useEffect(() => {
    const raw = localStorage.getItem(AUTOSAVE_KEY)
    if (raw) {
      try { setRecoveryData(JSON.parse(raw)) }
      catch { localStorage.removeItem(AUTOSAVE_KEY) }
    }
  }, [])

  /* ── Keep autosave ref current ── */
  useEffect(() => {
    autosaveRef.current = { recProject, recSeconds, recLines, isPaused }
  }, [recProject, recSeconds, recLines, isPaused])

  /* ── Autosave every 5 s ── */
  useEffect(() => {
    if (!isRecording) return
    const doSave = () => {
      const d = autosaveRef.current
      if (!d.recProject) return
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
        project: d.recProject, seconds: d.recSeconds,
        lines: d.recLines, isPaused: d.isPaused, savedAt: new Date().toISOString(),
      }))
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    }
    doSave()
    const id = setInterval(doSave, 5000)
    return () => clearInterval(id)
  }, [isRecording])

  /* ── Browser close guard ── */
  useEffect(() => {
    const h = (e) => { if (!isRecording) return; e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isRecording])

  /* ── Timer ── */
  useEffect(() => {
    if (!isRecording || isPaused) return
    const id = setInterval(() => setRecSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [isRecording, isPaused])

  /* ── Audio energy helper: picks speaker based on mic vs system audio levels ── */
  const detectSpeaker = () => {
    // No system audio → always "You" (mic only)
    if (!sysAnalyserRef.current || !micAnalyserRef.current) return SPEECH_SPEAKERS[0]

    const buf = n => { const d = new Uint8Array(n.frequencyBinCount); n.getByteFrequencyData(d); return d }
    const avg = d => d.reduce((a, b) => a + b, 0) / d.length

    const micEnergy = avg(buf(micAnalyserRef.current))
    const sysEnergy = avg(buf(sysAnalyserRef.current))

    if (sysEnergy > micEnergy * 1.4 && sysEnergy > 18) {
      // System audio dominant → someone else speaking in the meeting
      if (currentSpeaker.current === 0) {
        currentSpeaker.current = 1 + (currentSpeaker.current % (SPEECH_SPEAKERS.length - 1))
      }
    } else if (micEnergy > 12) {
      currentSpeaker.current = 0  // mic dominant → "You"
    }
    return SPEECH_SPEAKERS[currentSpeaker.current] ?? SPEECH_SPEAKERS[0]
  }

  /* ── System audio capture (for meeting multi-speaker detection) ── */
  const captureSystemAudio = async () => {
    try {
      const dispStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: false })
      sysStreamRef.current = dispStream

      // Initialise AudioContext if not already done
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current

      // Mic analyser
      if (micStreamRef.current && !micAnalyserRef.current) {
        const micSrc = ctx.createMediaStreamSource(micStreamRef.current)
        const micAn  = ctx.createAnalyser(); micAn.fftSize = 256
        micSrc.connect(micAn)
        micAnalyserRef.current = micAn
      }

      // System audio analyser
      const sysSrc = ctx.createMediaStreamSource(dispStream)
      const sysAn  = ctx.createAnalyser(); sysAn.fftSize = 256
      sysSrc.connect(sysAn)
      sysAnalyserRef.current = sysAn

      setSystemAudioOn(true)
      currentSpeaker.current = 0

      // Clean up if user stops sharing
      dispStream.getAudioTracks()[0]?.addEventListener('ended', stopSystemAudio)
    } catch (e) {
      console.warn('System audio capture:', e.message)
    }
  }

  const stopSystemAudio = () => {
    sysStreamRef.current?.getTracks().forEach(t => t.stop())
    sysStreamRef.current  = null
    sysAnalyserRef.current = null
    currentSpeaker.current = 0
    setSystemAudioOn(false)
  }

  /* ── Deepgram live transcription ─────────────────────────────────────────────
     Model  : nova-2   — Deepgram's most accurate real-time model
     Language: multi   — auto-detects 30+ languages incl. Hindi & English
     Free tier: $200 credit on signup at console.deepgram.com (~46 k minutes)
     API key : set VITE_DEEPGRAM_API_KEY in .env
  ──────────────────────────────────────────────────────────────────────────── */

  const stopDeepgram = () => {
    // Stop MediaRecorder first to flush remaining audio
    if (mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop() } catch (_) {}
      mediaRecorderRef.current = null
    }
    // Close Deepgram WebSocket
    if (deepgramRef.current) {
      try { deepgramRef.current.close() } catch (_) {}
      deepgramRef.current = null
    }
    setInterimText('')
  }

  const startDeepgram = async () => {
    if (deepgramRef.current) return   // already running

    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY
    if (!apiKey || apiKey === 'your_deepgram_api_key_here') {
      console.warn('Deepgram: set VITE_DEEPGRAM_API_KEY in .env — falling back to Web Speech API')
      startWebSpeechFallback()
      return
    }

    try {
      // Acquire mic stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      micStreamRef.current = stream

      // Create Deepgram client and open live WebSocket
      const client     = new DeepgramClient({ apiKey })
      const socket     = await client.listen.v1.connect({
        model:            'nova-2',
        language:         'multi',      // auto-detect 30+ languages including Hindi
        smart_format:     true,         // auto-punctuation + formatting
        interim_results:  true,         // live typing words
        punctuate:        true,
        utterance_end_ms: 1000,
        vad_events:       true,
      })

      deepgramRef.current = socket

      socket.on('open', () => {
        // Pick best MIME type supported by this browser
        const mimeType =
          MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
          MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm'             :
          MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')  ? 'audio/ogg;codecs=opus'  : ''

        const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        mediaRecorderRef.current = mr

        mr.addEventListener('dataavailable', (event) => {
          if (
            event.data.size > 0         &&
            deepgramRef.current         &&
            deepgramRef.current.readyState === 1 &&
            !isPausedRef.current
          ) {
            deepgramRef.current.sendMedia(event.data)
          }
        })

        mr.start(250)   // send 250 ms chunks → ~250 ms latency
      })

      socket.on('message', (data) => {
        // Deepgram sends various message types; only 'Results' has transcripts
        if (data?.type !== 'Results') return
        const transcript = data?.channel?.alternatives?.[0]?.transcript?.trim()
        if (!transcript) return

        if (data.is_final) {
          const sp = detectSpeaker()
          setRecLines(prev => [...prev, {
            id:       `${Date.now()}-${Math.random()}`,
            speaker:  sp.id,
            initials: sp.initials,
            color:    sp.color,
            text:     transcript,
          }])
          setInterimText('')
        } else {
          setInterimText(transcript)
        }
      })

      socket.on('error', (e) => {
        console.warn('Deepgram error:', e)
      })

      socket.on('close', () => {
        // Auto-reconnect if recording is still active (connection dropped)
        if (isRecordingRef.current && !isPausedRef.current && micStreamRef.current) {
          deepgramRef.current    = null
          mediaRecorderRef.current = null
          setTimeout(() => startDeepgram(), 1500)
        }
      })

    } catch (e) {
      console.warn('Deepgram start failed:', e.message)
    }
  }

  /* ── Web Speech API fallback (when no Deepgram key is set) ── */
  const webSpeechRef = useRef([])

  const startWebSpeechFallback = () => {
    if (webSpeechRef.current.length > 0) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.continuous = true; rec.interimResults = true; rec.lang = 'en-IN'
    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text   = result[0].transcript.trim()
        if (!text) continue
        if (result.isFinal) {
          const sp = detectSpeaker()
          setRecLines(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, speaker: sp.id, initials: sp.initials, color: sp.color, text }])
          setInterimText('')
        } else { setInterimText(result[0].transcript) }
      }
    }
    rec.onend = () => {
      setTimeout(() => {
        if (webSpeechRef.current.includes(rec) && isRecordingRef.current && !isPausedRef.current) {
          try { rec.start() } catch (_) {}
        }
      }, 100)
    }
    rec.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') console.warn('SpeechRecognition:', e.error) }
    try { rec.start(); webSpeechRef.current = [rec] } catch (_) {}
  }

  const stopWebSpeechFallback = () => {
    const recs = webSpeechRef.current
    webSpeechRef.current = []
    recs.forEach(r => { try { r.stop() } catch (_) {} })
  }

  /* Start / stop transcription whenever recording or pause state changes */
  useEffect(() => {
    if (isRecording && !isPaused) {
      startDeepgram()     // no-op if already running
    }
    if (!isRecording) {
      stopDeepgram()
      stopWebSpeechFallback()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, isPaused])

  /* ── Navigation ── */
  const navToProject   = (id) => { setActiveProjectId(id); setPage('project') }
  const navToMeeting   = (id) => { setActiveMeetingId(id); setPage('meeting') }
  const navToDashboard = ()   => setPage('dashboard')

  /* ── Meeting helpers ── */
  const buildMeeting = () => ({
    id:          Date.now().toString(),
    projectId:   recProject.id,
    projectName: recProject.name,
    title:       generateTitle(recProject.name, recLines),
    date:        nowDateLabel(),
    dateKey:     nowDateKey(),
    time:        nowTimeLabel(),
    duration:    fmt(recSeconds),
    language:    'English',
    transcript:  [...recLines],
    summary:     generateSummaryFromTranscript(recLines),
  })

  const clearRecording = () => {
    localStorage.removeItem(AUTOSAVE_KEY)
    stopDeepgram()
    stopWebSpeechFallback()
    stopSystemAudio()
    micStreamRef.current?.getTracks().forEach(t => t.stop())
    micStreamRef.current   = null
    micAnalyserRef.current = null
    currentSpeaker.current = 0
    setIsRecording(false); setIsPaused(false)
    setRecSeconds(0); setRecLines([]); setRecProject(null); setInterimText('')
    // Close PiP inline (closePip defined later, avoid hoisting issue)
    if (pipWindowRef.current && !pipWindowRef.current.closed) pipWindowRef.current.close()
    pipWindowRef.current = null; pipRootRef.current = null; setPipOpen(false)
  }

  const handleEndRecording = () => {
    const meeting = buildMeeting()
    const pid     = recProject.id
    setMeetings(prev => [meeting, ...prev])
    clearRecording()
    navToProject(pid)
  }

  /* ── Document PiP — keep actionsRef current so PiP callbacks don't go stale ── */
  actionsRef.current = { handleEndRecording, navToDashboard, setIsPaused, recProject, recSeconds, isPaused }

  const syncPipContent = () => {
    if (!pipRootRef.current || !pipWindowRef.current || pipWindowRef.current.closed) return
    const { handleEndRecording: onStop, navToDashboard: onReturn, setIsPaused: setSP, recProject: proj, recSeconds: secs, isPaused: paused } = actionsRef.current
    pipRootRef.current.render(
      <PipWindowContent
        seconds={secs}
        isPaused={paused}
        onPause={()  => setSP(true)}
        onResume={() => setSP(false)}
        onStop={onStop}
        onReturn={() => { onReturn(); closePip() }}
      />
    )
  }

  /* Sync PiP whenever recording state changes */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { syncPipContent() }, [recSeconds, isPaused, recProject, pipOpen])

  const closePip = () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close()
    }
    pipWindowRef.current = null
    pipRootRef.current   = null
    setPipOpen(false)
  }

  /* Opens a Document PiP window — must be triggered from a user gesture */
  const openDocumentPip = async () => {
    if (!('documentPictureInPicture' in window)) return  // silently skip unsupported browsers
    if (pipWindowRef.current && !pipWindowRef.current.closed) return  // already open

    try {
      const pipWin = await window.documentPictureInPicture.requestWindow({
        width: 250, height: 56,   // pill: 6+30+6=42px + outer wrapper padding = 56px
        disallowReturnToOpener: false,
      })
      pipWindowRef.current = pipWin

      /* Hard reset — zero margin/padding everywhere */
      const style = pipWin.document.createElement('style')
      style.textContent = `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { overflow: hidden; background: #150C26; }`
      pipWin.document.head.appendChild(style)

      pipWin.document.title = 'MB Notetaker'

      const container = pipWin.document.createElement('div')
      pipWin.document.body.appendChild(container)
      pipRootRef.current = createRoot(container)

      setPipOpen(true)
      syncPipContent()

      /* Handle user manually closing the PiP window */
      pipWin.addEventListener('pagehide', () => {
        pipWindowRef.current = null
        pipRootRef.current   = null
        setPipOpen(false)
      })
    } catch (e) {
      console.warn('PiP open failed:', e.message)
    }
  }

  /* ── PiP: open when recording and user leaves dashboard (in-app navigation)
     The sidebar click IS the user activation. useEffect runs within same task
     — well within Chrome's 5 second transient activation window. ── */
  useEffect(() => {
    if (!isRecording) return
    if (page !== 'dashboard') {
      openDocumentPip()   // user navigated away from recording screen
    } else {
      closePip()          // user returned to recording screen
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  /* ── PiP: open when user switches browser tab / window while recording ── */
  useEffect(() => {
    const handleVisibility = () => {
      if (!isRecordingRef.current) return
      if (document.hidden) {
        openDocumentPip()                               // left the tab → show PiP
      } else {
        if (page === 'dashboard') closePip()            // returned to tab on recording screen → hide PiP
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  /* ── Chrome Extension bridge: notify extension when recording state changes ── */
  const extBridgeInitRef = useRef(false)
  useEffect(() => {
    if (isRecording) {
      extBridgeInitRef.current = true
      window.postMessage({ mbNotetaker: true, type: 'RECORDING_STARTED' }, '*')
    } else if (extBridgeInitRef.current) {
      window.postMessage({ mbNotetaker: true, type: 'RECORDING_STOPPED' }, '*')
    }
  }, [isRecording])

  useEffect(() => {
    if (!isRecording) return
    window.postMessage({
      mbNotetaker: true,
      type: isPaused ? 'RECORDING_PAUSED' : 'RECORDING_RESUMED',
    }, '*')
  }, [isPaused, isRecording])

  /* ── Chrome Extension bridge: handle actions FROM extension widget ── */
  useEffect(() => {
    const handler = (e) => {
      if (!e.data?.mbNotetakerAction) return
      const { action } = e.data
      if (action === 'PAUSE')  setIsPaused(true)
      if (action === 'RESUME') setIsPaused(false)
      if (action === 'STOP')   handleEndRecording()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Start recording — called directly from a click handler (user gesture) ── */
  const startRecording = (project) => {
    currentSpeaker.current = 0
    setRecProject(project)
    setIsRecording(true)
    setIsPaused(false)
    setRecSeconds(0)
    setRecLines([])
    setInterimText('')
    // PiP does NOT open here — user is still on the recording page.
    // It will auto-open when they navigate away (page change) or switch tabs (visibilitychange).
  }

  const startRecordingFromProject = (project) => {
    startRecording(project)
    setPage('dashboard')
  }

  /* ── Recovery resume — also within a user gesture ── */
  const handleResumeRecovery = () => {
    const d = recoveryData
    setRecProject(d.project); setRecSeconds(d.seconds ?? 0)
    setRecLines(d.lines ?? []); setIsPaused(false); setIsRecording(true)
    setRecoveryData(null)
    // PiP opens automatically when user navigates away from dashboard
  }

  const handleDiscardRecovery = () => {
    localStorage.removeItem(AUTOSAVE_KEY)
    setRecoveryData(null)
  }

  const handleSaveAndStartNew = () => {
    const d = recoveryData
    if (d?.project) {
      // Build and save the recovered meeting
      const meeting = {
        id:          Date.now().toString(),
        projectId:   d.project.id,
        projectName: d.project.name,
        title:       generateTitle(d.project.name, d.lines ?? []),
        date:        nowDateLabel(),
        dateKey:     nowDateKey(),
        time:        nowTimeLabel(),
        duration:    fmt(d.seconds ?? 0),
        language:    'English',
        transcript:  [...(d.lines ?? [])],
        summary:     generateSummaryFromTranscript(d.lines ?? []),
      }
      setMeetings(prev => [meeting, ...prev])
      // Clear recovery and start fresh recording in same project
      localStorage.removeItem(AUTOSAVE_KEY)
      setRecoveryData(null)
      startRecording(d.project)
    }
  }

  const handleUpdateMeeting = (updated) =>
    setMeetings(prev => prev.map(m => m.id === updated.id ? updated : m))

  const handleCreateProject = () => {
    const id = Date.now()
    setProjects(prev => [...prev, { id, name: 'New Project', color: '#7133AE' }])
    return id
  }

  const handleRenameProject = (id, newName) =>
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p))

  const handleDeleteProject = (id) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    setMeetings(prev => prev.filter(m => m.projectId !== id))
    if (activeProjectId === id) navToDashboard()
  }

  const activeProject   = projects.find(p => p.id === activeProjectId)
  const activeMeeting   = meetings.find(m => m.id === activeMeetingId)
  const projectMeetings = meetings.filter(m => m.projectId === activeProjectId)


  return (
    <>
      {page === 'login' && <LoginPage onLogin={navToDashboard} />}

      {page === 'dashboard' && (
        <Dashboard
          projects={projects}
          isRecording={isRecording}
          isPaused={isPaused}
          recSeconds={recSeconds}
          recProject={recProject}
          recLines={recLines}
          interimText={interimText}
          savedFlash={savedFlash}
          recoveryData={recoveryData}
          onStartRecording={startRecording}
          systemAudioOn={systemAudioOn}
          onCaptureSystemAudio={captureSystemAudio}
          onStopSystemAudio={stopSystemAudio}
          onPause={() => setIsPaused(true)}
          onResume={() => setIsPaused(false)}
          onEnd={handleEndRecording}
          onRecoveryResume={handleResumeRecovery}
          onRecoveryDiscard={handleDiscardRecovery}
          onRecoverySaveAndStart={handleSaveAndStartNew}
          onNavigateToProject={navToProject}
          onNavigateToDashboard={navToDashboard}
          onCreateProject={handleCreateProject}
          onRenameProject={handleRenameProject}
          onDeleteProject={handleDeleteProject}
        />
      )}

      {page === 'project' && (
        <ProjectPage
          project={activeProject}
          meetings={projectMeetings}
          projects={projects}
          onNavigateToMeeting={navToMeeting}
          onNavigateToProject={navToProject}
          onNavigateToDashboard={navToDashboard}
          onStartRecording={startRecordingFromProject}
          onCreateProject={handleCreateProject}
          onRenameProject={handleRenameProject}
          onDeleteProject={handleDeleteProject}
        />
      )}

      {page === 'meeting' && (
        <MeetingDetail
          meeting={activeMeeting}
          project={activeProject}
          onBack={() => setPage('project')}
          onUpdate={handleUpdateMeeting}
          projects={projects}
          onNavigateToProject={navToProject}
          onNavigateToDashboard={navToDashboard}
          onCreateProject={handleCreateProject}
          onRenameProject={handleRenameProject}
          onDeleteProject={handleDeleteProject}
        />
      )}

      {/* FloatingRecordingWidget removed — PiP overlay handles this */}
    </>
  )
}
