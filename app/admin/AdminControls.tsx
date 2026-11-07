'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import {
  Flag, Users, FileText, Search, Check, AlertTriangle, Trash2, Ban, ShieldCheck,
  Loader2, ExternalLink, Eye, EyeOff, Clock, X,
} from 'lucide-react'


type ReportItem = { reason: string; note: string | null; status: string; created_at: string; reporter: string | null }

type ReportGroup = {
  form_id: string
  title: string
  link: string
  is_active: boolean
  moderation_status: string
  owner_id: string | null
  owner_username: string | null
  owner_name: string | null
  owner_strikes: number | null
  owner_banned_until: string | null
  report_count: number
  open_count: number
  last_report_at: string
  reports: ReportItem[]
}

type User = {
  id: string
  name: string | null
  username: string | null
  institution: string | null
  specialty: string | null
  points: number | null
  strikes: number | null
  banned_until: string | null
  ban_reason: string | null
  is_admin: boolean | null
}

type Form = {
  id: string
  title: string
  user_id: string
  is_active: boolean
  moderation_status: string
  fill_count: number
  created_at: string
}

const REASON_LABELS: Record<string, string> = {
  offensive:    'Offensive',
  not_a_survey: 'Not a survey',
  spam:         'Spam',
  other:        'Other',
}

const BAN_OPTIONS = [
  { label: '7 days',    days: 7 },
  { label: '30 days',   days: 30 },
  { label: 'Permanent', days: null },
]

function isBanned(until: string | null) {
  return !!until && new Date(until).getTime() > Date.now()
}

function banLabel(until: string | null) {
  if (!until) return ''
  const d = new Date(until)
  if (d.getFullYear() - new Date().getFullYear() > 50) return 'Banned permanently'
  return `Banned until ${d.toLocaleDateString()}`
}

function niceError(msg: string) {
  if (msg.includes('NOT_ADMIN')) return 'You are not an admin.'
  if (msg.includes('Cannot ban an admin')) return 'You cannot ban an admin.'
  if (msg.includes('Cannot ban yourself')) return 'You cannot ban yourself.'
  return msg
}


export default function AdminControls({
  reportGroups, users, forms, myId,
}: {
  reportGroups: ReportGroup[]
  users: User[]
  forms: Form[]
  myId: string
}) {
  const [tab, setTab]                 = useState<'reports' | 'users' | 'forms'>('reports')
  const [search, setSearch]           = useState('')
  const [showResolved, setShowResolved] = useState(false)

  const openCount = reportGroups.reduce((n, g) => n + Number(g.open_count), 0)
  const q = search.trim().toLowerCase()

  const visibleReports = reportGroups
    .filter(g => showResolved || Number(g.open_count) > 0)
    .filter(g => !q || g.title?.toLowerCase().includes(q) || g.owner_username?.toLowerCase().includes(q))

  const visibleUsers = users.filter(u =>
    !q || u.username?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q)
  )

  const visibleForms = forms.filter(f => !q || f.title?.toLowerCase().includes(q))

  const userById = Object.fromEntries(users.map(u => [u.id, u]))

  return (
    <div className="space-y-5">
      {/* tabs*/}
      <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl">
        <TabButton active={tab === 'reports'} onClick={() => setTab('reports')} icon={<Flag size={13} />}
          label="Reports" badge={openCount} />
        <TabButton active={tab === 'users'} onClick={() => setTab('users')} icon={<Users size={13} />}
          label={`Users (${users.length})`} />
        <TabButton active={tab === 'forms'} onClick={() => setTab('forms')} icon={<FileText size={13} />}
          label={`Surveys (${forms.length})`} />
      </div>

      {/* search*/}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={tab === 'forms' ? 'Search surveys…' : tab === 'users' ? 'Search users…' : 'Search reports by survey or @username…'}
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-300 transition-all"
        />
      </div>

      {/* reports */}
      {tab === 'reports' && (
        <div className="space-y-3">
          <label className="flex items-center justify-end gap-2 text-[11px] font-bold text-slate-400 cursor-pointer select-none">
            <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)}
              className="accent-emerald-500" />
            Show resolved
          </label>

          {visibleReports.length === 0 ? (
            <Empty icon={<Check size={22} />} title="All clear" text="No open reports right now." />
          ) : (
            visibleReports.map(g => <ReportCard key={g.form_id} group={g} />)
          )}
        </div>
      )}

      {/* users */}
      {tab === 'users' && (
        <div className="space-y-2">
          {visibleUsers.length === 0
            ? <Empty icon={<Users size={22} />} title="No users found" text="Try another name." />
            : visibleUsers.map(u => <UserRow key={u.id} user={u} isMe={u.id === myId} />)}
        </div>
      )}

      {/* survey*/}
      {tab === 'forms' && (
        <div className="space-y-2">
          {visibleForms.length === 0
            ? <Empty icon={<FileText size={22} />} title="No surveys found" text="Try another title." />
            : visibleForms.map(f => <FormRow key={f.id} form={f} owner={userById[f.user_id]} />)}
        </div>
      )}
    </div>
  )
}


function ReportCard({ group: g }: { group: ReportGroup }) {
  const [mode, setMode]       = useState<null | 'warn' | 'remove' | 'ban'>(null)
  const [message, setMessage] = useState('')
  const [banDays, setBanDays] = useState<number | null>(30)
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')
  const [doneMsg, setDoneMsg] = useState('')
  const router   = useRouter()
  const supabase = createClient()

  const open    = Number(g.open_count) > 0
  const banned  = isBanned(g.owner_banned_until)
  const strikes = g.owner_strikes ?? 0

 
  const reasonCounts = g.reports.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1
    return acc
  }, {})

  async function run(fn: () => PromiseLike<{ data: any; error: any }>, success: string) {
    setBusy(true); setError('')
    const { data, error: rpcError } = await fn()
    setBusy(false)
    if (rpcError) { setError(niceError(rpcError.message)); return }
    const s = data?.strikes
    setDoneMsg(s != null ? `${success} · strike ${s}${s % 3 === 0 ? ' → auto-banned 30 days' : ''}` : success)
    setMode(null); setMessage('')
    router.refresh()
  }

  const dismiss  = () => run(() => supabase.rpc('admin_dismiss_reports', { form_id_input: g.form_id }), 'Reports dismissed')
  const warn     = () => run(() => supabase.rpc('admin_warn', { form_id_input: g.form_id, message_input: message }), 'Warning sent')
  const remove   = () => run(() => supabase.rpc('admin_remove_form', { form_id_input: g.form_id, message_input: message }), 'Survey removed')
  const banOwner = () => g.owner_id && run(() => supabase.rpc('admin_ban_user', {
    user_id_input: g.owner_id, days_input: banDays, reason_input: message,
  }), 'Researcher banned')

  return (
    <div className={`rounded-3xl border p-5 sm:p-6 space-y-4 transition-all ${
      open ? 'bg-white border-slate-100 shadow-lg shadow-slate-200/40' : 'bg-slate-50/60 border-slate-100 opacity-70'
    }`}>
      {/* add*/}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <Link href={`/forms/${g.form_id}`} className="font-bold text-sm text-slate-800 hover:text-emerald-600 transition-colors break-words">
            {g.title}
          </Link>
          <div className="flex items-center gap-1.5 flex-wrap">
            {g.owner_username && (
              <Link href={`/u/${g.owner_username}`} className="text-[11px] font-semibold text-slate-400 hover:text-slate-700">
                @{g.owner_username}
              </Link>
            )}
            {strikes > 0 && <Pill tone="amber"><AlertTriangle size={9} /> {strikes} strike{strikes > 1 ? 's' : ''}</Pill>}
            {banned && <Pill tone="rose"><Ban size={9} /> {banLabel(g.owner_banned_until)}</Pill>}
            {g.moderation_status === 'under_review' && <Pill tone="slate"><EyeOff size={9} /> Auto-hidden</Pill>}
            {!open && <Pill tone="emerald"><Check size={9} /> Resolved</Pill>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-2xl font-black tabular-nums leading-none ${open ? 'text-rose-500' : 'text-slate-300'}`}>{g.open_count}</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">open / {g.report_count}</p>
        </div>
      </div>

      {/* reason*/}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(reasonCounts).map(([reason, n]) => (
          <span key={reason} className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
            {REASON_LABELS[reason] ?? reason} · {n}
          </span>
        ))}
      </div>

      {/* notes*/}
      {g.reports.some(r => r.note) && (
        <div className="space-y-1.5">
          {g.reports.filter(r => r.note).slice(0, 4).map((r, i) => (
            <p key={i} className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5">
              <span className="italic">"{r.note}"</span>
              <span className="text-slate-300 font-semibold"> · {r.reporter ? `@${r.reporter}` : 'anonymous'}</span>
            </p>
          ))}
        </div>
      )}

      <a href={g.link} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-700">
        <ExternalLink size={11} /> Open survey link
      </a>

      {doneMsg && (
        <p className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-2.5 flex items-center gap-1.5">
          <Check size={12} /> {doneMsg}
        </p>
      )}
      {error && (
        <p className="text-[11px] font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-2.5">{error}</p>
      )}

      {/* btn*/}
      {mode === null ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <ActionButton onClick={dismiss} disabled={busy || !open} tone="slate" icon={<Check size={13} />}>Dismiss</ActionButton>
          <ActionButton onClick={() => setMode('warn')} disabled={busy} tone="amber" icon={<AlertTriangle size={13} />}>Warn</ActionButton>
          <ActionButton onClick={() => setMode('remove')} disabled={busy} tone="rose" icon={<Trash2 size={13} />}>Remove</ActionButton>
          <ActionButton onClick={() => setMode('ban')} disabled={busy || banned || !g.owner_id} tone="dark" icon={<Ban size={13} />}>Ban owner</ActionButton>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#1e1a1d] p-4 space-y-3 text-white">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
              {mode === 'warn' ? 'Send warning (+1 strike)' : mode === 'remove' ? 'Remove survey (+1 strike)' : 'Ban researcher'}
            </p>
            <button onClick={() => { setMode(null); setError('') }} className="text-white/40 hover:text-white">
              <X size={14} />
            </button>
          </div>

          {mode === 'ban' && (
            <div className="grid grid-cols-3 gap-2">
              {BAN_OPTIONS.map(o => (
                <button key={o.label} type="button" onClick={() => setBanDays(o.days)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    banDays === o.days ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          )}

          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={mode === 'ban' ? 'Reason shown to the researcher (optional)' : 'Message to the researcher (optional)'}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 resize-none"
          />

          {mode === 'warn' && strikes % 3 === 2 && (
            <p className="text-[11px] font-bold text-amber-300">This will be strike 3 → automatic 30-day ban.</p>
          )}

          <button
            onClick={mode === 'warn' ? warn : mode === 'remove' ? remove : banOwner}
            disabled={busy}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-colors disabled:opacity-60 ${
              mode === 'warn' ? 'bg-amber-400 text-[#1e1a1d] hover:bg-amber-300' : 'bg-rose-500 text-white hover:bg-rose-600'
            }`}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : null}
            {mode === 'warn' ? 'Send warning' : mode === 'remove' ? 'Remove survey' : 'Confirm ban'}
          </button>
        </div>
      )}
    </div>
  )
}


function UserRow({ user: u, isMe }: { user: User; isMe: boolean }) {
  const [banOpen, setBanOpen] = useState(false)
  const [banDays, setBanDays] = useState<number | null>(30)
  const [reason, setReason]   = useState('')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')
  const router   = useRouter()
  const supabase = createClient()

  const banned  = isBanned(u.banned_until)
  const strikes = u.strikes ?? 0

  async function ban() {
    setBusy(true); setError('')
    const { error: e } = await supabase.rpc('admin_ban_user', { user_id_input: u.id, days_input: banDays, reason_input: reason })
    setBusy(false)
    if (e) { setError(niceError(e.message)); return }
    setBanOpen(false); setReason('')
    router.refresh()
  }

  async function unban() {
    setBusy(true); setError('')
    const { error: e } = await supabase.rpc('admin_unban_user', { user_id_input: u.id })
    setBusy(false)
    if (e) { setError(niceError(e.message)); return }
    router.refresh()
  }

  return (
    <div className={`rounded-3xl border px-5 py-4 space-y-3 ${banned ? 'bg-rose-50/40 border-rose-100' : 'bg-white border-slate-100'}`}>
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-sm text-slate-800 truncate">{u.name || '(no name)'}</p>
            {u.username && (
              <Link href={`/u/${u.username}`} className="text-[11px] font-semibold text-slate-400 hover:text-slate-700">@{u.username}</Link>
            )}
            {u.is_admin && <Pill tone="emerald"><ShieldCheck size={9} /> Admin</Pill>}
            {strikes > 0 && <Pill tone="amber"><AlertTriangle size={9} /> {strikes}</Pill>}
            {banned && <Pill tone="rose"><Ban size={9} /> {banLabel(u.banned_until)}</Pill>}
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
            {u.points ?? 0} pts
            {u.specialty && ` · ${u.specialty}`}
            {u.institution && ` · ${u.institution}`}
          </p>
          {banned && u.ban_reason && <p className="text-[11px] text-rose-400 font-medium mt-0.5 truncate">"{u.ban_reason}"</p>}
        </div>

        {!isMe && !u.is_admin && (
          banned ? (
            <button onClick={unban} disabled={busy}
              className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Unban
            </button>
          ) : (
            <button onClick={() => setBanOpen(o => !o)}
              className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl hover:bg-rose-100 transition-colors">
              <Ban size={12} /> Ban
            </button>
          )
        )}
      </div>

      {banOpen && !banned && (
        <div className="rounded-2xl bg-[#1e1a1d] p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {BAN_OPTIONS.map(o => (
              <button key={o.label} type="button" onClick={() => setBanDays(o.days)}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  banDays === o.days ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
          <input value={reason} onChange={e => setReason(e.target.value)} maxLength={300}
            placeholder="Reason shown to the user (optional)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/25" />
          <button onClick={ban} disabled={busy}
            className="w-full flex items-center justify-center gap-2 bg-rose-500 text-white py-3 rounded-xl text-xs font-bold hover:bg-rose-600 transition-colors disabled:opacity-60">
            {busy && <Loader2 size={13} className="animate-spin" />} Confirm ban
          </button>
        </div>
      )}

      {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}
    </div>
  )
}


function FormRow({ form: f, owner }: { form: Form; owner?: User }) {
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')
  const router   = useRouter()
  const supabase = createClient()

  async function toggle() {
    setBusy(true); setError('')
    const { error: e } = await supabase.rpc('admin_toggle_form', { form_id_input: f.id, active_input: !f.is_active })
    setBusy(false)
    if (e) { setError(niceError(e.message)); return }
    router.refresh()
  }

  return (
    <div className={`rounded-3xl border px-5 py-4 flex items-center gap-4 ${f.is_active ? 'bg-white border-slate-100' : 'bg-slate-50/60 border-slate-100'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link href={`/forms/${f.id}`} className={`font-bold text-sm hover:text-emerald-600 transition-colors truncate ${f.is_active ? 'text-slate-800' : 'text-slate-400'}`}>
            {f.title}
          </Link>
          {f.moderation_status === 'under_review' && <Pill tone="slate"><EyeOff size={9} /> Under review</Pill>}
          {f.moderation_status === 'banned' && <Pill tone="rose"><Ban size={9} /> Owner banned</Pill>}
          {!f.is_active && f.moderation_status === 'ok' && <Pill tone="slate">Inactive</Pill>}
        </div>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
          {owner?.username && <span>@{owner.username}</span>}
          <span>· {f.fill_count ?? 0} responses</span>
          <span className="flex items-center gap-0.5">· <Clock size={9} /> {new Date(f.created_at).toLocaleDateString()}</span>
        </p>
        {error && <p className="text-[11px] font-bold text-rose-500 mt-1">{error}</p>}
      </div>
      <button onClick={toggle} disabled={busy}
        className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl border transition-colors disabled:opacity-50 ${
          f.is_active
            ? 'text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100'
            : 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100'
        }`}>
        {busy ? <Loader2 size={12} className="animate-spin" /> : f.is_active ? <EyeOff size={12} /> : <Eye size={12} />}
        {f.is_active ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}


function TabButton({ active, onClick, icon, label, badge }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
        active ? 'bg-[#1e1a1d] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
      }`}>
      {icon} <span className="truncate">{label}</span>
      {!!badge && badge > 0 && (
        <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  )
}

function ActionButton({ onClick, disabled, tone, icon, children }: {
  onClick: () => void; disabled?: boolean; tone: 'slate' | 'amber' | 'rose' | 'dark'; icon: React.ReactNode; children: React.ReactNode
}) {
  const tones = {
    slate: 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100',
    amber: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100',
    rose:  'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100',
    dark:  'text-white bg-[#1e1a1d] border-[#1e1a1d] hover:bg-black',
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${tones[tone]}`}>
      {icon} {children}
    </button>
  )
}

function Pill({ tone, children }: { tone: 'amber' | 'rose' | 'slate' | 'emerald'; children: React.ReactNode }) {
  const tones = {
    amber:   'text-amber-700 bg-amber-50 border-amber-200',
    rose:    'text-rose-600 bg-rose-50 border-rose-200',
    slate:   'text-slate-500 bg-slate-100 border-slate-200',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold border px-2 py-0.5 rounded-full ${tones[tone]}`}>
      {children}
    </span>
  )
}

function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="border border-dashed border-slate-200 rounded-[2rem] text-center py-14 bg-slate-50 space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mx-auto text-slate-300 shadow-sm">
        {icon}
      </div>
      <p className="font-bold text-slate-800 text-sm">{title}</p>
      <p className="text-xs text-slate-400">{text}</p>
    </div>
  )
}
