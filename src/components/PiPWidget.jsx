import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pause, Play, Square } from 'lucide-react'

function fmt(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

/* Maps a raw analyser value (0-255) to a pixel height for the PiP mini-waveform.
   Container is 20 px tall; bars range from 3 px (silence) to 17 px (peak). */
const toPipBarHeight = (v) => Math.max(3, Math.round(3 + (v / 255) * 14))

/* ── PiP pill rendered into the Document PiP window via a React portal ──── */
function PiPContent({ seconds, isPaused, waveHeights, onPause, onResume, onStop, onReturn }) {
  /* Pick 6 evenly-spaced bars from the 20-bar waveHeights array */
  const PIP_BAR_COUNT = 6
  const heights = waveHeights ?? Array(PIP_BAR_COUNT).fill(0)
  const step    = Math.max(1, Math.floor(heights.length / PIP_BAR_COUNT))
  const bars    = Array.from({ length: PIP_BAR_COUNT }, (_, i) => heights[i * step] ?? 0)

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
        {/* Live waveform — heights driven by real mic audio data */}
        <div className="flex items-end gap-[2px]" style={{ height: 20 }}>
          {bars.map((v, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                width: 3,
                borderRadius: 2,
                height: toPipBarHeight(v),
                background: isPaused ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)',
                transition: 'height 80ms ease-out',
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
  seconds, isPaused, waveHeights,
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
      waveHeights={waveHeights}
      onPause={onPause}
      onResume={onResume}
      onStop={onStop}
      onReturn={onReturn}
    />,
    pipBody,
  )
}
