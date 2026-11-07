'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

export default function ShareProfileButton({ username }: { username: string }) {
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    const url = `${window.location.origin}/u/${encodeURIComponent(username)}`
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
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold text-white/80 hover:text-white transition-all shadow-sm"
    >
      {copied ? (
        <><Check size={14} /> Link copied!</>
      ) : (
        <><Share2 size={14} /> Share</>
      )}
    </button>
  )
}
