'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Loader2, ArrowRight, Eye, EyeOff, Check, MailCheck, MailWarning, RotateCw } from 'lucide-react'

type Mode = 'login' | 'signup' | 'forgot'


const USERNAME_MIN = 3
const USERNAME_MAX = 20
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}

function AuthForm() {
  const [mode, setMode] = useState<Mode>('login')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [signupName, setSignupName] = useState('')
  const [signupUsername, setSignupUsername] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')

  const [forgotEmail, setForgotEmail] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  
  const [needsConfirm, setNeedsConfirm] = useState(false)      
  const [pendingEmail, setPendingEmail] = useState('')          
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendMsg, setResendMsg] = useState('')
  const [resending, setResending] = useState(false)

  const [usernameStatus, setUsernameStatus] = useState<'idle'|'checking'|'available'|'taken'|'invalid'>('idle')
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const validations = {
    minLength: signupPassword.length >= 6,
    hasUpper: /[A-Z]/.test(signupPassword),
    hasNumber: /[0-9]/.test(signupPassword),
    hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(signupPassword),
  }
  const isPasswordValid = Object.values(validations).every(Boolean)

  const usernameChecks = {
    length: signupUsername.length >= USERNAME_MIN && signupUsername.length <= USERNAME_MAX,
    startsWithLetter: /^[a-z]/.test(signupUsername),
  }
  const isUsernameValid = USERNAME_REGEX.test(signupUsername) && usernameChecks.startsWithLetter

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  async function resendConfirmation() {
    const email = pendingEmail.trim()
    if (!email || resendCooldown > 0) return
    setResending(true); setResendMsg('')
    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setResending(false)
    if (resendErr) {
      setResendMsg(
        resendErr.message.toLowerCase().includes('rate limit') || resendErr.status === 429
          ? 'Too many emails sent. Please wait a few minutes and try again.'
          : resendErr.message
      )
      setResendCooldown(30)
      return
    }
    setResendMsg('Confirmation email sent! Check your inbox and spam folder.')
    setResendCooldown(60)
  }

  useEffect(() => {
    if (searchParams.get('error') === 'link_expired') {
      setError('That link has expired. Request a new one below.')
      setMode('forgot')
    }
  }, [searchParams])

  useEffect(() => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current)

    if (!signupUsername || mode !== 'signup') { setUsernameStatus('idle'); return }
    if (!isUsernameValid) { setUsernameStatus('invalid'); return }

    setUsernameStatus('checking')

    usernameTimer.current = setTimeout(async () => {
      try {
        const { data } = await supabase.from('public_profiles').select('id').eq('username', signupUsername.toLowerCase()).maybeSingle()
        setUsernameStatus(data ? 'taken' : 'available')
      } catch (err) {
        console.error("Network error during username check")
        setUsernameStatus('idle')
      }
    }, 500)

    return () => { if (usernameTimer.current) clearTimeout(usernameTimer.current) }
  }, [signupUsername, mode, isUsernameValid, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccessMsg(''); setLoading(true)

    const handleSupabaseError = (err: any) => {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        return 'Connection error. Please check your internet and try again.'
      }
      return err.message
    }

    if (mode === 'signup') {
      if (!isUsernameValid) {
        setError(`Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters, start with a letter, and use only a-z, 0-9 or _.`)
        setLoading(false); return
      }
      if (usernameStatus === 'checking') { setError('Still checking username, try again in a second.'); setLoading(false); return }
      if (usernameStatus === 'taken') { setError('Username already in use.'); setLoading(false); return }
      if (!isPasswordValid) { setError('Please meet all password requirements.'); setLoading(false); return }
      if (signupPassword !== signupConfirmPassword) {
        setError('Passwords do not match.');
        setLoading(false); return
      }

     
      const { error: signUpError } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: {
          data: { name: signupName.trim().slice(0, 60), username: signupUsername.toLowerCase() },
          
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
      
        setError(
          signUpError.message.includes('Database error')
            ? 'That username was just taken. Please choose another one.'
            : handleSupabaseError(signUpError)
        )
        setLoading(false)
        return
      }

      

      setPendingEmail(signupEmail.trim())
      setSuccessMsg('Account created! Please check your email.')
    }
    else if (mode === 'login') {
      setNeedsConfirm(false); setResendMsg('')
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword
      })

      if (signInError) {
        const notConfirmed =
          (signInError as any).code === 'email_not_confirmed' ||
          signInError.message.toLowerCase().includes('email not confirmed')
        if (notConfirmed) {
          setPendingEmail(loginEmail.trim())
          setNeedsConfirm(true)
        } else if (signInError.message.toLowerCase().includes('banned')) {
          setError('Your account has been suspended.')
        } else {
          setError('Invalid email or password.')
        }
      } else {
        window.location.href = '/'
      }
    }
    else {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (resetErr) setError(handleSupabaseError(resetErr))
      else setSuccessMsg('Check your email for reset link.')
    }
    setLoading(false)
  }

  function switchMode(m: Mode) {
    setMode(m); setError(''); setSuccessMsg(''); setShowPassword(false); setSignupPassword('')
    setNeedsConfirm(false); setResendMsg('')
  }

  const usernameBorder =
    usernameStatus === 'taken' || usernameStatus === 'invalid'
      ? 'border-red-500/50'
      : usernameStatus === 'available'
        ? 'border-emerald-500/40'
        : 'border-white/5'

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#fcfcfc] px-6 relative overflow-hidden">
      <div className="w-full max-w-[400px] bg-[#1e1a1d]/95 border border-white/20 backdrop-blur-[40px] rounded-[2.5rem] p-8 sm:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] relative z-10 overflow-hidden">

        {successMsg && mode === 'signup' ? (
          <div className="flex flex-col items-center text-center space-y-6 py-4 relative z-10">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30 animate-pulse">
              <MailCheck className="text-emerald-400" size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Check your mail</h2>
              <p className="text-white/60 text-sm leading-relaxed">{successMsg}</p>
              {pendingEmail && <p className="text-white/30 text-xs font-medium">Sent to {pendingEmail}</p>}
            </div>
            <ResendBlock
              onResend={resendConfirmation}
              cooldown={resendCooldown}
              loading={resending}
              message={resendMsg}
            />
            <button
              onClick={() => switchMode('login')}
              className="w-full bg-white text-[#1e1a1d] py-4 rounded-xl text-xs font-bold hover:bg-white/95 transition-all flex items-center justify-center gap-2 shadow-xl"
            >
              Back to Sign In <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />

            <div className="flex flex-col items-center mb-8 text-center relative z-10">
              <span className="text-white text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-chunky)' }}>n=1</span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
              </h1>
              <p className="text-white/40 text-xs mt-2 font-medium tracking-wide">
                {mode === 'login' ? 'Continue your journey.' : mode === 'signup' ? 'Join the research community.' : 'Enter your email to reset.'}
              </p>

              {error && <p className="text-red-400 text-[10px] mt-4 font-bold bg-red-400/10 py-2 px-4 rounded-full border border-red-400/20">{error}</p>}
              {needsConfirm && mode === 'login' && (
                <div className="w-full mt-4 rounded-2xl bg-amber-400/10 border border-amber-400/20 p-4 space-y-3 text-left">
                  <div className="flex items-start gap-2.5">
                    <MailWarning size={16} className="text-amber-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-200">Please confirm your email first</p>
                      <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">
                        We sent a confirmation link to <span className="text-white/80 font-semibold">{pendingEmail}</span>. Check your inbox and spam folder.
                      </p>
                    </div>
                  </div>
                  <ResendBlock
                    onResend={resendConfirmation}
                    cooldown={resendCooldown}
                    loading={resending}
                    message={resendMsg}
                    compact
                  />
                </div>
              )}
              {successMsg && mode !== 'signup' && <p className="text-emerald-400 text-[10px] mt-4 font-bold bg-emerald-400/10 py-2 px-4 rounded-full border border-emerald-400/20">{successMsg}</p>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {mode === 'signup' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Full Name</label>
                      <input type="text" required maxLength={60} value={signupName} onChange={e => setSignupName(e.target.value)}
                        placeholder="Jana" className="w-full bg-white/[0.05] border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-white/10 outline-none focus:border-emerald-500/40 transition-all text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Username</label>
                      <div className="relative">
                        <input type="text" required value={signupUsername}
                          maxLength={USERNAME_MAX}
                          autoComplete="username"
                          autoCapitalize="none"
                          spellCheck={false}
                          onChange={e => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="jana_x" className={`w-full bg-white/[0.05] border rounded-xl px-4 py-3 pr-8 text-white placeholder:text-white/10 outline-none transition-all text-xs ${usernameBorder}`} />
                        {usernameStatus === 'checking' && <Loader2 size={10} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/20" />}
                        {usernameStatus === 'available' && <Check size={10} strokeWidth={4} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />}
                      </div>
                    </div>
                  </div>

                  {signupUsername.length > 0 && (
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 -mt-1 px-1">
                      <ValidationItem label={`${USERNAME_MIN}–${USERNAME_MAX} characters`} isValid={usernameChecks.length} />
                      <ValidationItem label="Starts with a letter" isValid={usernameChecks.startsWithLetter} />
                      <ValidationItem label="a-z, 0-9, _ only" isValid={true} />
                      <ValidationItem
                        label={usernameStatus === 'taken' ? 'Username taken' : usernameStatus === 'checking' ? 'Checking…' : 'Available'}
                        isValid={usernameStatus === 'available'}
                        isError={usernameStatus === 'taken'}
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Email</label>
                    <input type="email" required value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                      placeholder="you@gmail.com" className="w-full bg-white/[0.05] border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-white/10 outline-none focus:border-emerald-500/40 transition-all text-xs" />
                  </div>
                  <div className="space-y-1 relative">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                        placeholder="••••••••" className="w-full bg-white/[0.05] border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-white/10 outline-none focus:border-emerald-500/40 transition-all text-xs pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                        {showPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>

                    {signupPassword.length > 0 && (
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-3 px-1">
                        <ValidationItem label="6+ characters" isValid={validations.minLength} />
                        <ValidationItem label="One uppercase" isValid={validations.hasUpper} />
                        <ValidationItem label="One number" isValid={validations.hasNumber} />
                        <ValidationItem label="One symbol" isValid={validations.hasSymbol} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Confirm Password</label>
                    <input type={showPassword ? "text" : "password"} required value={signupConfirmPassword} onChange={e => setSignupConfirmPassword(e.target.value)}
                      placeholder="••••••••" className={`w-full bg-white/[0.05] border rounded-xl px-4 py-3 text-white placeholder:text-white/10 outline-none transition-all text-xs ${signupConfirmPassword && signupPassword !== signupConfirmPassword ? 'border-red-500/40' : 'border-white/5'}`} />
                  </div>
                </>
              )}

              {mode === 'login' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Email</label>
                    <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                      placeholder="you@gmail.com" className="w-full bg-white/[0.05] border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-white/10 outline-none focus:border-emerald-500/40 transition-all text-xs" />
                  </div>
                  <div className="space-y-1 relative">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                        placeholder="••••••••" className="w-full bg-white/[0.05] border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-white/10 outline-none focus:border-emerald-500/40 transition-all text-xs pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                        {showPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>
                    <div className="flex justify-end pr-1 mt-1">
                      <button type="button" onClick={() => switchMode('forgot')} className="text-emerald-400 font-bold text-[10px] hover:text-emerald-300 transition-colors">Forgot password?</button>
                    </div>
                  </div>
                </>
              )}

              {mode === 'forgot' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Email</label>
                  <input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    placeholder="you@gmail.com" className="w-full bg-white/[0.05] border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-white/10 outline-none focus:border-emerald-500/40 transition-all text-xs" />
                </div>
              )}

              <button type="submit" disabled={loading || (mode === 'signup' && (usernameStatus === 'invalid' || usernameStatus === 'taken'))}
                className="w-full bg-white text-[#1e1a1d] py-4 rounded-xl text-xs font-bold hover:bg-white/95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 shadow-xl disabled:opacity-30">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <>{mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'} <ArrowRight size={14} /></>}
              </button>
            </form>

            <p className="mt-10 text-center text-[11px] text-white/20 font-light relative z-10">
              {mode === 'login' ? (
                <>New here? <button onClick={() => switchMode('signup')} className="text-emerald-400 font-bold ml-1">Join Now!</button></>
              ) : (
                <>Already have an account? <button onClick={() => switchMode('login')} className="text-emerald-400 font-bold ml-1">Sign In</button></>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function ValidationItem({ label, isValid, isError = false }: { label: string; isValid: boolean; isError?: boolean }) {
  const color = isError ? 'text-red-400' : isValid ? 'text-emerald-400' : 'text-white/20'
  const dot = isError
    ? 'bg-red-500/20 border-red-500'
    : isValid
      ? 'bg-emerald-500/20 border-emerald-500'
      : 'border-white/10'
  return (
    <div className={`flex items-center gap-1.5 transition-colors duration-300 ${color}`}>
      <div className={`w-3 h-3 rounded-full flex items-center justify-center border ${dot}`}>
        {isValid && !isError && <Check size={8} strokeWidth={4} />}
      </div>
      <span className="text-[8px] font-bold tracking-tight uppercase">{label}</span>
    </div>
  )
}
function ResendBlock({ onResend, cooldown, loading, message, compact = false }: {
  onResend: () => void
  cooldown: number
  loading: boolean
  message: string
  compact?: boolean
}) {
  const ok = message.startsWith('Confirmation email sent')
  return (
    <div className={`w-full space-y-2 ${compact ? '' : 'pt-1'}`}>
      <button
        type="button"
        onClick={onResend}
        disabled={loading || cooldown > 0}
        className={`w-full flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
          compact
            ? 'py-2.5 bg-white/10 text-white hover:bg-white/15'
            : 'py-3.5 bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10'
        }`}
      >
        {loading
          ? <Loader2 size={13} className="animate-spin" />
          : <RotateCw size={13} />}
        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend confirmation email'}
      </button>
      {message && (
        <p className={`text-[11px] font-bold text-center ${ok ? 'text-emerald-400' : 'text-red-400'}`}>{message}</p>
      )}
    </div>
  )
}
