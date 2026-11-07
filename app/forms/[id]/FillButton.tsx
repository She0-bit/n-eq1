'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { ExternalLink, CheckCircle, Loader2, AlertCircle, Timer, LogIn, RotateCw } from 'lucide-react'

type Props = {
  formId:           string
  formLink:         string
  estimatedMinutes: number
  pointsReward:     number
  isLoggedIn:       boolean
  isOwner:          boolean
  alreadyFilled:    boolean
  referrerId:       string | null
  minSeconds:       number
  sessionRemaining: number | null
}

type Phase = 'idle' | 'starting' | 'waiting' | 'ready' | 'claiming' | 'done'

function safeHttpUrl(url: string): string | null {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null
  } catch {
    return null
  }
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function FillButton({
  formId, formLink, pointsReward,
  isLoggedIn, isOwner, alreadyFilled, referrerId,
  minSeconds, sessionRemaining,
}: Props) {
  const initialPhase: Phase =
    alreadyFilled ? 'done' :
    sessionRemaining == null ? 'idle' :
    sessionRemaining > 0 ? 'waiting' : 'ready'

  const [phase, setPhase]         = useState<Phase>(initialPhase)
  const [remaining, setRemaining] = useState<number>(sessionRemaining ?? minSeconds)
  const [error, setError]         = useState('')
  const [earned, setEarned]       = useState(pointsReward)
  const deadlineRef = useRef<number | null>(
    sessionRemaining != null ? Date.now() + sessionRemaining * 1000 : null
  )

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (phase !== 'waiting') return
    const tick = () => {
      if (!deadlineRef.current) return
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) setPhase('ready')
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [phase])

  function startCountdown(seconds: number) {
    deadlineRef.current = Date.now() + seconds * 1000
    setRemaining(seconds)
    setPhase(seconds > 0 ? 'waiting' : 'ready')
  }

  async function openForm() {
    setError('')
    const url = safeHttpUrl(formLink)
    if (!url) {
      setError('This survey link is invalid. Please report it.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')

    if (phase !== 'idle') return

    setPhase('starting')
    const { data, error: rpcError } = await supabase.rpc('start_fill', { form_id_input: formId })
    if (rpcError) {
      setError(rpcError.message)
      setPhase('idle')
      return
    }
    startCountdown(Number((data as any)?.remaining_seconds ?? minSeconds))
  }

  async function claim() {
    setPhase('claiming')
    setError('')

    const { data, error: rpcError } = await supabase.rpc('fill_form', {
      form_id_input:     formId,
      referrer_id_input: referrerId ?? null,
    })

    if (rpcError) {
      const tooSoon = rpcError.message.match(/TOO_SOON:(\d+)/)
      if (tooSoon) {
        startCountdown(parseInt(tooSoon[1], 10))
        return
      }
      if (rpcError.message.includes('OPEN_FIRST')) {
        setError('Please open the survey first.')
        setPhase('idle')
        return
      }
      if (rpcError.message.includes('Already filled')) {
        setPhase('done')
        router.refresh()
        return
      }
      setError(rpcError.message)
      setPhase('ready')
      return
    }

    const pts = Number((data as any)?.points_earned)
    if (pts) setEarned(pts)
    setPhase('done')
    router.refresh()
  }

  if (!isLoggedIn) {
    return (
      <Link href="/auth"
        className="w-full flex items-center justify-center gap-2 bg-[#1e1a1d] text-white py-4 rounded-2xl text-xs font-bold hover:bg-black transition-colors shadow-lg">
        <LogIn size={15} /> Sign in to fill & earn +{pointsReward} pts
      </Link>
    )
  }

  if (isOwner) {
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center text-xs font-medium text-slate-500">
        This is your survey. Share it to get more responses!
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
        <CheckCircle className="text-emerald-500 mx-auto mb-2" size={28} />
        <p className="font-bold text-emerald-700 text-sm">You filled this survey!</p>
        <p className="text-xs text-emerald-600 mt-0.5 font-medium">+{earned} points added to your account</p>
      </div>
    )
  }

  if (phase === 'idle' || phase === 'starting') {
    return (
      <div className="space-y-2">
        {error && <ErrorBox msg={error} />}
        <button onClick={openForm} disabled={phase === 'starting'}
          className="w-full flex items-center justify-center gap-2 bg-[#1e1a1d] text-white py-4 rounded-2xl text-xs font-bold hover:bg-black active:scale-[0.99] transition-all shadow-lg disabled:opacity-60">
          {phase === 'starting'
            ? <><Loader2 size={15} className="animate-spin" /> Opening…</>
            : <><ExternalLink size={15} /> Open & fill this survey · +{pointsReward} pts</>}
        </button>
      </div>
    )
  }

  const progress = Math.min(1, Math.max(0, 1 - remaining / minSeconds))

  return (
    <div className="space-y-3">
      {error && <ErrorBox msg={error} />}

      <div className="rounded-2xl bg-[#1e1a1d] p-5 text-white space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Timer size={16} className={phase === 'waiting' ? 'text-amber-300' : 'text-emerald-400'} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold">Survey opened in a new tab</p>
            <p className="text-xs text-white/40 mt-0.5 leading-relaxed">
              Complete it, then come back here to claim your points.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${phase === 'waiting' ? 'bg-amber-300' : 'bg-emerald-400'}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 text-right tabular-nums">
            {phase === 'waiting' ? `Claim unlocks in ${formatTime(remaining)}` : 'Ready to claim'}
          </p>
        </div>
      </div>

      <button
        onClick={claim}
        disabled={phase !== 'ready'}
        className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-4 rounded-2xl text-xs font-bold hover:bg-emerald-600 active:scale-[0.99] transition-all shadow-lg shadow-emerald-500/20 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
      >
        {phase === 'claiming' ? (
          <><Loader2 size={15} className="animate-spin" /> Awarding points…</>
        ) : phase === 'waiting' ? (
          <><Timer size={15} /> Available in {formatTime(remaining)}</>
        ) : (
          <><CheckCircle size={15} /> I've finished · claim +{pointsReward} pts</>
        )}
      </button>

      <button onClick={openForm}
        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-[#1e1a1d] transition-colors">
        <RotateCw size={11} /> Reopen survey
      </button>

      <p className="text-[10px] text-slate-400 text-center font-medium">
        Claiming without actually filling the survey may get your account flagged.
      </p>
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
      <AlertCircle size={14} className="shrink-0" /> {msg}
    </div>
  )
}
