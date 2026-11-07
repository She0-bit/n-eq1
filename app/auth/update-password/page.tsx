'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Eye, EyeOff, Check, X, Loader2 } from 'lucide-react'

type LinkState = 'checking' | 'ready' | 'invalid'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [linkState, setLinkState] = useState<LinkState>('checking')
  const [fromRecovery, setFromRecovery] = useState(false)
  const [email, setEmail] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const initialCode = useRef<string | null>(
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('code') : null
  )

  useEffect(() => {
    let cancelled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setFromRecovery(true)
    })

    ;(async () => {
      const params = new URLSearchParams(window.location.search)
      const code = initialCode.current ?? params.get('code')
      const urlError = params.get('error_description') || params.get('error')

      if (urlError) { if (!cancelled) setLinkState('invalid'); return }

      if (code) {
        if (!cancelled) setFromRecovery(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code)
          if (exErr) {
            const { data: { session: s2 } } = await supabase.auth.getSession()
            if (!s2) { if (!cancelled) setLinkState('invalid'); return }
          }
        }
        window.history.replaceState({}, '', '/auth/update-password')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) { setLinkState('invalid'); return }

      setEmail(user.email ?? '')
      setLinkState('ready')
    })()

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  const validations = {
    minLength: password.length >= 6,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }
  const isPasswordValid = Object.values(validations).every(Boolean)
  const needsCurrent = !fromRecovery

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!isPasswordValid) {
      setError('Please meet all password requirements.')
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match")
      return
    }
    if (needsCurrent && !currentPassword) {
      setError('Please enter your current password.')
      return
    }

    setLoading(true)

    if (needsCurrent) {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
      if (authErr) {
        setError('Current password is incorrect.')
        setLoading(false)
        return
      }
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password })
    if (updateErr) {
      setError(
        updateErr.message.toLowerCase().includes('different')
          ? 'Your new password must be different from the old one.'
          : updateErr.message
      )
      setLoading(false)
      return
    }

    await supabase.auth.signOut({ scope: 'others' })

    setDone(true)
    setTimeout(() => {
      window.location.href = '/'
    }, 2000)
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-12 bg-slate-50/50">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100 relative">

        <button
          onClick={() => router.push('/')}
          className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>

        <h1 className="text-2xl font-bold text-[#0F172A] mb-8 tracking-tight">Change Password</h1>

        {linkState === 'checking' ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400 font-medium">
            <Loader2 size={16} className="animate-spin" /> Verifying your link…
          </div>
        ) : linkState === 'invalid' ? (
          <div className="text-center py-6 space-y-4">
            <div className="text-4xl">⏳</div>
            <div>
              <p className="font-bold text-slate-800">This link is invalid or has expired</p>
              <p className="text-sm text-slate-500 mt-1">
                Request a new reset link and open it in the same browser you requested it from.
              </p>
            </div>
            <button
              onClick={() => router.push('/auth?error=link_expired')}
              className="w-full bg-[#1E293B] text-white py-4 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all"
            >
              Request a new link
            </button>
          </div>
        ) : done ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">🎉</div>
            <p className="font-bold text-slate-800 text-lg">Password updated!</p>
            <p className="text-sm text-slate-500 mt-1">Taking you back to the app…</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {needsCurrent && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                    Current Password
                  </label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-[#F8FAFC] border border-slate-200/80 rounded-2xl px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-all"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-[#F8FAFC] border border-slate-200/80 rounded-2xl px-4 py-3.5 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-5 space-y-3">
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                  Password Requirements
                </p>
                <RequirementRow label="At least 6 characters" isValid={validations.minLength} />
                <RequirementRow label="Contains an uppercase letter (A-Z)" isValid={validations.hasUpper} />
                <RequirementRow label="Contains at least one number (0-9)" isValid={validations.hasNumber} />
                <RequirementRow label="Contains a special character (@, #, $, etc.)" isValid={validations.hasSymbol} />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                  Confirm New Password
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  className={`w-full bg-[#F8FAFC] border rounded-2xl px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all ${
                    confirm && confirm !== password ? 'border-red-300 bg-red-50/20' : 'border-slate-200/80 focus:border-slate-400'
                  }`}
                />
                {confirm && confirm !== password && (
                  <p className="text-xs text-red-500 mt-1 pl-1">Passwords don't match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !isPasswordValid || password !== confirm || (needsCurrent && !currentPassword)}
                className="w-full bg-[#1E293B] text-white py-4 rounded-2xl text-sm font-bold hover:bg-slate-800 active:scale-[0.99] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-slate-900/10"
              >
                {loading ? 'Saving…' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function RequirementRow({ label, isValid }: { label: string; isValid: boolean }) {
  return (
    <div className="flex items-center gap-3 transition-colors duration-200">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-300 ${
          isValid
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-slate-200 bg-white'
        }`}
      >
        {isValid && <Check size={12} strokeWidth={3} />}
      </div>
      <span className={`text-xs font-medium ${isValid ? 'text-slate-700' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>
  )
}
    </div>
  )
}
