'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { SPECIALTY_GROUPS, ROLE_GROUPS, COUNTRIES } from '@/lib/types'
import {
  Link2, Clock, BookOpen, Users, Sparkles, AlertCircle, School, Globe,
  Save, Check, Loader2, ExternalLink, Lock,
} from 'lucide-react'
import { basePoints, EARLY_BIRD_BONUS, MATCH_BONUS } from '@/lib/points'

const TIME_TIERS = [
  { key: 'quick',  label: 'Quick',  range: '≤ 5 min',   minutes: 5  },
  { key: 'short',  label: 'Short',  range: '6–15 min',  minutes: 15 },
  { key: 'medium', label: 'Medium', range: '16–30 min', minutes: 30 },
  { key: 'long',   label: 'Long',   range: '30+ min',   minutes: 45 },
]

function toTier(m: number) {
  if (m <= 5) return 5
  if (m <= 15) return 15
  if (m <= 30) return 30
  return 45
}

const AGE_RANGES = [
  { label: 'General',       min: null as number | null, max: null as number | null },
  { label: 'Under 18',      min: 1,  max: 17 },
  { label: '18 - 25 years', min: 18, max: 25 },
  { label: '26 - 40 years', min: 26, max: 40 },
  { label: '41 - 60 years', min: 41, max: 60 },
  { label: 'Over 60',       min: 61, max: 100 },
]

const ALLOWED_SURVEY_DOMAINS = [
  'forms.gle', 'docs.google.com', 'forms.office.com', 'forms.microsoft.com',
  'surveymonkey.com', 'surveymonkey.co.uk', 'research.net', 'qualtrics.com',
  'notion.so', 'notion.site', 'notion.com',
]

function isValidSurveyLink(urlStr: string): boolean {
  try {
    const url = new URL(urlStr)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
    const host = url.hostname.toLowerCase()
    if (ALLOWED_SURVEY_DOMAINS.some(d => host === d || host.endsWith('.' + d))) return true
    return host.split('.').some(part => part.includes('redcap'))
  } catch { return false }
}

const inputCls  = 'w-full bg-[#312a2f] border border-white/5 rounded-2xl px-5 py-4 text-sm font-medium text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-white/10'
const selectCls = 'w-full bg-[#312a2f] border border-white/5 rounded-2xl px-4 py-4 text-sm font-semibold text-white/90 focus:outline-none focus:border-emerald-500 transition-all'
const labelCls  = 'text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 flex items-center gap-1.5'

export default function EditFormClient({ form }: { form: any }) {
  const c = form.sample_criteria ?? {}

  const matchedAge = AGE_RANGES.findIndex(r => r.min === (c.min_age ?? null) && r.max === (c.max_age ?? null))
  const customAge  = matchedAge === -1 ? { label: `Custom (${c.min_age ?? '?'}–${c.max_age ?? '?'})`, min: c.min_age ?? null, max: c.max_age ?? null } : null
  const ageOptions = customAge ? [...AGE_RANGES, customAge] : AGE_RANGES

  const [title, setTitle]             = useState<string>(form.title ?? '')
  const [description, setDescription] = useState<string>(form.description ?? '')
  const [link, setLink]               = useState<string>(form.link ?? '')
  const [specialty, setSpecialty]     = useState<string>(form.specialty ?? '')
  const [institution, setInstitution] = useState<string>(form.institution ?? '')
  const [estimatedMinutes, setEst]    = useState<number>(toTier(form.estimated_minutes ?? 5))
  const [isActive, setIsActive]       = useState<boolean>(form.is_active !== false)

  const [targetRole, setTargetRole]       = useState<string>(c.roles?.[0] ?? '')
  const [targetCountry, setTargetCountry] = useState<string>(c.countries?.[0] ?? '')
  const [targetGender, setTargetGender]   = useState<string>(c.sex ?? 'any')
  const [ageRangeIndex, setAgeRangeIndex] = useState<string>(String(matchedAge === -1 ? ageOptions.length - 1 : matchedAge))

  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  const allSpecialties = Object.values(SPECIALTY_GROUPS).flat()
  const locked = form.moderation_status && form.moderation_status !== 'ok'

  const snapshot = () => JSON.stringify({
    title, description, link, specialty, institution, estimatedMinutes, isActive,
    targetRole, targetCountry, targetGender, ageRangeIndex,
  })
  const initial = useRef(snapshot())
  const isDirty = snapshot() !== initial.current

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSaved(false)

    if (!isValidSurveyLink(link.trim())) {
      setError('Invalid link! Please use Google Forms, MS Forms, SurveyMonkey, Notion, REDCap, or Qualtrics.')
      return
    }

    setSaving(true)
    const age = ageOptions[parseInt(ageRangeIndex)] ?? AGE_RANGES[0]

    const { data, error: updateError } = await supabase.from('forms').update({
      title:             title.trim(),
      description:       description.trim(),
      link:              link.trim(),
      specialty,
      institution:       institution.trim(),
      estimated_minutes: estimatedMinutes,
      is_active:         isActive,
      sample_criteria: {
        ...c,
        roles:     targetRole ? [targetRole] : [],
        countries: targetCountry ? [targetCountry] : [],
        sex:       targetGender,
        min_age:   age.min,
        max_age:   age.max,
      },
    }).eq('id', form.id).select('id')

    setSaving(false)
    if (updateError) {
      const m = updateError.message
      setError(
        m.includes('INVALID_LINK') ? 'Invalid link! Please use Google Forms, MS Forms, SurveyMonkey, Notion, REDCap, or Qualtrics.' :
        m.includes('TITLE_TOO_LONG') ? 'Title is too long.' :
        m.includes('DESCRIPTION_TOO_LONG') ? 'Description is too long.' :
        m.includes('INVALID_DURATION') ? 'Please choose one of the time options.' :
        m
      )
      return
    }
    if (!data || data.length === 0) {
      setError('You can only edit your own surveys.')
      return
    }

    initial.current = snapshot()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  const pointsEarned = basePoints(estimatedMinutes)

  return (
    <div className="relative rounded-[2.5rem] bg-[#3d353a] border border-white/5 p-8 sm:p-10 shadow-2xl overflow-hidden">
      <style jsx global>{`
        input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 600000s ease-in-out 0s !important;
        }
      `}</style>

      <form onSubmit={handleSave} className="relative z-10 space-y-8">

        {locked ? (
          <div className="flex items-start gap-3 rounded-2xl px-5 py-4 bg-rose-500/10 border border-rose-500/20">
            <Lock size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-rose-300">Hidden by moderation</p>
              <p className="text-xs text-white/40 mt-0.5">
                This survey is under review and can't be made visible until an admin restores it. You can still edit its details.
              </p>
            </div>
          </div>
        ) : (
          <div className={`flex items-center justify-between gap-4 rounded-2xl px-5 py-4 border transition-colors ${
            isActive ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/[0.03] border-white/5'
          }`}>
            <div>
              <p className={`text-sm font-bold ${isActive ? 'text-emerald-400' : 'text-white/70'}`}>
                {isActive ? 'Survey is live' : 'Survey is paused'}
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                {isActive ? 'Visible in the feed and accepting responses.' : 'Hidden from the feed. No one can fill it.'}
              </p>
            </div>
            <button type="button" onClick={() => setIsActive(a => !a)} aria-label="Toggle active"
              className={`relative shrink-0 inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                isActive ? 'bg-emerald-500' : 'bg-white/10'
              }`}>
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-2">
            <label className={labelCls}>Research Title *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
              placeholder="e.g. Prevalence of burnout among medical interns" className={inputCls} />
          </div>

          <div className="space-y-2">
            <label className={labelCls}>Abstract / Description *</label>
            <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={400}
              placeholder="Briefly overview your objectives and methodology..."
              className={`${inputCls} resize-none`} />
            <p className="text-[10px] font-bold text-white/20 text-right mr-1 tabular-nums">{description.length}/400</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={labelCls}><Link2 size={13} /> Survey Link *</label>
              <input required type="url" value={link} onChange={e => setLink(e.target.value)}
                placeholder="https://forms.gle/..." className={inputCls} />
            </div>
            <div className="space-y-2">
              <label className={labelCls}><BookOpen size={13} /> Research Specialty *</label>
              <input list="specialty-list" required value={specialty} onChange={e => setSpecialty(e.target.value)}
                placeholder="Search specialty..." className={inputCls} />
              <datalist id="specialty-list">
                {allSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
              </datalist>
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelCls}><School size={13} /> Institution</label>
            <input value={institution} onChange={e => setInstitution(e.target.value)}
              placeholder="e.g. KAU, PNU" className={inputCls} />
          </div>

          <div className="space-y-2">
            <label className={labelCls}><Clock size={13} /> Estimated Time *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {TIME_TIERS.map(t => {
                const active = estimatedMinutes === t.minutes
                return (
                  <button key={t.key} type="button" onClick={() => setEst(t.minutes)}
                    className={`rounded-2xl px-3 py-4 text-center border transition-all ${
                      active
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10'
                        : 'bg-[#312a2f] border-white/5 hover:border-white/15'
                    }`}>
                    <p className={`text-sm font-black ${active ? 'text-emerald-400' : 'text-white'}`}>{t.label}</p>
                    <p className={`text-[10px] font-bold mt-0.5 ${active ? 'text-emerald-400/70' : 'text-white/30'}`}>{t.range}</p>
                    <p className={`text-[10px] font-black mt-2 tabular-nums ${active ? 'text-emerald-400' : 'text-white/20'}`}>
                      {basePoints(t.minutes)} pts
                    </p>
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] font-bold text-emerald-400 mt-1 ml-1 flex items-center gap-1 flex-wrap">
              <Sparkles size={10} /> Participants earn {pointsEarned} pts
              <span className="text-white/30 font-medium">
                (+{EARLY_BIRD_BONUS} for the first 10, +{MATCH_BONUS} if they match your target audience)
              </span>
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={labelCls}><Users size={13} /> Target Designation</label>
              <select value={targetRole} onChange={e => setTargetRole(e.target.value)} className={selectCls}>
                <option value="">General Audience</option>
                {Object.entries(ROLE_GROUPS).map(([group, roles]) => (
                  <optgroup key={group} label={group} className="bg-[#3d353a] text-white/40">
                    {roles.map(r => <option key={r.value} value={r.value} className="text-white">{r.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className={labelCls}><Globe size={13} /> Target Region</label>
              <select value={targetCountry} onChange={e => setTargetCountry(e.target.value)} className={selectCls}>
                <option value="">Global</option>
                {targetCountry && !COUNTRIES.includes(targetCountry) && (
                  <option value={targetCountry} className="bg-[#3d353a] text-white">{targetCountry}</option>
                )}
                {COUNTRIES.map(ct => <option key={ct} value={ct} className="bg-[#3d353a] text-white">{ct}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={labelCls}>Target Gender</label>
              <select value={targetGender} onChange={e => setTargetGender(e.target.value)} className={selectCls}>
                <option value="any">Any Gender</option>
                <option value="male">Males Only</option>
                <option value="female">Females Only</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className={labelCls}>Target Age</label>
              <select value={ageRangeIndex} onChange={e => setAgeRangeIndex(e.target.value)} className={selectCls}>
                {ageOptions.map((r, i) => (
                  <option key={i} value={i} className="text-white">{r.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold animate-fade-in">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {saved && (
          <div className="flex items-center justify-between gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-bold animate-fade-in">
            <span className="flex items-center gap-2"><Check size={16} /> Changes saved!</span>
            <Link href={`/forms/${form.id}`} className="flex items-center gap-1 text-white/60 hover:text-white">
              View survey <ExternalLink size={12} />
            </Link>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="submit" disabled={saving || !isDirty}
            className="flex-1 group bg-white text-[#1e1a1d] py-5 rounded-[2.5rem] text-xs font-black uppercase tracking-[0.15em] hover:bg-white/90 active:scale-[0.99] transition-all shadow-2xl flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> Save changes</>}
          </button>
          <Link href={`/forms/${form.id}`}
            className="sm:w-40 py-5 rounded-[2.5rem] text-xs font-black uppercase tracking-[0.15em] text-white/50 border border-white/10 hover:text-white hover:border-white/25 transition-all flex items-center justify-center">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
