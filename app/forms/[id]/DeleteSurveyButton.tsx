'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'

export default function DeleteSurveyButton({ formId, fillCount }: { formId: string; fillCount: number }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const supabase = createClient()

  async function remove() {
    setLoading(true); setError('')
    const { error: rpcError } = await supabase.rpc('delete_my_form', { form_id_input: formId })
    if (rpcError) {
      setError(rpcError.message.includes('NOT_OWNER') ? 'You can only delete your own surveys.' : rpcError.message)
      setLoading(false)
      return
    }
    window.location.href = '/'
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)}
        className="shrink-0 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-500 bg-white border border-rose-200 px-5 py-3 rounded-2xl hover:bg-rose-50 transition-colors">
        <Trash2 size={13} /> Delete
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
      onClick={() => !loading && setConfirming(false)}>
      <div className="w-full max-w-sm rounded-[2rem] bg-[#1e1a1d] border border-white/10 p-7 text-white shadow-2xl space-y-5"
        onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle size={22} className="text-rose-400" />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="text-lg font-black">Delete this survey?</h3>
          <p className="text-xs text-white/50 leading-relaxed">
            It will be removed from the feed permanently. This can't be undone.
            {fillCount > 0 && <> Participants keep the points they earned from its {fillCount} response{fillCount === 1 ? '' : 's'}.</>}
          </p>
        </div>

        {error && <p className="text-[11px] font-bold text-rose-400 text-center">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setConfirming(false)} disabled={loading}
            className="py-3 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={remove} disabled={loading}
            className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-60">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
