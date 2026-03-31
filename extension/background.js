/* ─── MB Notetaker Extension — Background Service Worker ─── */

let state = {
  isRecording: false,
  isPaused:    false,
  seconds:     0,
  sourceTabId: null,
}
let timerInterval = null

/* ── Timer ── */
function startTimer() {
  if (timerInterval) return
  timerInterval = setInterval(() => {
    if (!state.isPaused) {
      state.seconds++
      broadcastToAll({ type: 'MB_WIDGET_UPDATE', state: { ...state } })
    }
  }, 1000)
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
}

/* ── Broadcast to every tab except optionally one ── */
async function broadcastToAll(msg, excludeTabId = null) {
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (tab.id && tab.id !== excludeTabId) {
      chrome.tabs.sendMessage(tab.id, msg).catch(() => {})
    }
  }
}

/* ── Message handler ── */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab?.id

  switch (msg.type) {

    case 'GET_STATE':
      sendResponse({ ...state })
      return true

    case 'RECORDING_STARTED':
      state = { isRecording: true, isPaused: false, seconds: 0, sourceTabId: tabId }
      startTimer()
      broadcastToAll({ type: 'MB_WIDGET_UPDATE', state: { ...state } }, tabId)
      break

    case 'RECORDING_PAUSED':
      state.isPaused = true
      broadcastToAll({ type: 'MB_WIDGET_UPDATE', state: { ...state } }, tabId)
      break

    case 'RECORDING_RESUMED':
      state.isPaused = false
      broadcastToAll({ type: 'MB_WIDGET_UPDATE', state: { ...state } }, tabId)
      break

    case 'RECORDING_STOPPED':
      stopTimer()
      state = { isRecording: false, isPaused: false, seconds: 0, sourceTabId: null }
      broadcastToAll({ type: 'MB_WIDGET_HIDE' })
      break

    /* ── Widget button actions (from other tabs) ── */
    case 'WIDGET_TOGGLE_PAUSE': {
      state.isPaused = !state.isPaused
      const action = state.isPaused ? 'PAUSE' : 'RESUME'
      if (state.sourceTabId) {
        chrome.tabs.sendMessage(state.sourceTabId, { type: 'MB_APP_ACTION', action }).catch(() => {})
      }
      broadcastToAll({ type: 'MB_WIDGET_UPDATE', state: { ...state } })
      break
    }

    case 'WIDGET_STOP':
      if (state.sourceTabId) {
        chrome.tabs.sendMessage(state.sourceTabId, { type: 'MB_APP_ACTION', action: 'STOP' }).catch(() => {})
      }
      stopTimer()
      state = { isRecording: false, isPaused: false, seconds: 0, sourceTabId: null }
      broadcastToAll({ type: 'MB_WIDGET_HIDE' })
      break

    case 'WIDGET_RETURN':
      if (state.sourceTabId) {
        chrome.tabs.get(state.sourceTabId, (tab) => {
          if (!tab) return
          chrome.tabs.update(state.sourceTabId, { active: true })
          chrome.windows.update(tab.windowId, { focused: true })
        })
      }
      break
  }

  sendResponse({})
  return true
})
