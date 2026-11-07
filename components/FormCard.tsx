'use client'

import Link from 'next/link'
import { Clock, Trophy, Users, ChevronRight, Zap } from 'lucide-react'
import type { FormFeedItem } from '@/lib/types'
import { getAvatarGradient } from '@/components/Avatar'
import { basePoints, EARLY_BIRD_LIMIT, EARLY_BIRD_BONUS } from '@/lib/points'

export default function FormCard({
  form, rank, highlighted, index = 0,
}: {
  form: FormFeedItem
  rank: number
  highlighted?: boolean
  index?: number
}) {
  const fills     = form.fill_count ?? 0
  const isEarly   = fills < EARLY_BIRD_LIMIT
  const pts       = basePoints(form.estimated_minutes) + (isEarly ? EARLY_BIRD_BONUS : 0)
  const spotsLeft = EARLY_BIRD_LIMIT - fills

  const authorLabel = form.submitter_username || form.submitter_name || 'Anonymous'
  const delay = Math.min(index * 40, 300)

  const rankStyles =
    rank === 1 ? 'bg-amber-400/15 text-amber-600 border-amber-400/30' :
    rank === 2 ? 'bg-slate-300/25 text-slate-500 border-slate-300/40' :
    rank === 3 ? 'bg-orange-400/15 text-orange-700 border-orange-400/30' :
                 'bg-slate-50 text-slate-400 border-slate-100'

  return (
    <Link
      href={`/forms/${form.id}`}
      className="block group outline-none animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`
        relative h-full flex flex-col overflow-hidden rounded-[2rem] px-6 py-6 bg-white border
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(30,26,29,0.12)]
        ${highlighted
          ? 'border-emerald-400/40 shadow-[0_0_0_4px_rgba(16,185,129,0.06)]'
          : 'border-slate-100 hover:border-slate-200'}
      `}>

        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-xl border font-black italic text-[11px] transition-transform group-hover:scale-110 ${rankStyles}`}>
              #{rank}
            </span>
            {form.specialty && (
              <span className="truncate text-[9px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                {form.specialty}
              </span>
            )}
          </div>
          <ChevronRight size={16} className="shrink-0 text-slate-200 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </div>

        <h3 className="font-bold text-[17px] leading-snug text-slate-800 group-hover:text-black transition-colors line-clamp-2 break-words">
          {form.title}
        </h3>
        {form.description && (
          <p className="mt-2 text-xs text-slate-400 font-medium leading-relaxed line-clamp-2 break-words">
            {form.description}
          </p>
        )}

        {isEarly && (
          <div className="mt-4 inline-flex w-fit items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
            <Zap size={10} className="fill-amber-400 text-amber-500" />
            Early bird · {spotsLeft} spot{spotsLeft === 1 ? '' : 's'} left
          </div>
        )}

        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400 tabular-nums">
                <Clock size={12} /> {form.estimated_minutes}m
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400 tabular-nums">
                <Users size={12} /> {fills}
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] font-black text-emerald-600 tabular-nums">
                <Trophy size={11} /> +{pts}
              </span>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <div className={`shrink-0 w-6 h-6 rounded-full bg-gradient-to-br ${getAvatarGradient(authorLabel)} flex items-center justify-center text-[10px] font-black text-white ring-2 ring-white shadow-sm`}>
                {authorLabel[0]?.toUpperCase()}
              </div>
              <span className="truncate text-[10px] font-bold text-slate-400 max-w-[90px]">
                @{form.submitter_username || 'anon'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
