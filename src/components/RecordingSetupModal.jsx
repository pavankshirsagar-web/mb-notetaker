import { useState, useEffect } from 'react'
import { Mic, Headphones, Laptop, Speaker, MonitorSpeaker, X, Radio, CheckCircle2, Users } from 'lucide-react'

/* ── Detect device type from browser label string ──────────────────────────
   NOTE: 'Realtek' / 'HD Audio' / 'High Definition Audio' are DRIVER names,
   NOT location identifiers — they appear on BOTH the built-in mic AND the
   headphone jack. Never use them alone as a built-in signal.
────────────────────────────────────────────────────────────────────────────── */
function classifyMic(label = '', allLabels = []) {
  const l = label.toLowerCase()

  /* ── 1. Definite System Default ── */
  if (l === 'default' || l === 'communications' || l.startsWith('default -'))
    return { icon: Speaker, badge: 'System Default', color: '#9ca3af' }

  /* ── 2. Definite Headphones / Headset ──
     "headset" covers wired headphones (e.g. "Headset Microphone (Realtek Audio)")
     Wireless brands (AirPods, Sony, Bose, JBL, Jabra …) also included.        */
  if (
    l.includes('headset')   || l.includes('headphone') ||
    l.includes('airpod')    || l.includes('earbud')    ||
    l.includes('earphone')  || l.includes('bluetooth') ||
    l.includes('wireless')  || l.includes('beats')     ||
    l.includes('sony')      || l.includes('bose')      ||
    l.includes('jabra')     || l.includes('sennheiser') ||
    l.includes('plantronics')|| l.includes('logitech headset')
  ) return { icon: Headphones, badge: 'Headphones', color: '#6366F1' }

  /* ── 3. Definite Built-in ──
     "array" = microphone array (always soldered on laptop motherboard)
     Spatial words: internal, built-in, integrated, laptop, macbook, pc mic  */
  if (
    l.includes('built-in')   || l.includes('internal')  ||
    l.includes('integrated') || l.includes('laptop')    ||
    l.includes('macbook')    || l.includes('array')      ||
    l.includes('pc mic')     || l.includes('onboard')
  ) return { icon: Laptop, badge: 'Built-in', color: '#7133AE' }

  /* ── 4. Definite External / USB mic ── */
  if (
    l.includes('usb')       || l.includes('external')  ||
    l.includes('condenser') || l.includes('studio')    ||
    l.includes('yeti')      || l.includes('snowball')  ||
    l.includes('blue')      || l.includes('rode')      ||
    l.includes('at2020')    || l.includes('audio-technica')
  ) return { icon: Mic, badge: 'External', color: '#0891B2' }

  /* ── 5. Ambiguous label (e.g. "Microphone (Realtek Audio)") ──
     Heuristic: if there is already a clearly-identified built-in device in the
     list this one is probably an external/headphone input (the 3.5 mm jack).
     Otherwise fall back to "Built-in" guess for the first real device.         */
  const hasKnownBuiltIn = allLabels.some(other => {
    const o = other.toLowerCase()
    return (
      o.includes('built-in') || o.includes('internal') || o.includes('integrated') ||
      o.includes('laptop')   || o.includes('macbook')  || o.includes('array')       ||
      o.includes('onboard')
    )
  })

  if (hasKnownBuiltIn) {
    /* A real built-in is already identified → this ambiguous device is external */
    return { icon: Headphones, badge: 'Headphones / External', color: '#6366F1' }
  }

  /* No built-in found yet → treat first unknown as built-in, rest as external */
  const ambiguousIndex = allLabels.filter(o => {
    const lo = o.toLowerCase()
    return (
      !lo.includes('default') && !lo.includes('communications') &&
      !lo.includes('built-in') && !lo.includes('internal') && !lo.includes('integrated') &&
      !lo.includes('laptop')   && !lo.includes('macbook')   && !lo.includes('array') &&
      !lo.includes('headset')  && !lo.includes('headphone') && !lo.includes('airpod') &&
      !lo.includes('usb')      && !lo.includes('external')
    )
  }).indexOf(label)

  return ambiguousIndex === 0
    ? { icon: Laptop,    badge: 'Built-in',            color: '#7133AE' }
    : { icon: Headphones, badge: 'Headphones / External', color: '#6366F1' }
}

export default function RecordingSetupModal({
  project,
  onStart,
  onCancel,
  systemAudioOn    = false,
  sysAudioLoading  = false,
  sysAudioError    = '',
  onEnableSystemAudio,
  onStopSystemAudio,
  onClearSysAudioError,
}) {
  const [devices,    setDevices]    = useState([])
  const [selectedId, setSelectedId] = useState('default')
  const [loading,    setLoading]    = useState(true)
  const [permErr,    setPermErr]    = useState(false)

  /* Enumerate mic devices — request permission first so labels are populated */
  useEffect(() => {
    setLoading(true)
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then(stream => {
        stream.getTracks().forEach(t => t.stop())
        return navigator.mediaDevices.enumerateDevices()
      })
      .catch(() => navigator.mediaDevices.enumerateDevices())
      .then(all => {
        const mics = all.filter(d => d.kind === 'audioinput')
        setDevices(mics)
        /* Pre-select first real (non-default, non-communications) device */
        const preferred = mics.find(
          d => d.deviceId !== 'default' && d.deviceId !== 'communications'
        )
        setSelectedId(preferred?.deviceId ?? mics[0]?.deviceId ?? 'default')
        setLoading(false)
      })
      .catch(() => { setPermErr(true); setLoading(false) })
  }, [])

  const canStart = !loading && !permErr && devices.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#7133AE15' }}>
              <Radio size={17} style={{ color: '#7133AE' }} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm leading-tight">Recording Setup</p>
              <p className="text-xs text-gray-400 leading-tight">{project?.name}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pt-5 pb-4 space-y-4">

          {/* ── Microphone selector ── */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2.5">
              <Mic size={12} /> Select Microphone
            </label>

            {permErr ? (
              <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                Microphone permission denied. Please allow access in browser settings.
              </div>
            ) : loading ? (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {devices.map(d => {
                  /* Pass all device labels so the heuristic can compare across devices */
                  const allLabels = devices.map(x => x.label || '')
                  const { icon: Icon, badge, color } = classifyMic(d.label || '', allLabels)
                  const isSelected = selectedId === d.deviceId
                  const displayLabel = d.label || `Microphone (${d.deviceId.slice(0, 8)}…)`

                  return (
                    <button
                      key={d.deviceId}
                      onClick={() => setSelectedId(d.deviceId)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all cursor-pointer"
                      style={{
                        borderColor:     isSelected ? '#7133AE' : '#e5e7eb',
                        backgroundColor: isSelected ? '#7133AE08' : '#fff',
                      }}
                    >
                      {/* Device icon */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: isSelected ? `${color}18` : '#f3f4f6' }}
                      >
                        <Icon size={16} style={{ color: isSelected ? color : '#9ca3af' }} />
                      </div>

                      {/* Label + badge */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate leading-tight"
                          style={{ color: isSelected ? '#111827' : '#374151' }}
                        >
                          {displayLabel}
                        </p>
                        {badge && (
                          <span
                            className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5"
                            style={{
                              backgroundColor: isSelected ? `${color}18` : '#f3f4f6',
                              color:           isSelected ? color : '#9ca3af',
                            }}
                          >
                            {badge}
                          </span>
                        )}
                      </div>

                      {/* Check */}
                      {isSelected && (
                        <CheckCircle2 size={16} style={{ color: '#7133AE', flexShrink: 0 }} />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── System Audio toggle ── */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
            {/* Row */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: systemAudioOn ? '#05966914' : '#f3f4f6' }}
                >
                  <MonitorSpeaker size={15} style={{ color: systemAudioOn ? '#059669' : '#9ca3af' }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 leading-tight">System Audio</p>
                  <p className="text-xs leading-tight mt-0.5" style={{ color: systemAudioOn ? '#059669' : '#9ca3af' }}>
                    {sysAudioLoading  ? 'Connecting to meeting audio…'
                     : systemAudioOn  ? 'Capturing Google Meet / Zoom audio'
                     : 'Enable to transcribe other speakers'}
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={systemAudioOn ? onStopSystemAudio : onEnableSystemAudio}
                disabled={sysAudioLoading}
                className="relative flex-shrink-0 transition-opacity"
                style={{ opacity: sysAudioLoading ? 0.6 : 1, cursor: sysAudioLoading ? 'wait' : 'pointer' }}
                aria-label="Toggle system audio"
              >
                {sysAudioLoading ? (
                  /* spinner */
                  <svg className="animate-spin w-9 h-5" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                ) : (
                  <div
                    className="w-10 h-6 rounded-full transition-colors duration-200"
                    style={{ backgroundColor: systemAudioOn ? '#059669' : '#d1d5db' }}
                  >
                    <div
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                      style={{ left: systemAudioOn ? '22px' : '4px' }}
                    />
                  </div>
                )}
              </button>
            </div>

            {/* Status bar — ON */}
            {systemAudioOn && (
              <div
                className="px-4 py-2 flex items-center gap-1.5 text-xs font-medium"
                style={{ backgroundColor: '#05966910', color: '#059669', borderTop: '1px solid #05966920' }}
              >
                <Users size={11} />
                Multi-speaker detection active — other participants will be labelled separately
              </div>
            )}

            {/* Error bar */}
            {sysAudioError && (
              <div
                className="px-4 py-2.5 text-xs"
                style={{ backgroundColor: '#fef2f2', borderTop: '1px solid #fecaca' }}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-semibold text-red-600">⚠️ Could not capture audio</p>
                  <button onClick={onClearSysAudioError} className="text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0 text-base leading-none">✕</button>
                </div>
                <p className="text-red-500 mb-1.5 leading-relaxed">{sysAudioError}</p>
                <div className="text-gray-500 space-y-0.5">
                  <p className="font-medium text-gray-600">In the sharing dialog:</p>
                  <p>1. Click <strong>Chrome Tab</strong></p>
                  <p>2. Select your <strong>Google Meet / Zoom</strong> tab</p>
                  <p>3. Check <strong>"Share tab audio" ✅</strong></p>
                  <p>4. Click <strong>Share</strong></p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onStart({ project, deviceId: selectedId })}
            disabled={!canStart}
            className="flex-[2] py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: canStart ? '#7133AE' : '#c4b5d4',
              cursor: canStart ? 'pointer' : 'not-allowed',
            }}
          >
            <Radio size={14} />
            Start Recording
          </button>
        </div>
      </div>
    </div>
  )
}
