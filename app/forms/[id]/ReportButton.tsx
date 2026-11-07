'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Flag, Loader2, Check, X, AlertCircle } from 'lucide-react'

const REASONS = [
  { value: 'offensive',    label: 'Offensive or inappropriate' },
  { value: 'not_a_survey', label: 'Not a real survey' },
  { value: 'spam',         label: 'Spam or advertising' },
  { value: 'other',        label: 'Something else' },
]

type Phase = 'checking' | 'idle' | 'open' | 'sending' | 'done'

export default function ReportButton({ formId }: { formId: string }) {
  const [phase, setPhase]   = useState<Phase>('checking')
  const [reason, setReason] = useState('')
  const [note, setNote]     = useState('')
  const [error, setError]   = useState('')
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setPhase('idle'); return }
      const { data } = await supabase
        .from('reports').select('id')
        .eq('form_id', formId).eq('reporter_id', user.id)
        .maybeSingle()
      if (!cancelled) setPhase(data ? 'done' : 'idle')
    })()
    return () => { cancelled = true }
  }, [formId, supabase])

  async function submit() {
    setError('')
    if (!reason) { setError('Please choose a reason.'); return }
    if (reason === 'other' && !note.trim()) { setError('Please tell us what is wrong.'); return }

    setPhase('sending')
    const { error: rpcError } = await supabase.rpc('report_form', {
      form_id_input: formId,
      reason_input:  reason,
      note_input:    note.trim() || null,
    })

    if (rpcError) {
      if (rpcError.message.includes('ALREADY_REPORTED')) { setPhase('done'); return }
      if (rpcError.message.includes('ACCOUNT_BANNED')) {
        setError('Your account is suspended.')
      } else {
        setError(rpcError.message)
      }
      setPhase('open')
      return
    }
    setPhase('done')
  }

  if (phase === 'checking') return null

  if (phase === 'done') {
    return (
      <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400">
        <Check size={12} className="text-emerald-500" /> You reported this survey. Thanks, our team will review it.
      </p>
    )
  }

  if (phase === 'idle') {
    return (
      <button onClick={() => setPhase('open')}
        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-rose-500 transition-colors">
        <Flag size={11} /> Report this survey
      </button>
    )
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Flag size={11} className="text-rose-400" /> Report this survey
        </p>
        <button onClick={() => { setPhase('idle'); setError('') }}
          className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {REASONS.map(r => {
          const active = reason === r.value
          return (
            <button key={r.value} type="button" onClick={() => setReason(r.value)}
              className={`text-left text-xs font-semibold px-4 py-3 rounded-2xl border transition-all ${
                active
                  ? 'bg-[#1e1a1d] text-white border-[#1e1a1d] shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}>
              {r.label}
            </button>
          )
        })}
      </div>

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder={reason === 'other' ? 'Tell us what is wrong (required)' : 'Add details (optional)'}
        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 transition-all resize-none"
      />

      {error && (
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-rose-500">
          <AlertCircle size={12} /> {error}
        </p>
      )}

      <button onClick={submit} disabled={phase === 'sending'}
        className="w-full flex items-center justify-center gap-2 bg-rose-500 text-white py-3 rounded-2xl text-xs font-bold hover:bg-rose-600 transition-colors disabled:opacity-60">
        {phase === 'sending' ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : 'Submit report'}
      </button>

      <p className="text-[10px] text-slate-400 text-center font-medium">
        You can report each survey once. False reports may affect your account.
      </p>
    </div>
  )
}
