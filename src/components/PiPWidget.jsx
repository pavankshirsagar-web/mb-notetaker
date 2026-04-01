import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pause, Play, Square } from 'lucide-react'

function fmt(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

/* 6 bars — staggered delays give a natural-looking waveform */
const BARS = [
  { delay: '0s',     h: 10 },
  { delay: '0.15s',  h: 18 },
  { delay: '0.08s',  h: 13 },
  { delay: '0.25s',  h: 20 },
  { delay: '0.32s',  h: 11 },
  { delay: '0.18s',  h: 16 },
]

/* ── PiP pill rendered into the Document PiP window via a React portal ──── */
function PiPContent({ seconds, isPaused, onPause, onResume, onStop, onReturn }) {
  return (
    /* Clicking the outer wrapper (not the buttons) returns to transcription */
    <div
      onClick={onReturn}
      className="w-full h-full flex items-center justify-center cursor-pointer"
    >
      <div
        onClick={e => e.stopPropagation()}
        className={[
          'flex items-center gap-1.5 px-2.5 py-1.5',
          'rounded-[14px] border border-white/[.12]',
          'shadow-[0_8px_32px_rgba(0,0,0,.5)]',
          isPaused ? '' : 'outline outline-1 outline-red-500/40',
        ].filter(Boolean).join(' ')}
      >
        {/* Live waveform — bars animate while recording, freeze while paused */}
        <div className="flex items-end gap-[2px]" style={{ height: 20 }}>
          {BARS.map(({ delay, h }, i) => (
            <span
              key={i}
              className={isPaused ? 'wave-bar' : 'wave-bar'}
              style={{
                animationDelay: delay,
                height: h,
                width: 3,
                borderRadius: 2,
                background: isPaused ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)',
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-[18px] bg-white/[.08] shrink-0" />

        {/* Timer */}
        <span className="text-[15px] font-bold tracking-[.06em] tabular-nums text-white min-w-[46px] text-center shrink-0">
          {fmt(seconds)}
        </span>

        {/* Divider */}
        <div className="w-px h-[18px] bg-white/[.08] shrink-0" />

        {/* Pause / Resume */}
        <button
          onClick={e => { e.stopPropagation(); isPaused ? onResume() : onPause() }}
          title={isPaused ? 'Resume' : 'Pause'}
          className="flex items-center justify-center size-[30px] rounded-lg bg-white/[.08] text-white/80 border-0 cursor-pointer hover:bg-white/[.16] transition-colors shrink-0"
        >
          {isPaused ? <Play size={13} /> : <Pause size={13} />}
        </button>

        {/* Stop */}
        <button
          onClick={e => { e.stopPropagation(); onStop() }}
          title="Stop recording"
          className="flex items-center justify-center size-[30px] rounded-lg bg-red-500/25 text-red-300 border-0 cursor-pointer hover:bg-red-500/45 transition-colors shrink-0"
        >
          <Square size={11} className="fill-red-300" strokeWidth={0} />
        </button>
      </div>
    </div>
  )
}

/* ── Wrapper — mounts/unmounts the portal when PiP window opens/closes ───── */
export default function PiPWidget({
  isOpen, pipWindowRef,
  seconds, isPaused,
  onPause, onResume, onStop, onReturn,
}) {
  const [pipBody, setPipBody] = useState(null)

  useEffect(() => {
    if (isOpen && pipWindowRef.current) {
      setPipBody(pipWindowRef.current.document.body)
    } else {
      setPipBody(null)
    }
  }, [isOpen, pipWindowRef])

  if (!pipBody) return null

  return createPortal(
    <PiPContent
      seconds={seconds}
      isPaused={isPaused}
      onPause={onPause}
      onResume={onResume}
      onStop={onStop}
      onReturn={onReturn}
    />,
    pipBody,
  )
}
