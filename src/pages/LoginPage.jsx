import { useState } from 'react'
import { Mail, ArrowRight, Loader2 } from 'lucide-react'
import { signInWithGoogle } from '../lib/firebase'

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

const IllustrationLeft = () => (
  <svg viewBox="0 0 440 340" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-md">
    <rect x="20" y="10" width="400" height="320" rx="18" fill="white" fillOpacity="0.08" />
    <rect x="20" y="10" width="400" height="320" rx="18" stroke="white" strokeOpacity="0.18" strokeWidth="1.5" />
    <circle cx="52" cy="42" r="6" fill="white" fillOpacity="0.45" />
    <circle cx="70" cy="42" r="6" fill="white" fillOpacity="0.25" />
    <circle cx="88" cy="42" r="6" fill="white" fillOpacity="0.15" />
    <rect x="330" y="29" width="72" height="26" rx="13" fill="#FF4B4B" fillOpacity="0.92" />
    <circle cx="346" cy="42" r="5" fill="white" />
    <rect x="356" y="38" width="32" height="8" rx="4" fill="white" fillOpacity="0.92" />
    <rect x="20" y="66" width="400" height="1" fill="white" fillOpacity="0.1" />
    <rect x="46" y="92" width="14" height="22" rx="4" fill="white" fillOpacity="0.3" />
    <rect x="66" y="82" width="14" height="42" rx="4" fill="white" fillOpacity="0.45" />
    <rect x="86" y="96" width="14" height="14" rx="4" fill="white" fillOpacity="0.25" />
    <rect x="106" y="78" width="14" height="50" rx="4" fill="#C4B5FD" fillOpacity="0.85" />
    <rect x="126" y="88" width="14" height="30" rx="4" fill="white" fillOpacity="0.4" />
    <rect x="146" y="74" width="14" height="58" rx="4" fill="#C4B5FD" fillOpacity="0.95" />
    <rect x="166" y="86" width="14" height="34" rx="4" fill="white" fillOpacity="0.5" />
    <rect x="186" y="93" width="14" height="20" rx="4" fill="white" fillOpacity="0.3" />
    <rect x="206" y="80" width="14" height="46" rx="4" fill="#C4B5FD" fillOpacity="0.75" />
    <rect x="226" y="90" width="14" height="26" rx="4" fill="white" fillOpacity="0.35" />
    <rect x="246" y="84" width="14" height="38" rx="4" fill="white" fillOpacity="0.4" />
    <rect x="266" y="97" width="14" height="12" rx="4" fill="white" fillOpacity="0.2" />
    <rect x="286" y="82" width="14" height="42" rx="4" fill="#C4B5FD" fillOpacity="0.65" />
    <rect x="306" y="92" width="14" height="22" rx="4" fill="white" fillOpacity="0.3" />
    <rect x="326" y="86" width="14" height="34" rx="4" fill="white" fillOpacity="0.35" />
    <rect x="346" y="94" width="14" height="18" rx="4" fill="white" fillOpacity="0.2" />
    <rect x="366" y="88" width="14" height="30" rx="4" fill="white" fillOpacity="0.25" />
    <rect x="386" y="82" width="14" height="42" rx="4" fill="white" fillOpacity="0.3" />
    <rect x="46" y="150" width="100" height="9" rx="4.5" fill="white" fillOpacity="0.65" />
    <rect x="46" y="167" width="220" height="7" rx="3.5" fill="white" fillOpacity="0.28" />
    <rect x="46" y="180" width="180" height="7" rx="3.5" fill="white" fillOpacity="0.2" />
    <rect x="46" y="193" width="200" height="7" rx="3.5" fill="white" fillOpacity="0.15" />
    <rect x="46" y="218" width="348" height="88" rx="12" fill="white" fillOpacity="0.1" stroke="white" strokeOpacity="0.18" strokeWidth="1" />
    <rect x="62" y="234" width="60" height="8" rx="4" fill="#C4B5FD" fillOpacity="0.95" />
    <rect x="62" y="250" width="308" height="6" rx="3" fill="white" fillOpacity="0.35" />
    <rect x="62" y="263" width="240" height="6" rx="3" fill="white" fillOpacity="0.25" />
    <rect x="62" y="276" width="270" height="6" rx="3" fill="white" fillOpacity="0.2" />
    <circle cx="220" cy="312" r="24" fill="white" fillOpacity="0.13" stroke="white" strokeOpacity="0.22" strokeWidth="1.5" />
    <rect x="213" y="300" width="14" height="18" rx="7" fill="white" fillOpacity="0.75" />
    <path d="M208 316c0 6.627 5.373 12 12 12s12-5.373 12-12" stroke="white" strokeOpacity="0.75" strokeWidth="2" strokeLinecap="round" />
    <rect x="219" y="328" width="2" height="5" rx="1" fill="white" fillOpacity="0.7" />
    <rect x="215" y="333" width="10" height="2" rx="1" fill="white" fillOpacity="0.7" />
  </svg>
)

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
      // onAuthStateChanged in App.jsx will detect the new user and navigate to dashboard
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        setError('Sign-in failed. Please try again.')
        console.error('Google sign-in error:', e)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-12 min-h-screen">

      {/* ── Left column — brand illustration ── */}
      <div
        className="col-span-6 relative flex flex-col overflow-hidden"
        style={{ backgroundColor: '#7133AE', padding: '24px' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 60% 35%, rgba(255,255,255,0.08) 0%, transparent 65%)' }}
        />

        {/* Logo */}
        <div className="flex items-center gap-2 z-10">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1.5" fill="white" />
              <rect x="9" y="2" width="5" height="5" rx="1.5" fill="white" fillOpacity="0.6" />
              <rect x="2" y="9" width="5" height="5" rx="1.5" fill="white" fillOpacity="0.6" />
              <rect x="9" y="9" width="5" height="5" rx="1.5" fill="white" fillOpacity="0.3" />
            </svg>
          </div>
          <span className="text-white font-semibold text-base tracking-tight">MB Notetaker</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10">
          <IllustrationLeft />
          <div className="text-center">
            <h2 className="text-white text-2xl font-semibold leading-snug tracking-tight mb-2 whitespace-nowrap">
              Record. Transcribe. Summarize.
            </h2>
            <p className="text-white/60 text-sm leading-relaxed text-center max-w-xs mx-auto">
              AI-powered meeting notes so you can focus on the conversation, not the keyboard.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right column — sign in ── */}
      <div className="col-span-6 flex items-center justify-center bg-white px-8 py-16">
        <div className="w-full max-w-sm">

          <div className="mb-8">
            <h1 className="text-gray-900 text-2xl font-semibold tracking-tight mb-1">Welcome back</h1>
            <p className="text-gray-500 text-sm">Sign in to your account to continue</p>
          </div>

          {/* Google sign-in */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? <Loader2 size={18} className="animate-spin text-gray-400" />
              : <GoogleIcon />
            }
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>

          {/* Error message */}
          {error && (
            <p className="mt-3 text-xs text-red-500 text-center">{error}</p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-xs font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email form (placeholder — not wired to auth yet) */}
          <form onSubmit={e => e.preventDefault()} className="flex flex-col gap-3">
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="email"
                placeholder="Enter your email"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all duration-150 bg-white"
                onFocus={e => { e.target.style.boxShadow = '0 0 0 2px #7133AE33'; e.target.style.borderColor = '#7133AE' }}
                onBlur={e => { e.target.style.boxShadow = ''; e.target.style.borderColor = '#e5e7eb' }}
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium transition-all duration-150 cursor-pointer"
              style={{ backgroundColor: '#7133AE' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#5f2a94' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#7133AE' }}
            >
              Continue <ArrowRight size={16} />
            </button>
          </form>

          <p className="text-gray-400 text-xs text-center mt-6 leading-relaxed">
            By continuing, you agree to our{' '}
            <span className="underline cursor-pointer" style={{ color: '#7133AE' }}>Terms of Service</span>
            {' '}and{' '}
            <span className="underline cursor-pointer" style={{ color: '#7133AE' }}>Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  )
}
