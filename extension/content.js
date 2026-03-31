/* ─── MB Notetaker Extension — Content Script ───
   Runs on every tab.
   • App tab (has <meta name="mb-notetaker-app">): bridges postMessage ↔ extension
   • All other tabs: injects the floating recording widget
─────────────────────────────────────────────────── */

;(function () {
  const IS_APP_TAB = !!document.querySelector('meta[name="mb-notetaker-app"]')

  /* ════════════════════════════════════════════════
     APP TAB — bridge between page JS and extension
  ════════════════════════════════════════════════ */
  if (IS_APP_TAB) {
    /* Page → Extension */
    window.addEventListener('message', (e) => {
      if (e.source !== window || !e.data?.mbNotetaker) return
      chrome.runtime.sendMessage({ type: e.data.type }).catch(() => {})
    })

    /* Extension → Page */
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'MB_APP_ACTION') {
        window.postMessage({ mbNotetakerAction: true, action: msg.action }, '*')
      }
    })
    return
  }

  /* ════════════════════════════════════════════════
     OTHER TABS — floating widget
  ════════════════════════════════════════════════ */
  const WIDGET_ID = 'mb-notetaker-widget'
  let pos = { x: window.innerWidth - 300, y: window.innerHeight - 80 }

  function fmt(s) {
    return (
      String(Math.floor(s / 60)).padStart(2, '0') + ':' +
      String(s % 60).padStart(2, '0')
    )
  }

  function btn(id, bg, color, label) {
    return `<button data-mb="${id}" style="display:flex!important;align-items:center!important;justify-content:center!important;width:30px!important;height:30px!important;border-radius:8px!important;border:none!important;cursor:pointer!important;flex-shrink:0!important;background:${bg}!important;color:${color}!important;font-size:13px!important;padding:0!important;margin:0!important;outline:none!important;">${label}</button>`
  }

  function pillHTML(seconds, isPaused) {
    const dot = `<span style="display:block!important;width:7px!important;height:7px!important;border-radius:50%!important;flex-shrink:0!important;background:${isPaused ? 'rgba(255,255,255,0.25)' : '#EF4444'}!important;box-shadow:${isPaused ? 'none' : '0 0 6px #EF4444'}!important;"></span>`
    const div = `<div style="width:1px!important;height:18px!important;background:rgba(255,255,255,0.08)!important;flex-shrink:0!important;"></div>`
    const timer = `<span style="font-size:15px!important;font-weight:700!important;letter-spacing:0.06em!important;font-variant-numeric:tabular-nums!important;color:#fff!important;min-width:46px!important;text-align:center!important;flex-shrink:0!important;">${fmt(seconds)}</span>`
    const pauseBtn = btn('pause', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.8)', isPaused ? '▶' : '⏸')
    const stopBtn  = btn('stop',  'rgba(220,38,38,0.25)',   '#fca5a5',              '■')
    const retBtn   = btn('return','rgba(255,255,255,0.06)', 'rgba(255,255,255,0.45)','↗')
    return `<div style="display:flex!important;align-items:center!important;gap:6px!important;background:linear-gradient(135deg,#1E1130 0%,#150C26 100%)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:14px!important;padding:6px 10px!important;box-shadow:0 8px 32px rgba(0,0,0,0.5)!important;${!isPaused ? 'outline:1px solid rgba(220,38,38,0.4)!important;outline-offset:-1px!important;' : ''}">${dot}${div}${timer}${div}${pauseBtn}${stopBtn}${retBtn}</div>`
  }

  function render(state) {
    let widget = document.getElementById(WIDGET_ID)

    if (!state?.isRecording) {
      if (widget) widget.remove()
      return
    }

    const isNew = !widget
    if (isNew) {
      widget = document.createElement('div')
      widget.id = WIDGET_ID
      document.body.appendChild(widget)
      setupDrag(widget)
    }

    widget.style.cssText = `position:fixed!important;left:${pos.x}px!important;top:${pos.y}px!important;z-index:2147483647!important;cursor:grab!important;user-select:none!important;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;`
    widget.innerHTML = pillHTML(state.seconds ?? 0, state.isPaused ?? false)

    widget.querySelector('[data-mb="pause"]').onclick  = (e) => { e.stopPropagation(); chrome.runtime.sendMessage({ type: 'WIDGET_TOGGLE_PAUSE' }) }
    widget.querySelector('[data-mb="stop"]').onclick   = (e) => { e.stopPropagation(); chrome.runtime.sendMessage({ type: 'WIDGET_STOP' }) }
    widget.querySelector('[data-mb="return"]').onclick = (e) => { e.stopPropagation(); chrome.runtime.sendMessage({ type: 'WIDGET_RETURN' }) }
  }

  function setupDrag(el) {
    let dragging = false, ox = 0, oy = 0
    el.addEventListener('mousedown', (e) => {
      if (e.target.dataset.mb) return
      dragging = true
      const r = el.getBoundingClientRect()
      ox = e.clientX - r.left; oy = e.clientY - r.top
      el.style.cursor = 'grabbing!important'
      e.preventDefault()
    })
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return
      pos.x = Math.max(8, Math.min(window.innerWidth  - el.offsetWidth  - 8, e.clientX - ox))
      pos.y = Math.max(8, Math.min(window.innerHeight - el.offsetHeight - 8, e.clientY - oy))
      el.style.left = pos.x + 'px'
      el.style.top  = pos.y + 'px'
    }, true)
    document.addEventListener('mouseup', () => { dragging = false; el.style.cursor = 'grab' }, true)
  }

  /* Listen for updates from background */
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'MB_WIDGET_UPDATE') render(msg.state)
    if (msg.type === 'MB_WIDGET_HIDE')   render(null)
  })

  /* Get state on tab load (e.g. user opens a new tab mid-recording) */
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
    if (state?.isRecording) render(state)
  })
})()
