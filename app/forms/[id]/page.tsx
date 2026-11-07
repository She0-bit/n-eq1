import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import FillButton from './FillButton'
import ShareButton from '@/components/ShareButton'
import ReportButton from './ReportButton'
import DeleteSurveyButton from './DeleteSurveyButton'
import { Clock, Users, Trophy, ChevronLeft, ExternalLink, UserCheck, MapPin, Pencil, Sparkles, Zap, Target, Check } from 'lucide-react'
import Link from 'next/link'
import { roleLabel, type FormFeedItem } from '@/lib/types'
import { getAvatarGradient } from '@/components/Avatar'
import { calcPoints, matchesTarget, minFillSeconds, EARLY_BIRD_LIMIT } from '@/lib/points'

export const revalidate = 0

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null
  } catch {
    return null
  }
}

export default async function FormDetailPage({
  params,
  searchParams,
}: {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ ref?: string }>
}) {
  const { id }  = await params
  const { ref } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let { data: form } = await supabase
    .from('forms_feed').select('*').eq('id', id).maybeSingle()

  if (!form && user) {
    const { data: own } = await supabase
      .from('forms').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
    if (own) {
      const { data: me } = await supabase
        .from('profiles').select('name, username, institution').eq('id', user.id).maybeSingle()
      form = {
        ...own,
        submitter_name:        me?.name ?? null,
        submitter_username:    me?.username ?? null,
        submitter_institution: me?.institution ?? null,
      }
    }
  }

  if (!form) notFound()

  const f = form as FormFeedItem
  const criteria = f.sample_criteria

  let alreadyFilled = false
  let isOwner = false
  let isActive = true
  let viewerProfile: any = null
  let sessionStartedAt: string | null = null

  if (user) {
    isOwner = user.id === f.user_id

    const [{ data: fill }, { data: prof }] = await Promise.all([
      supabase.from('fills').select('id').eq('user_id', user.id).eq('form_id', id).maybeSingle(),
      supabase.from('profiles').select('role, country, sex, age').eq('id', user.id).maybeSingle(),
    ])
    alreadyFilled = !!fill
    viewerProfile = prof

    if (!isOwner && !alreadyFilled) {
      const { data: session } = await supabase
        .from('fill_sessions').select('started_at')
        .eq('user_id', user.id).eq('form_id', id).maybeSingle()
      sessionStartedAt = session?.started_at ?? null
    }

    if (isOwner) {
      const { data: formRow } = await supabase
        .from('forms').select('is_active').eq('id', id).single()
      isActive = formRow?.is_active !== false
    }
  }

  const { data: timing } = await supabase.rpc('get_form_timing', { form_id_input: id })
  const effectiveMinutes: number = (timing as any)?.effective_minutes ?? f.estimated_minutes
  const timingSamples: number    = Number((timing as any)?.samples ?? 0)
  const isAdjusted = effectiveMinutes < f.estimated_minutes

  const minSeconds = minFillSeconds(f.estimated_minutes)
  const sessionRemaining = sessionStartedAt
    ? Math.max(0, minSeconds - Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 1000))
    : null

  const isMatch = matchesTarget(criteria, viewerProfile)
  const points  = calcPoints({ minutes: effectiveMinutes, fillCount: f.fill_count ?? 0, isMatch })
  const pointsReward = points.total

  const hasRoles     = (criteria?.roles?.length ?? 0) > 0
  const hasSex       = criteria?.sex && criteria.sex !== 'any'
  const hasAge       = criteria?.min_age != null || criteria?.max_age != null
  const hasCountries = (criteria?.countries?.length ?? 0) > 0
  const hasOther     = !!criteria?.other
  const hasCriteria  = hasRoles || hasSex || hasAge || hasCountries || hasOther

  const surveyUrl = safeHttpUrl(f.link)
  const referrerId = ref && UUID_RE.test(ref) && ref !== user?.id ? ref : null

  const authorLabel = f.submitter_username || f.submitter_name || 'Anonymous'
  const authorGradient = getAvatarGradient(authorLabel)

  const ageText =
    criteria?.min_age != null && criteria?.max_age != null ? `Age ${criteria.min_age}–${criteria.max_age}` :
    criteria?.min_age != null ? `Age ${criteria.min_age}+` :
    criteria?.max_age != null ? `Under ${criteria.max_age + 1}` : ''

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-6 bg-white text-slate-900 min-h-screen animate-fade-in">

      <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-[#1e1a1d] transition-colors">
        <ChevronLeft size={18} /> Back to feed
      </Link>

      <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-b from-[#1e1a1d] to-[#2b2427] border border-white/10 px-6 py-8 sm:px-10 sm:py-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.35)] text-white">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/[0.06] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {f.specialty && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl">
                {f.specialty}
              </span>
            )}
            {!isActive && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                Inactive
              </span>
            )}
            {alreadyFilled && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/25 px-3 py-1.5 rounded-xl">
                <Check size={11} strokeWidth={3} /> Completed
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug mb-6 break-words">{f.title}</h1>

          {f.submitter_username ? (
            <Link href={`/u/${f.submitter_username}`} className="inline-flex items-center gap-3 group">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${authorGradient} flex items-center justify-center text-sm font-black text-white shrink-0 ring-2 ring-white/10 group-hover:scale-95 transition-transform`}>
                {authorLabel[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors leading-tight">
                  @{f.submitter_username}
                </p>
                {f.submitter_institution && (
                  <p className="text-white/40 text-xs font-medium truncate">{f.submitter_institution}</p>
                )}
              </div>
            </Link>
          ) : (
            <p className="text-xs text-white/40 font-medium">by {authorLabel}</p>
          )}

          <div className="grid grid-cols-3 gap-2.5 mt-8">
            <StatTile icon={<Clock size={14} />} value={effectiveMinutes} label={isAdjusted ? 'min · real avg' : 'min'} />
            <StatTile icon={<Users size={14} />} value={f.fill_count ?? 0} label="responses" />
            <StatTile icon={<Trophy size={14} />} value={`+${pointsReward}`} label="pts for you" highlight />
          </div>
        </div>
      </div>

      <div className="rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/50 px-6 py-7 sm:px-8 space-y-6">

        {f.description && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">About this study</p>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{f.description}</p>
          </div>
        )}

        {hasCriteria && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Who this survey is for</p>
              {user && !isOwner && isMatch && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                  <Target size={10} /> You match
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {hasRoles && criteria!.roles.map(r => (
                <Chip key={r} icon={<UserCheck size={11} />}>{roleLabel(r)}</Chip>
              ))}
              {hasSex && <Chip><span className="capitalize">{criteria!.sex} only</span></Chip>}
              {hasAge && <Chip>{ageText}</Chip>}
              {hasCountries && criteria!.countries.map(c => (
                <Chip key={c} icon={<MapPin size={10} />}>{c}</Chip>
              ))}
            </div>
            {hasOther && (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 italic">"{criteria!.other}"</p>
            )}
          </div>
        )}

        {!isOwner && !alreadyFilled && (
          <div className="rounded-3xl bg-[#1e1a1d] p-5 text-white space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Your reward</p>
            <PointsRow icon={<Clock size={12} />} label={`Survey length (${effectiveMinutes} min${isAdjusted ? `, from ${timingSamples} responses` : ''})`} value={points.base} />
            <PointsRow
              icon={<Zap size={12} />}
              label={`Early bird · first ${EARLY_BIRD_LIMIT} responders`}
              value={points.early}
              muted={points.early === 0}
            />
            {hasCriteria && (
              <PointsRow
                icon={<Target size={12} />}
                label={user ? 'Matches target audience' : 'Matches target audience (sign in)'}
                value={points.match}
                muted={points.match === 0}
              />
            )}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-xs font-bold text-white/60 flex items-center gap-1.5"><Sparkles size={12} className="text-emerald-400" /> Total</span>
              <span className="text-lg font-black text-emerald-400 tabular-nums">+{points.total} pts</span>
            </div>
          </div>
        )}

        <FillButton
          formId={f.id}
          formLink={f.link}
          estimatedMinutes={f.estimated_minutes}
          pointsReward={pointsReward}
          isLoggedIn={!!user}
          isOwner={isOwner}
          alreadyFilled={alreadyFilled}
          referrerId={referrerId}
          minSeconds={minSeconds}
          sessionRemaining={sessionRemaining}
        />

        {isOwner && (
          <div className="flex gap-2">
            <Link href={`/forms/${f.id}/edit`}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold bg-[#1e1a1d] text-white py-3 rounded-2xl hover:bg-black transition-colors">
              <Pencil size={13} /> Edit survey
            </Link>
            <DeleteSurveyButton formId={f.id} fillCount={f.fill_count ?? 0} />
          </div>
        )}

        {!isOwner && <ShareButton formId={f.id} />}
        {!isOwner && user && <ReportButton formId={f.id} />}

        {surveyUrl && (
          <a href={surveyUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-[#1e1a1d] transition-colors">
            <ExternalLink size={12} /> Open survey directly in new tab
          </a>
        )}
      </div>
    </div>
  )
}

function StatTile({ icon, value, label, highlight = false }: {
  icon: React.ReactNode; value: React.ReactNode; label: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-2xl p-4 text-center border backdrop-blur-sm ${
      highlight ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-white/[0.04] border-white/5'
    }`}>
      <div className={`flex justify-center mb-2 ${highlight ? 'text-emerald-400' : 'text-white/30'}`}>{icon}</div>
      <p className={`text-2xl font-black tabular-nums leading-none ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
      <p className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 ${highlight ? 'text-emerald-400/70' : 'text-white/30'}`}>{label}</p>
    </div>
  )
}

function Chip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
      {icon && <span className="text-slate-400">{icon}</span>}
      {children}
    </span>
  )
}

function PointsRow({ icon, label, value, muted = false }: {
  icon: React.ReactNode; label: string; value: number; muted?: boolean
}) {
  return (
    <div className={`flex items-center justify-between text-xs ${muted ? 'opacity-35' : ''}`}>
      <span className="flex items-center gap-2 font-medium text-white/70">
        <span className="text-white/40">{icon}</span> {label}
      </span>
      <span className="font-bold tabular-nums">{value > 0 ? `+${value}` : '—'}</span>
    </div>
  )
}
