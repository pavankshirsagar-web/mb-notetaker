import { initializeApp }                               from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup,
         signOut, onAuthStateChanged }                  from 'firebase/auth'
import { getFirestore }                                 from 'firebase/firestore'

/* ── Firebase project config ─────────────────────────────────────────────────
   Fill these in .env after creating a Firebase project:
   https://console.firebase.google.com → Project settings → Your apps → Web app
────────────────────────────────────────────────────────────────────────────── */
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'AIzaSyA67VLJV-xmfGe-BCxj0BIToZI70_6sf2I',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'mb-notetaker.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'mb-notetaker',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'mb-notetaker.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID|| '183273569431',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '1:183273569431:web:1b8540cee13ee7fd3dbdd2',
}

/* ── Config guard ────────────────────────────────────────────────────────────
   If the .env values are not filled in yet, Firebase will throw on init.
   We detect this early and export no-op stubs so the rest of the app still
   renders (it will show the login page and display a setup hint).
────────────────────────────────────────────────────────────────────────────── */
const CONFIG_READY = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
)

/* True when Firebase is properly configured */
export const firebaseConfigured = CONFIG_READY

let auth = null
let db   = null

if (CONFIG_READY) {
  const app = initializeApp(firebaseConfig)
  auth      = getAuth(app)
  db        = getFirestore(app)
} else {
  console.warn(
    '[MB Notetaker] Firebase env vars not set.\n' +
    'Add VITE_FIREBASE_* values to .env and restart the dev server.\n' +
    'See: https://console.firebase.google.com'
  )
}

export { auth, db }

/* ── Google sign-in ── */
export const signInWithGoogle = async () => {
  if (!CONFIG_READY || !auth) throw new Error('Firebase not configured. Fill in .env first.')
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return signInWithPopup(auth, provider)
}

/* ── Sign out ── */
export const signOutUser = () => {
  if (!CONFIG_READY || !auth) return Promise.resolve()
  return signOut(auth)
}

/* ── Auth state listener ─────────────────────────────────────────────────────
   When Firebase is not configured, immediately calls the callback with null
   (no user) so the app renders the login page instead of hanging blank.
────────────────────────────────────────────────────────────────────────────── */
export const listenAuthState = (callback) => {
  if (!CONFIG_READY || !auth) {
    // Call immediately with null → app shows login page
    setTimeout(() => callback(null), 0)
    return () => {} // no-op unsubscribe
  }
  return onAuthStateChanged(auth, callback)
}
