import { useState, useEffect, useRef } from 'react'
import PiPWidget          from './components/PiPWidget'
import RecordingSetupModal from './components/RecordingSetupModal'
import LoginPage           from './pages/LoginPage'
import Dashboard           from './pages/Dashboard'
import ProjectPage         from './pages/ProjectPage'
import MeetingDetail       from './pages/MeetingDetail'
import WorkspacePageEditor from './pages/WorkspacePageEditor'
import { listenAuthState, signOutUser, firebaseConfigured, db } from './lib/firebase'
import {
  collection, doc, getDocs, setDoc, deleteDoc, writeBatch,
} from 'firebase/firestore'

/* ─── Constants ─── */
const AUTOSAVE_KEY = 'mb_notetaker_autosave'

const INITIAL_PROJECTS = [
  { id: 1, name: 'Design System Q2', color: '#7133AE' },
  { id: 2, name: 'Product Roadmap',  color: '#2563EB' },
  { id: 3, name: 'User Research',    color: '#059669' },
  { id: 4, name: 'Engineering Sync', color: '#D97706' },
]

/* Speaker roster — indexed by Deepgram diarize speaker number (0, 1, 2 …) */
const SPEECH_SPEAKERS = [
  { id: 'You',       initials: 'You', color: '#7133AE' },
  { id: 'Speaker 1', initials: 'S1',  color: '#6366F1' },
  { id: 'Speaker 2', initials: 'S2',  color: '#0891B2' },
  { id: 'Speaker 3', initials: 'S3',  color: '#059669' },
  { id: 'Speaker 4', initials: 'S4',  color: '#D97706' },
]

/* ─── Devanagari → Latin transliteration ────────────────────────────────────
   Converts Hindi / Marathi Devanagari text to phonetic English script so that
   "क्या चल रहा है" → "kya chal raha hai".
   Leaves already-Latin text (English words) untouched.
────────────────────────────────────────────────────────────────────────────── */
const _DV = {
  /* Independent vowels */
  'अ':'a',  'आ':'aa', 'इ':'i',  'ई':'ee', 'उ':'u',  'ऊ':'oo',
  'ऋ':'ri', 'ए':'e',  'ऐ':'ai', 'ओ':'o',  'औ':'au', 'ऑ':'o',
  /* Vowel matras (dependent vowel signs) */
  '\u093E':'a', '\u093F':'i', '\u0940':'ee', '\u0941':'u',  '\u0942':'oo',
  '\u0943':'ri','\u0947':'e', '\u0948':'ai', '\u094B':'o',  '\u094C':'au',
  '\u094A':'o',
  /* Consonants */
  'क':'k',  'ख':'kh', 'ग':'g',  'घ':'gh', 'ङ':'ng',
  'च':'ch', 'छ':'chh','ज':'j',  'झ':'jh', 'ञ':'n',
  'ट':'t',  'ठ':'th', 'ड':'d',  'ढ':'dh', 'ण':'n',
  'त':'t',  'थ':'th', 'द':'d',  'ध':'dh', 'न':'n',
  'प':'p',  'फ':'f',  'ब':'b',  'भ':'bh', 'म':'m',
  'य':'y',  'र':'r',  'ल':'l',  'व':'v',  'ळ':'l',
  'श':'sh', 'ष':'sh', 'स':'s',  'ह':'h',
  /* Nukta consonants (Urdu-origin) */
  'क़':'q', 'ख़':'kh','ग़':'g', 'ज़':'z', 'फ़':'f', 'ड़':'r', 'ढ़':'rh',
  /* Modifiers */
  '\u0902':'n',  /* anusvara ं  */
  '\u0901':'n',  /* chandrabindu ँ */
  '\u0903':'h',  /* visarga ः */
  '\u094D':'',   /* halant / virama ् — suppresses inherent vowel */
  /* Punctuation & digits */
  '।':'.',  '॥':'.',
  '०':'0','१':'1','२':'2','३':'3','४':'4',
  '५':'5','६':'6','७':'7','८':'8','९':'9',
}

function transliterate(text) {
  if (!text || !/[\u0900-\u097F]/.test(text)) return text   // fast-path: no Devanagari
  const chars = [...text]   // spread handles multi-byte code-points correctly
  let out = ''
  for (let i = 0; i < chars.length; i++) {
    const ch   = chars[i]
    const next = chars[i + 1] ?? ''
    /* Two-char nukta combinations (e.g. ज़) */
    if (next === '\u093C' && _DV[ch + next] !== undefined) {
      out += _DV[ch + next]; i++; continue
    }
    out += (_DV[ch] !== undefined) ? _DV[ch] : ch
  }
  return out.replace(/\s+/g, ' ').trim()
}

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
   APP
───────────────────────────────────────────── */
export default function App() {
  /* ── Auth ── */
  const [currentUser,   setCurrentUser]   = useState(null)   // Firebase User object
  const [authChecked,   setAuthChecked]   = useState(false)  // true once onAuthStateChanged fires
  const [dataLoading,   setDataLoading]   = useState(false)  // true while loading Firestore data

  /* ── Page / navigation ── */
  const [page,            setPage]            = useState('login')
  const [projects,        setProjects]        = useState(INITIAL_PROJECTS)
  const [meetings,        setMeetings]        = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [activeMeetingId, setActiveMeetingId] = useState(null)

  /* ── Workspace state ── */
  const [workspaceFolders,        setWorkspaceFolders]        = useState([])
  const [workspacePages,          setWorkspacePages]          = useState([])
  const [activeWorkspacePageId,   setActiveWorkspacePageId]   = useState(null)

  /* ── Recording state ── */
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused,    setIsPaused]    = useState(false)
  const [recSeconds,  setRecSeconds]  = useState(0)
  const [recProject,  setRecProject]  = useState(null)
  const [recLines,    setRecLines]    = useState([])
  const [interimText, setInterimText] = useState('')
  const [savedFlash,    setSavedFlash]    = useState(false)
  const [recoveryData,  setRecoveryData]  = useState(null)
  const [sysAudioError, setSysAudioError] = useState('')   // feedback for Add meeting audio


  /* ── Recording setup modal ── */
  const [setupProject,     setSetupProject]     = useState(null)   // non-null = modal open
  const selectedDeviceIdRef = useRef(null)                          // mic device chosen in modal

  /* ── Deepgram live transcription refs ── */
  const deepgramRef      = useRef(null)   // V1Socket (live connection)
  const mediaRecorderRef = useRef(null)   // MediaRecorder feeding audio to Deepgram
  const isRecordingRef   = useRef(false)
  const isPausedRef      = useRef(false)

  /* ── Audio analysis refs (for energy-based speaker detection) ── */
  const micStreamRef     = useRef(null)   // raw getUserMedia stream
  const sysStreamRef     = useRef(null)   // getDisplayMedia stream
  const audioCtxRef      = useRef(null)   // shared AudioContext
  const meetMediaRecorderRef = useRef(null) // MediaRecorder for meeting tab audio (others)
  const micAnalyserRef   = useRef(null)   // AnalyserNode for mic
  const sysAnalyserRef   = useRef(null)   // AnalyserNode for system audio
  const currentSpeaker   = useRef(0)      // index into SPEECH_SPEAKERS
  const speakerEnergy    = useRef({ micSum: 0, sysSum: 0, n: 0 })  // rolling energy window

  const [systemAudioOn,      setSystemAudioOn]      = useState(false)
  const [sysAudioLoading,    setSysAudioLoading]    = useState(false)

  /* ── Document PiP overlay ── */
  const [pipOpen,    setPipOpen]  = useState(false)
  const pipWindowRef = useRef(null)
  const pageRef      = useRef('login')   // always-current page, safe inside event closures

  /* ── Real-time waveform heights (0-255 per bar, driven by AnalyserNode) ── */
  const [waveHeights, setWaveHeights] = useState(Array(20).fill(0))
  const waveRafRef = useRef(null)

  /* ── Mic device list (for live mic-change dropdown) ── */
  const [micDevices,    setMicDevices]    = useState([])   // MediaDeviceInfo[]
  const [selectedMicId, setSelectedMicId] = useState(null) // currently active device ID

  // Keep refs in sync with state (used inside event-listener closures)
  isRecordingRef.current = isRecording
  isPausedRef.current    = isPaused
  pageRef.current        = page

  const autosaveRef = useRef({})

  /* ── Enumerate mic devices ──────────────────────────────────────────────────
     Browser only exposes device labels after mic permission is granted.
     We silently request getUserMedia first (to unlock labels), then enumerate.
     If permission is already granted the stream is created + immediately stopped.
     If it's denied we still enumerate — devices appear but with empty labels.
  ────────────────────────────────────────────────────────────────────────────── */
  const refreshMicDevices = async () => {
    try {
      // Request permission to unlock labels (no-op if already granted)
      const tmp = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      tmp.getTracks().forEach(t => t.stop())
    } catch { /* permission denied — still enumerate below */ }

    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      setMicDevices(all.filter(d => d.kind === 'audioinput'))
    } catch { /* silently ignore */ }
  }

  /* ── Firestore helpers ───────────────────────────────────────────────────────
     All data is stored under:  users/{uid}/projects/{projectId}
                                users/{uid}/meetings/{meetingId}
     Project doc IDs are String(project.id); meeting doc IDs are meeting.id.
  ────────────────────────────────────────────────────────────────────────────── */

  /** Load the user's projects + meetings from Firestore on login. */
  const loadUserData = async (uid) => {
    if (!db) return
    setDataLoading(true)
    try {
      const [projSnap, meetSnap, wfSnap, wpSnap] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'projects')),
        getDocs(collection(db, 'users', uid, 'meetings')),
        getDocs(collection(db, 'users', uid, 'workspaceFolders')),
        getDocs(collection(db, 'users', uid, 'workspacePages')),
      ])

      const loadedProjects = projSnap.docs.map(d => d.data())
      const loadedMeetings = meetSnap.docs.map(d => d.data())

      if (loadedProjects.length === 0) {
        // First login — seed with the four starter projects
        const batch = writeBatch(db)
        INITIAL_PROJECTS.forEach(p =>
          batch.set(doc(db, 'users', uid, 'projects', String(p.id)), p)
        )
        await batch.commit()
        setProjects(INITIAL_PROJECTS)
      } else {
        setProjects(loadedProjects)
      }

      // Sort newest-first (meeting IDs are timestamp strings)
      loadedMeetings.sort((a, b) => b.id.localeCompare(a.id))
      setMeetings(loadedMeetings)

      // Load workspace
      setWorkspaceFolders(wfSnap.docs.map(d => d.data()))
      setWorkspacePages(wpSnap.docs.map(d => d.data()))
    } catch (e) {
      console.error('[Firestore] loadUserData failed:', e)
    } finally {
      setDataLoading(false)
    }
  }

  /** Upsert a single project doc. */
  const fsSaveProject = (uid, project) => {
    if (!db || !uid) return
    setDoc(doc(db, 'users', uid, 'projects', String(project.id)), project)
      .catch(e => console.error('[Firestore] saveProject failed:', e))
  }

  /** Delete a project doc and all meetings that belong to it. */
  const fsDeleteProject = async (uid, projectId, meetingsList) => {
    if (!db || !uid) return
    try {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'users', uid, 'projects', String(projectId)))
      meetingsList
        .filter(m => m.projectId === projectId)
        .forEach(m => batch.delete(doc(db, 'users', uid, 'meetings', m.id)))
      await batch.commit()
    } catch (e) {
      console.error('[Firestore] deleteProject failed:', e)
    }
  }

  /** Upsert a single meeting doc. */
  const fsSaveMeeting = (uid, meeting) => {
    if (!db || !uid) return
    setDoc(doc(db, 'users', uid, 'meetings', meeting.id), meeting)
      .catch(e => console.error('[Firestore] saveMeeting failed:', e))
  }

  /** Delete a single meeting doc. */
  const fsDeleteMeeting = (uid, meetingId) => {
    if (!db || !uid) return
    deleteDoc(doc(db, 'users', uid, 'meetings', meetingId))
      .catch(e => console.error('[Firestore] deleteMeeting failed:', e))
  }

  /* ── Workspace Firestore helpers ─────────────────────────────────────────── */
  const fsSaveWorkspaceFolder = (uid, folder) => {
    if (!db || !uid) return
    setDoc(doc(db, 'users', uid, 'workspaceFolders', String(folder.id)), folder)
      .catch(e => console.error('[Firestore] saveWorkspaceFolder failed:', e))
  }

  const fsDeleteWorkspaceFolder = async (uid, folderId, pagesList) => {
    if (!db || !uid) return
    try {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'users', uid, 'workspaceFolders', String(folderId)))
      pagesList
        .filter(p => p.folderId === folderId)
        .forEach(p => batch.delete(doc(db, 'users', uid, 'workspacePages', String(p.id))))
      await batch.commit()
    } catch (e) { console.error('[Firestore] deleteWorkspaceFolder failed:', e) }
  }

  const fsSaveWorkspacePage = (uid, page) => {
    if (!db || !uid) return
    setDoc(doc(db, 'users', uid, 'workspacePages', String(page.id)), page)
      .catch(e => console.error('[Firestore] saveWorkspacePage failed:', e))
  }

  const fsDeleteWorkspacePage = (uid, pageId) => {
    if (!db || !uid) return
    deleteDoc(doc(db, 'users', uid, 'workspacePages', String(pageId)))
      .catch(e => console.error('[Firestore] deleteWorkspacePage failed:', e))
  }

  /* ── Firebase auth state ────────────────────────────────────────────────────
     onAuthStateChanged fires once immediately with the cached user (or null),
     then again whenever login / logout happens.
     This is the single source of truth for whether the user is authenticated.
  ────────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    // listenAuthState handles missing Firebase config gracefully:
    // if env vars are not set it calls back with null immediately → shows login page
    const unsubscribe = listenAuthState((user) => {
      setCurrentUser(user)
      setAuthChecked(true)
      if (user) {
        setPage('dashboard')
        loadUserData(user.uid)   // fetch projects + meetings from Firestore
      } else {
        setPage('login')
        // Clear all user data from memory when logging out
        setProjects(INITIAL_PROJECTS)
        setMeetings([])
        setActiveProjectId(null)
        setActiveMeetingId(null)
        setWorkspaceFolders([])
        setWorkspacePages([])
        setActiveWorkspacePageId(null)
      }
    })
    return unsubscribe
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── On mount: detect interrupted session + do initial device enum ── */
  useEffect(() => {
    const raw = localStorage.getItem(AUTOSAVE_KEY)
    if (raw) {
      try { setRecoveryData(JSON.parse(raw)) }
      catch { localStorage.removeItem(AUTOSAVE_KEY) }
    }
    refreshMicDevices()

    /* ── devicechange: refresh list when headphones/BT devices are plugged in ── */
    const onDeviceChange = () => refreshMicDevices()
    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Re-enumerate mics when recording starts (permission now granted → labels visible) ── */
  useEffect(() => {
    if (isRecording) refreshMicDevices()
  }, [isRecording]) // eslint-disable-line react-hooks/exhaustive-deps

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

  /* ── Continuous speaker energy sampling (80 ms intervals) ──────────────────
     Accumulates mic vs system audio energy so detectSpeaker() can correctly
     identify who spoke during an utterance window, not just at finalization.
  ──────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isRecording || isPaused) return
    const getAvg = (analyser) => {
      const d = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(d)
      return d.reduce((a, b) => a + b, 0) / d.length
    }
    const id = setInterval(() => {
      if (micAnalyserRef.current) {
        speakerEnergy.current.micSum += getAvg(micAnalyserRef.current)
        speakerEnergy.current.n++
      }
      if (sysAnalyserRef.current) {
        speakerEnergy.current.sysSum += getAvg(sysAnalyserRef.current)
      }
    }, 80)
    return () => clearInterval(id)
  }, [isRecording, isPaused])

  /* ── Real-time audio waveform — AnalyserNode → bar heights at ~30 fps ──────
     Reads frequency data from the mic AnalyserNode and maps BAR_COUNT bins to
     pixel heights that drive the AnimatedWaveform in Dashboard and PiPWidget.
     The RAF loop runs only while recording AND not paused.
     When paused: last heights are kept frozen (natural "freeze" effect).
     When stopped: heights reset to zero.
  ────────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const BAR_COUNT = 20
    if (!isRecording) {
      cancelAnimationFrame(waveRafRef.current)
      setWaveHeights(Array(BAR_COUNT).fill(0))
      return
    }
    if (isPaused) {
      cancelAnimationFrame(waveRafRef.current)
      return
    }
    let lastTime = 0
    const draw = (timestamp) => {
      waveRafRef.current = requestAnimationFrame(draw)
      if (timestamp - lastTime < 33) return   // cap at ~30 fps
      lastTime = timestamp
      if (!micAnalyserRef.current) return     // wait until analyser is ready
      const bins = new Uint8Array(micAnalyserRef.current.frequencyBinCount)
      micAnalyserRef.current.getByteFrequencyData(bins)
      // Voice frequencies sit roughly in bins 2-80 (of 128 total @ fftSize=256)
      const step = 78 / BAR_COUNT
      const heights = Array.from({ length: BAR_COUNT }, (_, i) =>
        bins[Math.round(2 + i * step)] ?? 0
      )
      setWaveHeights(heights)
    }
    waveRafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(waveRafRef.current)
  }, [isRecording, isPaused])

  /* ── Speaker detection using accumulated energy window ─────────────────────
     Called on every is_final transcript. Reads the energy accumulated since the
     last call (via the 80 ms sampling interval) and decides who spoke.
     No system audio → always "You". With system audio:
       avgSys > avgMic × 1.2  →  Speaker 1 / 2 / 3  (meeting participant)
       otherwise               →  You  (microphone dominant)
  ──────────────────────────────────────────────────────────────────────────── */
  const detectSpeaker = () => {
    // Snapshot and reset the energy window
    const { micSum, sysSum, n } = speakerEnergy.current
    speakerEnergy.current = { micSum: 0, sysSum: 0, n: 0 }

    // No system audio captured yet → always "You"
    if (!sysAnalyserRef.current || n === 0) return SPEECH_SPEAKERS[0]

    const avgMic = micSum / n
    const avgSys = sysSum / n

    if (avgSys > avgMic * 1.2 && avgSys > 3) {
      // Meeting audio was louder → a remote participant spoke
      // Cycle through Speaker 1, Speaker 2 on each new remote segment
      if (currentSpeaker.current === 0) {
        currentSpeaker.current = 1   // first remote speaker
      } else {
        // Alternate between remote speakers to spread attribution
        currentSpeaker.current =
          currentSpeaker.current < SPEECH_SPEAKERS.length - 1
            ? currentSpeaker.current + 1
            : 1
      }
    } else {
      currentSpeaker.current = 0   // mic was louder → "You"
    }

    return SPEECH_SPEAKERS[currentSpeaker.current] ?? SPEECH_SPEAKERS[0]
  }

  /* ── System audio capture ────────────────────────────────────────────────────
     Captures tab/system audio so other meeting participants are also transcribed.
     HOW TO USE IN GOOGLE MEET:
     Uses the MB Notetaker Chrome Extension's tabCapture API to silently
     capture the meeting tab's audio — NO screen-share dialog required.
     Falls back gracefully (mic only) if the extension is not installed
     or no meeting tab is open.
  ──────────────────────────────────────────────────────────────────────────── */

  /** Ask the extension to get a tabCapture stream ID for the meeting tab.
   *  Timeout is short (400 ms) so the user-gesture context is still alive
   *  for the getDisplayMedia fallback that follows. */
  const requestMeetingAudioStreamId = () => new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler)
      resolve(null)
    }, 400)

    function handler(e) {
      if (!e.data?.mbNotetakerResponse) return
      if (e.data.type !== 'MEETING_AUDIO_STREAM_ID') return
      clearTimeout(timeout)
      window.removeEventListener('message', handler)
      resolve(e.data.streamId ? e.data : null)
    }

    window.addEventListener('message', handler)
    window.postMessage({ mbNotetaker: true, type: 'REQUEST_MEETING_AUDIO' }, '*')
  })

  const stopSystemAudio = () => {
    sysStreamRef.current?.getTracks().forEach(t => t.stop())
    sysStreamRef.current   = null
    sysAnalyserRef.current = null
    currentSpeaker.current = 0
    setSystemAudioOn(false)
    setSysAudioError('')
  }

  /* ── Change microphone during live transcription ─────────────────────────────
     Stores the new device ID and, if recording is active, restarts Deepgram
     so the new mic is picked up immediately. The meeting audio stream stored in
     sysStreamRef is preserved and automatically reused by startDeepgram().
  ────────────────────────────────────────────────────────────────────────────── */
  const changeMic = async (deviceId) => {
    selectedDeviceIdRef.current = deviceId
    setSelectedMicId(deviceId)
    if (!isRecordingRef.current) return
    // Stop current mic stream
    micStreamRef.current?.getTracks().forEach(t => t.stop())
    micStreamRef.current   = null
    micAnalyserRef.current = null
    // Restart Deepgram (sysStreamRef is preserved — meeting audio continues)
    stopDeepgram()
    await new Promise(r => setTimeout(r, 200))
    await startDeepgram()
  }

  /* ── Enable meeting audio — works both BEFORE and DURING recording ──────────
     IMPORTANT: getDisplayMedia() must be the VERY FIRST await inside this
     function. Any await before it (even setTimeout or postMessage) will expire
     Chrome's user-gesture context and cause a "Must be handling user gesture"
     error. The extension tabCapture path is only used at auto-start; here we
     always go straight to getDisplayMedia so the dialog appears reliably.
  ────────────────────────────────────────────────────────────────────────────── */
  const enableMeetingAudio = async () => {
    if (systemAudioOn || sysAudioLoading) return
    setSysAudioError('')
    setSysAudioLoading(true)

    try {
      /* ── Step 1: Show Chrome's audio-source picker ──────────────────────────
         This is a browser-enforced security dialog. Your SCREEN IS NOT recorded —
         we immediately discard the video track and only keep the audio stream.

         Hints passed to Chrome:
           displaySurface:'monitor'     → opens on "Entire Screen" tab by default
           systemAudio:'include'        → pre-checks "Also share system audio"
           selfBrowserSurface:'exclude' → hides this app tab from the list        */
      let disp
      try {
        disp = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'monitor', width: 1, height: 1, frameRate: 1 },
          audio: { suppressLocalAudioPlayback: false, echoCancellation: false, noiseSuppression: false },
          systemAudio:        'include',   // pre-check "Also share system audio"
          selfBrowserSurface: 'exclude',   // hide this tab
          surfaceSwitching:   'include',
        })
      } catch (e) {
        if (e.name !== 'NotAllowedError') {
          setSysAudioError('Could not open audio picker: ' + e.message)
        }
        return   // user cancelled — silent
      }

      // ⚡ Drop video immediately — screen content is NEVER recorded or sent anywhere
      disp.getVideoTracks().forEach(t => t.stop())

      const audioTracks = disp.getAudioTracks()
      if (!audioTracks.length) {
        disp.getTracks().forEach(t => t.stop())
        setSysAudioError(
          'No audio captured. ' +
          'For Zoom / Meet in browser → pick the Chrome Tab → Share. ' +
          'For Zoom desktop app → pick "Entire screen" → turn ON "Also share system audio" → Share.'
        )
        return
      }

      /* ── Step 2: Store the stream ── */
      sysStreamRef.current = disp
      setSystemAudioOn(true)

      // Auto-cleanup when the user stops sharing (closes the dialog bar)
      audioTracks[0].addEventListener('ended', stopSystemAudio)

      /* ── Step 3: If recording is live, restart Deepgram with the new stream ── */
      if (isRecordingRef.current) {
        stopDeepgram()
        await new Promise(r => setTimeout(r, 200))
        await startDeepgram()
      }
      // If not yet recording, the stream is stored in sysStreamRef and
      // startDeepgram() will pick it up when the user clicks Start Recording.

    } finally {
      setSysAudioLoading(false)
    }
  }

  /* ── Deepgram live transcription — dual-stream multilingual ──────────────────
     WHY DUAL STREAM:
       Deepgram's language=multi only covers English+Spanish code-switching.
       Hindi and Marathi are NOT included in multi mode.
       Solution: run two parallel WebSocket connections simultaneously —
         • wsEn  →  nova-2  language=en   (English)
         • wsHi  →  nova-2  language=hi   (Hindi + Marathi share Devanagari script)
       Both receive the same audio; results are merged with confidence-based
       deduplication so each spoken utterance appears exactly once.
     API key : set VITE_DEEPGRAM_API_KEY in .env
  ──────────────────────────────────────────────────────────────────────────── */

  const lastCommitRef = useRef({ text: '', time: 0 })   // dedup across two sockets

  const stopDeepgram = () => {
    // Stop both MediaRecorders
    for (const mrRef of [mediaRecorderRef, meetMediaRecorderRef]) {
      try { mrRef.current?.stop() } catch (_) {}
      mrRef.current = null
    }
    // Close all sockets
    if (deepgramRef.current) {
      const closeWs = (ws) => {
        if (!ws) return
        try {
          if (ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: 'CloseStream' }))
          ws.close()
        } catch (_) {}
      }
      const { wsMicEn, wsMicHi, wsMeetEn, wsMeetHi } = deepgramRef.current
      closeWs(wsMicEn); closeWs(wsMicHi)
      closeWs(wsMeetEn); closeWs(wsMeetHi)
      deepgramRef.current = null
    }
    setInterimText('')
  }

  const startDeepgram = async () => {
    if (deepgramRef.current) return

    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY
    if (!apiKey || apiKey === 'your_deepgram_api_key_here') {
      console.warn('[Deepgram] No API key — falling back to Web Speech API')
      startWebSpeechFallback()
      return
    }

    try {
      /* ── 1. Mic stream ── */
      const audioConstraints = selectedDeviceIdRef.current
        ? { deviceId: { exact: selectedDeviceIdRef.current } }
        : true
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false })
      micStreamRef.current = micStream

      /* ── 2. AudioContext for energy analysis only (no mixer needed) ── */
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const micSrc = ctx.createMediaStreamSource(micStream)
      const micAn  = ctx.createAnalyser(); micAn.fftSize = 256
      micSrc.connect(micAn)
      micAnalyserRef.current = micAn

      /* ── 3. Meeting tab audio ────────────────────────────────────────────────
         Priority A: stream already captured by enableMeetingAudio() (pre-stored)
         Priority B: try extension tabCapture silently (auto on recording start)
         Priority C: none — mic only (user can enable via toggle later)           */
      let meetStream = sysStreamRef.current   // reuse pre-captured stream if available

      if (!meetStream) {
        const meetAudio = await requestMeetingAudioStreamId()
        if (meetAudio?.streamId) {
          try {
            meetStream = await navigator.mediaDevices.getUserMedia({
              audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: meetAudio.streamId } },
              video: false,
            })
            sysStreamRef.current = meetStream
            console.log('[Audio] ✅ Auto meeting tab captured:', meetAudio.meetTabTitle)
          } catch (err) {
            console.warn('[Audio] tabCapture getUserMedia failed:', err.message)
            meetStream = null
          }
        }
      }

      if (meetStream) {
        const sysSrc = ctx.createMediaStreamSource(meetStream)
        const sysAn  = ctx.createAnalyser(); sysAn.fftSize = 256
        sysSrc.connect(sysAn)
        sysAnalyserRef.current = sysAn
        setSystemAudioOn(true)
        meetStream.getAudioTracks()[0]?.addEventListener('ended', stopSystemAudio)
      } else {
        console.log('[Audio] No meeting audio — mic only (use toggle to enable)')
      }

      /* ── 4. Deepgram WebSocket factory ── */
      const makeDGSocket = (lang, withDiarize) => {
        const params = new URLSearchParams({
          model:            'nova-2',
          language:         lang,
          smart_format:     'true',
          interim_results:  'true',
          punctuate:        'true',
          utterance_end_ms: '1000',
          vad_events:       'true',
          ...(withDiarize && { diarize: 'true' }),
        })
        const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ['token', apiKey])
        ws.binaryType = 'arraybuffer'
        return ws
      }

      /* Mic sockets — no diarize needed, source = always "You" */
      const wsMicEn = makeDGSocket('en', false)
      const wsMicHi = makeDGSocket('hi', false)

      /* Meeting sockets — diarize to number remote speakers (Speaker 1, 2 …) */
      const wsMeetEn = meetStream ? makeDGSocket('en', true) : null
      const wsMeetHi = meetStream ? makeDGSocket('hi', true) : null

      deepgramRef.current = { wsMicEn, wsMicHi, wsMeetEn, wsMeetHi }

      /* ── 5. Start MediaRecorders once the right sockets are all open ── */
      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm'             :
        MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')  ? 'audio/ogg;codecs=opus'  : ''
      const makeMR = (stream) =>
        mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)

      // Mic MediaRecorder — starts when both mic sockets are open
      let micOpenCount = 0
      const onMicOpen = (label) => () => {
        console.log(`[Deepgram MIC-${label}] ✅ connected`)
        if (++micOpenCount < 2) return
        const mr = makeMR(micStream)
        mediaRecorderRef.current = mr
        mr.addEventListener('dataavailable', (e) => {
          if (e.data.size === 0 || isPausedRef.current) return
          if (wsMicEn.readyState === WebSocket.OPEN) wsMicEn.send(e.data)
          if (wsMicHi.readyState === WebSocket.OPEN) wsMicHi.send(e.data)
        })
        mr.start(250)
      }
      wsMicEn.onopen = onMicOpen('EN')
      wsMicHi.onopen = onMicOpen('HI')

      // Meeting MediaRecorder — starts when both meeting sockets are open
      if (wsMeetEn && wsMeetHi && meetStream) {
        let meetOpenCount = 0
        const onMeetOpen = (label) => () => {
          console.log(`[Deepgram MEET-${label}] ✅ connected`)
          if (++meetOpenCount < 2) return
          const mr = makeMR(meetStream)
          meetMediaRecorderRef.current = mr
          mr.addEventListener('dataavailable', (e) => {
            if (e.data.size === 0 || isPausedRef.current) return
            if (wsMeetEn.readyState === WebSocket.OPEN) wsMeetEn.send(e.data)
            if (wsMeetHi.readyState === WebSocket.OPEN) wsMeetHi.send(e.data)
          })
          mr.start(250)
        }
        wsMeetEn.onopen = onMeetOpen('EN')
        wsMeetHi.onopen = onMeetOpen('HI')
      }

      /* ── 6. Transcript message handler ── */
      /**
       * source: 'mic'  → always "You"        (SPEECH_SPEAKERS[0])
       * source: 'meet' → Speaker 1 / 2 / 3   (SPEECH_SPEAKERS[1..4] by diarize offset)
       */
      const onMessage = (source, label) => (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data?.type !== 'Results') return

          const alt        = data?.channel?.alternatives?.[0]
          const transcript = alt?.transcript?.trim()
          const confidence = alt?.confidence ?? 0
          if (!transcript || confidence < 0.80) return

          if (data.is_final) {
            const now  = Date.now()
            const last = lastCommitRef.current
            if (last.text === transcript && now - last.time < 1000) return   // dedup
            lastCommitRef.current = { text: transcript, time: now }

            const displayText = transliterate(transcript)

            let sp
            if (source === 'mic') {
              /* ── Mic source → always "You" ── */
              sp = SPEECH_SPEAKERS[0]
            } else {
              /* ── Meeting source → Speaker 1, 2, 3 … by diarization ── */
              // Deepgram speaker 0 maps to SPEECH_SPEAKERS[1] ("Speaker 1"), etc.
              sp = SPEECH_SPEAKERS[1]   // default for meeting audio
              const words = alt?.words ?? []
              if (words.length > 0 && words[0]?.speaker !== undefined) {
                const counts = {}
                words.forEach(w => { counts[w.speaker] = (counts[w.speaker] || 0) + 1 })
                const dgNum = Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0])
                // offset by 1 so meeting speaker 0 → index 1 ("Speaker 1")
                const idx = Math.min(dgNum + 1, SPEECH_SPEAKERS.length - 1)
                sp = SPEECH_SPEAKERS[idx]
              }
            }

            setRecLines(prev => [...prev, {
              id: `${now}-${Math.random()}`,
              speaker: sp.id, initials: sp.initials, color: sp.color,
              text: displayText,
            }])
            setInterimText('')
          } else {
            const displayInterim = transliterate(transcript)
            setInterimText(prev =>
              label === 'HI' ? displayInterim : (prev || displayInterim)
            )
          }
        } catch (_) {}
      }

      wsMicEn.onmessage  = onMessage('mic',  'EN')
      wsMicHi.onmessage  = onMessage('mic',  'HI')
      if (wsMeetEn) wsMeetEn.onmessage = onMessage('meet', 'EN')
      if (wsMeetHi) wsMeetHi.onmessage = onMessage('meet', 'HI')

      /* ── 7. Errors + auto-reconnect ── */
      const onErr = (lbl) => (e) => console.error(`[Deepgram ${lbl}] ❌`, e)
      wsMicEn.onerror = onErr('MIC-EN'); wsMicHi.onerror = onErr('MIC-HI')
      if (wsMeetEn) wsMeetEn.onerror = onErr('MEET-EN')
      if (wsMeetHi) wsMeetHi.onerror = onErr('MEET-HI')

      const onClose = (lbl) => (e) => {
        console.warn(`[Deepgram ${lbl}] closed:`, e.code, e.reason)
        if (isRecordingRef.current && !isPausedRef.current && micStreamRef.current) {
          deepgramRef.current         = null
          mediaRecorderRef.current    = null
          meetMediaRecorderRef.current = null
          setTimeout(() => startDeepgram(), 1500)
        }
      }
      wsMicEn.onclose = onClose('MIC-EN'); wsMicHi.onclose = onClose('MIC-HI')
      if (wsMeetEn) wsMeetEn.onclose = onClose('MEET-EN')
      if (wsMeetHi) wsMeetHi.onclose = onClose('MEET-HI')

    } catch (e) {
      console.warn('[Deepgram] start failed:', e.message)
      startWebSpeechFallback()
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
  /* ── PiP: open (must be called inside a user-gesture handler) ── */
  /* ── Open Document PiP window ───────────────────────────────────────────
     requestWindow() is allowed from:
       • direct user-gesture handlers (sidebar clicks, modal confirm)
       • visibilitychange events (Chrome allows this — same mechanism Google Meet uses)
  ────────────────────────────────────────────────────────────────────────── */
  const openPiP = async () => {
    if (!window.documentPictureInPicture) return
    if (pipWindowRef.current) return
    try {
      const pipWin = await window.documentPictureInPicture.requestWindow({
        width: 230, height: 120,
        disallowReturnToOpener: false,
      })
      pipWin.document.documentElement.style.cssText = 'margin:0;padding:0;width:100%;height:100%;'
      pipWin.document.body.style.cssText =
        'margin:0;padding:0;width:100%;height:100%;overflow:hidden;' +
        'background:linear-gradient(135deg,#1E1130 0%,#150C26 100%);' +
        'display:flex;align-items:center;justify-content:center;'
      ;[...document.querySelectorAll('link[rel=stylesheet],style')].forEach(el => {
        try { pipWin.document.head.appendChild(el.cloneNode(true)) } catch (_) {}
      })
      pipWin.addEventListener('pagehide', () => { pipWindowRef.current = null; setPipOpen(false) })
      pipWindowRef.current = pipWin
      setPipOpen(true)
    } catch (e) { console.warn('PiP open failed:', e.name, e.message) }
  }

  const closePiP = () => {
    try { pipWindowRef.current?.close() } catch (_) {}
    pipWindowRef.current = null
    setPipOpen(false)
  }

  /* ── Visibility-based PiP — the Google Meet pattern ─────────────────────
     Chrome fires visibilitychange with sufficient activation to call
     requestWindow(). When the user switches to any other tab, window, or app
     the event fires with document.hidden = true → we open PiP.
     When the user returns and is on the transcription screen → we close PiP.
  ────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const onVisibility = async () => {
      if (!isRecordingRef.current) return
      if (document.hidden) {
        // User left this tab / switched to another app
        if (!pipWindowRef.current) await openPiP()
      } else {
        // User returned to this tab — close PiP only if on transcription screen
        if (pageRef.current === 'dashboard') closePiP()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-close PiP when user navigates back to transcription screen ─────
     Covers all in-app paths back to dashboard (navToDashboard, project-start
     setup, recovery, etc.) when the tab is already in the foreground.
  ────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (page === 'dashboard' && !document.hidden) closePiP()
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Navigation ──────────────────────────────────────────────────────────
     In-app navigation away from dashboard is itself a user gesture (click),
     so requestWindow() is allowed directly in these handlers.
  ────────────────────────────────────────────────────────────────────────── */
  const navToProject = (id) => {
    setActiveProjectId(id)
    setPage('project')
    if (isRecordingRef.current && !pipWindowRef.current) openPiP()
  }
  const navToMeeting = (id) => {
    setActiveMeetingId(id)
    setPage('meeting')
    if (isRecordingRef.current && !pipWindowRef.current) openPiP()
  }
  const navToDashboard = () => setPage('dashboard')

  /* ── Workspace page navigation ── */
  const navToWorkspacePage = (id) => {
    setActiveWorkspacePageId(id)
    setPage('workspacePage')
  }

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
    speakerEnergy.current  = { micSum: 0, sysSum: 0, n: 0 }
    // Close AudioContext and clear mixer
    try { audioCtxRef.current?.close() } catch (_) {}
    audioCtxRef.current  = null
    currentSpeaker.current = 0
    setIsRecording(false); setIsPaused(false)
    setRecSeconds(0); setRecLines([]); setRecProject(null); setInterimText('')
  }

  const handleEndRecording = () => {
    isRecordingRef.current = false    // zero immediately so navToProject won't reopen PiP
    closePiP()                        // close PiP before navigation
    const meeting = buildMeeting()
    const pid     = recProject.id
    setMeetings(prev => [meeting, ...prev])
    fsSaveMeeting(currentUser?.uid, meeting)   // persist to Firestore
    clearRecording()
    navToProject(pid)
  }


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

  /* ── Open recording setup modal — replaces the old direct startRecording ── */
  const openRecordingSetup = (project) => {
    setSetupProject(project)
  }

  /* ── Called when user clicks "Start Recording" inside the setup modal ──────
     This is still within the user-gesture context of the button click, so
     both getUserMedia and getDisplayMedia will be allowed.
  ──────────────────────────────────────────────────────────────────────────── */
  const confirmStartRecording = ({ project, deviceId }) => {
    // Store selected mic device ID for startDeepgram
    selectedDeviceIdRef.current = deviceId || null
    setSelectedMicId(deviceId || null)
    setSetupProject(null)   // close modal

    // Reset recording state
    currentSpeaker.current = 0
    speakerEnergy.current  = { micSum: 0, sysSum: 0, n: 0 }
    setRecProject(project)
    isRecordingRef.current = true   // sync immediately — don't wait for React render
    isPausedRef.current    = false  // sync immediately
    setIsRecording(true)
    setIsPaused(false)
    setRecSeconds(0)
    setRecLines([])
    setInterimText('')

    // Meeting audio is captured automatically inside startDeepgram()
    // via Chrome Extension tabCapture — no screen-share dialog needed.
  }

  const openRecordingSetupFromProject = (project) => {
    setPage('dashboard')
    setSetupProject(project)
  }

  /* ── Recovery resume — also within a user gesture ── */
  const handleResumeRecovery = () => {
    const d = recoveryData
    setRecProject(d.project); setRecSeconds(d.seconds ?? 0)
    isRecordingRef.current = true   // sync immediately
    isPausedRef.current    = false  // sync immediately
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
      fsSaveMeeting(currentUser?.uid, meeting)  // persist recovered meeting
      // Clear recovery and start fresh recording in same project
      localStorage.removeItem(AUTOSAVE_KEY)
      setRecoveryData(null)
      startRecording(d.project)
    }
  }

  const handleUpdateMeeting = (updated) => {
    setMeetings(prev => prev.map(m => m.id === updated.id ? updated : m))
    fsSaveMeeting(currentUser?.uid, updated)   // persist edits (title, summary, etc.)
  }

  const handleDeleteMeeting = (id) => {
    setMeetings(prev => prev.filter(m => m.id !== id))
    fsDeleteMeeting(currentUser?.uid, id)
  }

  const handleDeleteWorkspacePage = (id) => {
    setWorkspacePages(prev => prev.filter(p => p.id !== id))
    fsDeleteWorkspacePage(currentUser?.uid, id)
  }

  const handleCreateProject = () => {
    const id      = Date.now()
    const project = { id, name: 'New Project', color: '#7133AE' }
    setProjects(prev => [...prev, project])
    fsSaveProject(currentUser?.uid, project)   // persist to Firestore
    return id
  }

  const handleUpdateProjectDescription = (id, description) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== id) return p
      const updated = { ...p, description }
      fsSaveProject(currentUser?.uid, updated)
      return updated
    }))
  }

  const handleRenameProject = (id, newName) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== id) return p
      const updated = { ...p, name: newName }
      fsSaveProject(currentUser?.uid, updated)  // persist rename
      return updated
    }))
    // Also update projectName on all meetings that belong to this project
    setMeetings(prev => prev.map(m => {
      if (m.projectId !== id) return m
      const updated = { ...m, projectName: newName }
      fsSaveMeeting(currentUser?.uid, updated)
      return updated
    }))
  }

  const handleDeleteProject = (id) => {
    // Capture the current meetings list before state update for Firestore batch delete
    const currentMeetings = meetings
    setProjects(prev => prev.filter(p => p.id !== id))
    setMeetings(prev => prev.filter(m => m.projectId !== id))
    fsDeleteProject(currentUser?.uid, id, currentMeetings)  // delete from Firestore
    if (activeProjectId === id) navToDashboard()
  }

  /* ── Workspace handlers ────────────────────────────────────────────────────── */
  /** Called from WorkspaceTab inside ProjectPage — projectId is the active project */
  const handleCreateWorkspaceFolder = () => {
    const id     = Date.now()
    const folder = { id, projectId: activeProjectId, name: 'New Folder', createdAt: new Date().toISOString() }
    setWorkspaceFolders(prev => [...prev, folder])
    fsSaveWorkspaceFolder(currentUser?.uid, folder)
    return id
  }

  const handleRenameWorkspaceFolder = (id, newName) => {
    setWorkspaceFolders(prev => prev.map(f => {
      if (f.id !== id) return f
      const updated = { ...f, name: newName }
      fsSaveWorkspaceFolder(currentUser?.uid, updated)
      return updated
    }))
  }

  const handleDeleteWorkspaceFolder = (id) => {
    const currentPages = workspacePages
    setWorkspaceFolders(prev => prev.filter(f => f.id !== id))
    setWorkspacePages(prev => prev.filter(p => p.folderId !== id))
    fsDeleteWorkspaceFolder(currentUser?.uid, id, currentPages)
  }

  /** folderId is passed from WorkspaceTab when user clicks "New Page" inside a folder */
  const handleCreateWorkspacePage = (folderId) => {
    const id   = Date.now()
    const pg   = {
      id,
      folderId,
      projectId: activeProjectId,
      title:     'Untitled',
      content:   '',
      updatedAt: new Date().toISOString(),
    }
    setWorkspacePages(prev => [...prev, pg])
    fsSaveWorkspacePage(currentUser?.uid, pg)
    return id
  }

  const handleUpdateWorkspacePage = (updated) => {
    setWorkspacePages(prev => prev.map(p => p.id === updated.id ? updated : p))
    fsSaveWorkspacePage(currentUser?.uid, updated)
  }

  const activeProject       = projects.find(p => p.id === activeProjectId)
  const activeMeeting       = meetings.find(m => m.id === activeMeetingId)
  const projectMeetings     = meetings.filter(m => m.projectId === activeProjectId)
  const activeWorkspacePage = workspacePages.find(p => p.id === activeWorkspacePageId)
  const activeWorkspaceFolder = activeWorkspacePage
    ? workspaceFolders.find(f => f.id === activeWorkspacePage.folderId)
    : null

  /* ── While Firebase checks the cached session — show nothing (avoids flash) ── */
  if (!authChecked) return null

  /* ── Loading screen — shown while Firestore data is being fetched ── */
  if (dataLoading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', gap: 16,
    }}>
      {/* Spinner */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid #e5e7eb',
        borderTopColor: '#7133AE',
        animation: 'spin 0.75s linear infinite',
      }} />
      <p style={{ color: '#6b7280', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
        Loading your workspace…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <>
      {page === 'login' && <LoginPage />}

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
          onStartRecording={openRecordingSetup}
          systemAudioOn={systemAudioOn}
          sysAudioError={sysAudioError}
          onClearSysAudioError={() => setSysAudioError('')}
          onStopSystemAudio={stopSystemAudio}
          onEnableSystemAudio={enableMeetingAudio}
          sysAudioLoading={sysAudioLoading}
          micDevices={micDevices}
          selectedMicId={selectedMicId}
          onChangeMic={changeMic}
          onRefreshMicDevices={refreshMicDevices}
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
          currentUser={currentUser}
          onSignOut={signOutUser}
          waveHeights={waveHeights}
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
          onStartRecording={openRecordingSetupFromProject}
          onCreateProject={handleCreateProject}
          onRenameProject={handleRenameProject}
          onDeleteProject={handleDeleteProject}
          onUpdateDescription={handleUpdateProjectDescription}
          workspaceFolders={workspaceFolders}
          workspacePages={workspacePages}
          onCreateWorkspaceFolder={handleCreateWorkspaceFolder}
          onRenameWorkspaceFolder={handleRenameWorkspaceFolder}
          onDeleteWorkspaceFolder={handleDeleteWorkspaceFolder}
          onNavigateToWorkspacePage={navToWorkspacePage}
          onCreateWorkspacePage={handleCreateWorkspacePage}
          onUpdateWorkspacePage={handleUpdateWorkspacePage}
          onDeleteMeeting={handleDeleteMeeting}
          onDeleteWorkspacePage={handleDeleteWorkspacePage}
          currentUser={currentUser}
          onSignOut={signOutUser}
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
          currentUser={currentUser}
          onSignOut={signOutUser}
          waveHeights={waveHeights}
        />
      )}

      {page === 'workspacePage' && (
        <WorkspacePageEditor
          page={activeWorkspacePage}
          folder={activeWorkspaceFolder}
          project={activeProject}
          projects={projects}
          onBack={() => navToProject(activeProjectId)}
          onUpdatePage={handleUpdateWorkspacePage}
          onNavigateToProject={navToProject}
          onNavigateToDashboard={navToDashboard}
          onCreateProject={handleCreateProject}
          onRenameProject={handleRenameProject}
          onDeleteProject={handleDeleteProject}
          currentUser={currentUser}
          onSignOut={signOutUser}
        />
      )}

      {/* Document PiP overlay — cross-tab, cross-app floating controls.
           Opens automatically when user navigates away from transcription screen.
           Closes automatically when user returns to transcription screen.
           Never rendered while user is on the transcription screen. */}
      <PiPWidget
        isOpen={pipOpen}
        pipWindowRef={pipWindowRef}
        seconds={recSeconds}
        isPaused={isPaused}
        waveHeights={waveHeights}
        onPause={() => setIsPaused(true)}
        onResume={() => setIsPaused(false)}
        onStop={handleEndRecording}
        onReturn={() => { navToDashboard(); window.focus() }}
      />

      {/* Recording setup modal — mic selection + system audio toggle */}
      {setupProject && (
        <RecordingSetupModal
          project={setupProject}
          onStart={confirmStartRecording}
          onCancel={() => setSetupProject(null)}
          systemAudioOn={systemAudioOn}
          sysAudioLoading={sysAudioLoading}
          sysAudioError={sysAudioError}
          onEnableSystemAudio={enableMeetingAudio}
          onStopSystemAudio={stopSystemAudio}
          onClearSysAudioError={() => setSysAudioError('')}
        />
      )}
    </>
  )
}
