'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { SPECIALTY_GROUPS } from '@/lib/types'
import { useState, useEffect } from 'react'

const DURATION_OPTIONS = [
  { label: 'Any length', value: '' },
  { label: 'Quick (≤ 5 min)',   value: '5' },
  { label: 'Short (≤ 15 min)',  value: '15' },
  { label: 'Medium (≤ 30 min)', value: '30' },
]

export default function FeedFilters() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const currentQ         = searchParams.get('q') ?? ''
  const currentSpecialty = searchParams.get('specialty') ?? ''
  const currentMaxMin    = searchParams.get('max_min') ?? ''

  const [searchVal, setSearchVal] = useState(currentQ)
  const [showAdvanced, setShowAdvanced] = useState(!!(currentSpecialty || currentMaxMin))

  useEffect(() => { setSearchVal(currentQ) }, [currentQ])

  function navigate(q: string, spec: string, maxMin: string) {
    const params = new URLSearchParams()
    const cleanQ = q.trim().slice(0, 100)
    if (cleanQ) params.set('q', cleanQ)
    if (spec)     params.set('specialty', spec)
    if (maxMin)   params.set('max_min', maxMin)
    
    const limitSug = searchParams.get('limit_sug')
    const limitMain = searchParams.get('limit_main')
    if (limitSug) params.set('limit_sug', limitSug)
    if (limitMain) params.set('limit_main', limitMain)

    router.push(`/?${params.toString()}`)
  }

  function clearAll() {
    setSearchVal('')
    router.push('/')
  }

  const advancedCount = (currentSpecialty ? 1 : 0) + (currentMaxMin ? 1 : 0)
  const hasFilters    = !!(currentQ || currentSpecialty || currentMaxMin)

  return (
    <div id="feed" className="mb-5 space-y-3 animate-fade-in">
      <div className="flex gap-3">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={searchVal}
              maxLength={100}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && navigate(searchVal, currentSpecialty, currentMaxMin)}
              placeholder="Search by title…"
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-800 focus:outline-none focus:border-[#3d353a] transition-all placeholder:text-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={() => navigate(searchVal, currentSpecialty, currentMaxMin)}
            className="sm:hidden bg-[#3d353a] text-white px-4 py-2.5 rounded-xl text-sm font-bold shrink-0 hover:bg-[#1e1a1d] transition-colors"
          >
            Search
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          title="Advanced filters"
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all shrink-0 ${
            showAdvanced || advancedCount > 0
              ? 'bg-[#3d353a] text-white border-[#3d353a] shadow-sm'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          <SlidersHorizontal size={15} />
          <span className="hidden sm:inline">Filters</span>
          {advancedCount > 0 && (
            <span className="text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold">
              {advancedCount}
            </span>
          )}
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="self-center flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-rose-500 whitespace-nowrap transition-colors ml-1"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="bg-white border border-slate-100 rounded-2xl px-5 py-5 flex flex-col sm:flex-row gap-5 shadow-sm animate-fade-in">

          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Research Field / Specialty</p>
            <select
              value={currentSpecialty}
              onChange={e => navigate(searchVal, e.target.value, currentMaxMin)}
              className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm bg-white text-slate-700 focus:outline-none focus:border-[#3d353a] transition-all font-semibold"
            >
              <option value="">All specialties</option>
              {Object.entries(SPECIALTY_GROUPS).map(([group, items]) => (
                <optgroup key={group} label={group} className="text-slate-400 bg-white font-medium">
                  {items.map(s => <option key={s} value={s} className="text-slate-800 font-semibold">{s}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-52">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Max Duration</p>
            <select
              value={DURATION_OPTIONS.some(o => o.value === currentMaxMin) ? currentMaxMin : ''}
              onChange={e => navigate(searchVal, currentSpecialty, e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm bg-white text-slate-700 focus:outline-none focus:border-[#3d353a] transition-all font-semibold"
            >
              {DURATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="text-slate-800 font-semibold">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

        </div>
      )}
    </div>
  )
}
