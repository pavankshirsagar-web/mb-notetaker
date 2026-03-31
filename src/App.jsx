import { useState, useEffect, useRef } from 'react'
import FloatingRecordingWidget   from './components/FloatingRecordingWidget'
import RecordingSetupModal       from './components/RecordingSetupModal'
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
      /* ── Step 1: Show tab-picker dialog (user just clicked = user gesture ✅) ── */
      let disp
      try {
        disp = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1, height: 1, frameRate: 1 },  // Chrome requires video:true
          audio: true,
        })
      } catch (e) {
        // NotAllowedError = user cancelled the dialog — no error message needed
        if (e.name !== 'NotAllowedError') {
          setSysAudioError('Could not open sharing dialog: ' + e.message)
        }
        return
      }

      // Drop the video track immediately — we only needed it to open the dialog
      disp.getVideoTracks().forEach(t => t.stop())

      const audioTracks = disp.getAudioTracks()
      if (!audioTracks.length) {
        disp.getTracks().forEach(t => t.stop())
        setSysAudioError('No audio captured — in the dialog select the Chrome Tab and check ✅ "Share tab audio"')
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
    speakerEnergy.current  = { micSum: 0, sysSum: 0, n: 0 }
    // Close AudioContext and clear mixer
    try { audioCtxRef.current?.close() } catch (_) {}
    audioCtxRef.current  = null
    currentSpeaker.current = 0
    setIsRecording(false); setIsPaused(false)
    setRecSeconds(0); setRecLines([]); setRecProject(null); setInterimText('')
  }

  const handleEndRecording = () => {
    const meeting = buildMeeting()
    const pid     = recProject.id
    setMeetings(prev => [meeting, ...prev])
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
    setSetupProject(null)   // close modal

    // Reset recording state
    currentSpeaker.current = 0
    speakerEnergy.current  = { micSum: 0, sysSum: 0, n: 0 }
    setRecProject(project)
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
          onStartRecording={openRecordingSetup}
          systemAudioOn={systemAudioOn}
          sysAudioError={sysAudioError}
          onClearSysAudioError={() => setSysAudioError('')}
          onStopSystemAudio={stopSystemAudio}
          onEnableSystemAudio={enableMeetingAudio}
          sysAudioLoading={sysAudioLoading}
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
          onStartRecording={openRecordingSetupFromProject}
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

      {/* Floating widget — shown when recording and user navigates away from dashboard */}
      {isRecording && page !== 'dashboard' && (
        <FloatingRecordingWidget
          seconds={recSeconds}
          isPaused={isPaused}
          onPause={() => setIsPaused(true)}
          onResume={() => setIsPaused(false)}
          onStop={handleEndRecording}
          onReturn={navToDashboard}
        />
      )}

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
