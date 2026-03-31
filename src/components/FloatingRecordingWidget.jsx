import { useState, useEffect, useRef } from 'react'
import { Pause, Play, Square, ArrowUpRight, GripHorizontal } from 'lucide-react'

function fmt(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

const iconBtn = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30, borderRadius: 8, border: 'none',
  cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s',
}

export default function FloatingRecordingWidget({
  seconds, isPaused,
  onPause, onResume, onStop, onReturn,
}) {
  const [pos, setPos] = useState(() => ({
    x: window.innerWidth  - 340,
    y: window.innerHeight - 80,
  }))
  const dragRef = useRef({ active: false, ox: 0, oy: 0 })

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.active) return
      setPos({
        x: Math.max(8, Math.min(window.innerWidth  - 332, e.clientX - dragRef.current.ox)),
        y: Math.max(8, Math.min(window.innerHeight - 56,  e.clientY - dragRef.current.oy)),
      })
    }
    const onUp = () => { dragRef.current.active = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [])

  const onDragStart = (e) => {
    if (e.target.closest('button')) return
    dragRef.current = { active: true, ox: e.clientX - pos.x, oy: e.clientY - pos.y }
    e.preventDefault()
  }

  return (
    <div
      onMouseDown={onDragStart}
      style={{
        position: 'fixed', left: pos.x, top: pos.y,
        zIndex: 9999, userSelect: 'none', cursor: 'grab',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'linear-gradient(135deg, #1E1130 0%, #150C26 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14,
          padding: '6px 10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          outline: isPaused ? 'none' : '1px solid rgba(220,38,38,0.4)',
          outlineOffset: -1,
        }}
      >
        {/* Drag handle + status dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingRight: 4 }}>
          <GripHorizontal size={12} style={{ color: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />
          <span
            className={isPaused ? '' : 'pulse-dot'}
            style={{
              display: 'block', width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              backgroundColor: isPaused ? 'rgba(255,255,255,0.25)' : '#EF4444',
            }}
          />
        </div>

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
        <button
          onClick={isPaused ? onResume : onPause}
          title={isPaused ? 'Resume' : 'Pause'}
          style={{ ...iconBtn, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
        >
          {isPaused ? <Play size={13} /> : <Pause size={13} />}
        </button>

        {/* Stop */}
        <button
          onClick={onStop}
          title="Stop recording"
          style={{ ...iconBtn, background: 'rgba(220,38,38,0.25)', color: '#fca5a5' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.45)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.25)' }}
        >
          <Square size={11} fill="#fca5a5" strokeWidth={0} />
        </button>

        {/* Return to recording */}
        <button
          onClick={onReturn}
          title="Return to recording"
          style={{ ...iconBtn, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
        >
          <ArrowUpRight size={13} />
        </button>
      </div>
    </div>
  )
}
