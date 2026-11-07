'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Share2, Copy, Check } from 'lucide-react'

export default function ShareButton({ formId }: { formId: string }) {
  const [userId, setUserId]     = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)
  const [expanded, setExpanded] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [supabase])

  function getShareUrl() {
    const base = window.location.origin
    const path = `/forms/${encodeURIComponent(formId)}`
    return userId ? `${base}${path}?ref=${encodeURIComponent(userId)}` : `${base}${path}`
  }

  async function copy() {
    const url = getShareUrl()
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 text-xs font-bold text-slate-500 border border-slate-200 px-4 py-3 rounded-2xl hover:bg-slate-50 hover:text-[#1e1a1d] transition-colors w-full justify-center"
      >
        <Share2 size={14} />
        Share this survey
      </button>

      {expanded && (
        <div className="mt-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 animate-fade-in">
          <div>
            <p className="text-sm font-bold text-slate-700 mb-0.5">Your referral link</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              {userId
                ? 'When someone opens this link and fills the survey on n=1, you earn 5 pts. It’s a great way to reach people who match the criteria.'
                : 'Sign in to get a personal referral link that earns you points when people fill the survey through it.'}
            </p>
          </div>

          {userId && (
            <>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={getShareUrl()}
                  onFocus={e => e.currentTarget.select()}
                  className="flex-1 min-w-0 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copy}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl border transition-colors shrink-0 ${
                    copied
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white border border-slate-100 rounded-xl px-3 py-2.5 text-center">
                  <p className="font-black text-emerald-600">+5 pts</p>
                  <p className="text-slate-400 mt-0.5">per person who fills via your link</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-xl px-3 py-2.5 text-center">
                  <p className="font-black text-[#1e1a1d]">Once each</p>
                  <p className="text-slate-400 mt-0.5">every person counts one time per survey</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
