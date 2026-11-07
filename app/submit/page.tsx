'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { SPECIALTY_GROUPS, ROLE_GROUPS, COUNTRIES } from '@/lib/types'
import { Link2, Clock, BookOpen, ChevronLeft, Users, Sparkles, AlertCircle, School, Globe, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { basePoints, EARLY_BIRD_BONUS, MATCH_BONUS } from '@/lib/points'

const TIME_TIERS = [
  { key: 'quick',  label: 'Quick',  range: '≤ 5 min',   minutes: 5  },
  { key: 'short',  label: 'Short',  range: '6–15 min',  minutes: 15 },
  { key: 'medium', label: 'Medium', range: '16–30 min', minutes: 30 },
  { key: 'long',   label: 'Long',   range: '30+ min',   minutes: 45 },
]

const AGE_RANGES = [
  { label: 'General', min: null, max: null },
  { label: 'Under 18', min: 1, max: 17 },
  { label: '18 - 25 years', min: 18, max: 25 },
  { label: '26 - 40 years', min: 26, max: 40 },
  { label: '41 - 60 years', min: 41, max: 60 },
  { label: 'Over 60', min: 61, max: 100 },
]

export default function SubmitPage() {
  const [title, setTitle]               = useState('')
  const [description, setDescription]   = useState('')
  const [link, setLink]                 = useState('')
  const [specialty, setSpecialty]       = useState('')
  const [institution, setInstitution]   = useState('')
  const [estimatedMinutes, setEst]      = useState(TIME_TIERS[0].minutes)

  const [targetRole, setTargetRole]     = useState('')
  const [targetCountry, setTargetCountry] = useState('')
  const [targetGender, setTargetGender]   = useState('any')
  
  const [ageRangeIndex, setAgeRangeIndex] = useState('0')

  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const allSpecialties = Object.values(SPECIALTY_GROUPS).flat()

  const ALLOWED_SURVEY_DOMAINS = [
    'forms.gle',
    'docs.google.com',
    'forms.office.com',
    'forms.microsoft.com',
    'surveymonkey.com',
    'surveymonkey.co.uk',
    'research.net',
    'qualtrics.com',
    'notion.so',
    'notion.site',
    'notion.com',
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!isValidSurveyLink(link.trim())) {
      setError('Invalid link! Please use Google Forms, MS Forms, SurveyMonkey, Notion, REDCap, or Qualtrics.')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); router.push('/auth'); return }

    const selectedAgeData = AGE_RANGES[parseInt(ageRangeIndex)]

    const { error: insertError } = await supabase.from('forms').insert({
      user_id: user.id,
      title: title.trim().slice(0, 120),
      description: description.trim().slice(0, 400),
      link: link.trim(),
      specialty: specialty.trim().slice(0, 150),
      institution: institution.trim().slice(0, 150),
      estimated_minutes: estimatedMinutes,
      sample_criteria: { 
        roles: targetRole ? [targetRole] : [], 
        countries: targetCountry ? [targetCountry] : [], 
        sex: targetGender,
        min_age: selectedAgeData.min,
        max_age: selectedAgeData.max
      },
    })

    if (insertError) {
      const m = insertError.message
      setError(
        m.includes('INVALID_LINK') ? 'Invalid link! Please use Google Forms, MS Forms, SurveyMonkey, Notion, REDCap, or Qualtrics.' :
        m.includes('ACCOUNT_BANNED') ? 'Your account is suspended, so you can’t publish surveys right now.' :
        m.includes('TITLE_TOO_LONG') ? 'Title is too long.' :
        m.includes('DESCRIPTION_TOO_LONG') ? 'Description is too long.' :
        m.includes('INVALID_DURATION') ? 'Please choose one of the time options.' :
        m
      )
      setLoading(false)
      return
    }
    router.push('/'); router.refresh()
  }

  const pointsEarned = basePoints(estimatedMinutes)

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 py-12 px-6 animate-fade-in">
      
      <style jsx global>{`
        input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 600000s ease-in-out 0s !important;
        }
      `}</style>

      <div className="max-w-2xl mx-auto space-y-10">
        
        <div className="space-y-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-[#1e1a1d] transition-colors">
            <ChevronLeft size={18} />
            Back to home
          </Link>

          <div className="space-y-1">
            <h1 className="text-3xl font-black text-[#1e1a1d] tracking-tight">Submit Survey</h1>
            <p className="text-slate-500 text-sm font-medium">Broadcast your research protocol and define your target audience.</p>
          </div>
        </div>

        <div className="relative rounded-[2.5rem] bg-[#3d353a] border border-white/5 p-8 sm:p-10 shadow-2xl backdrop-blur-md overflow-hidden">
          
          <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
            
            <div className="space-y-6">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Research Title *</label>
                  <input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Prevalence of burnout among medical interns"
                    className="w-full bg-[#312a2f] border border-white/5 rounded-2xl px-5 py-4 text-sm font-medium text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-white/10" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Abstract / Description *</label>
                  <textarea required maxLength={400} value={description} onChange={e => setDescription(e.target.value)} rows={3}
                    placeholder="Briefly overview your objectives and methodology..."
                    className="w-full bg-[#312a2f] border border-white/5 rounded-2xl px-5 py-4 text-sm font-medium text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-white/10 resize-none" />
                  <p className="text-[10px] font-bold text-white/20 text-right mr-1 tabular-nums">{description.length}/400</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 flex items-center gap-1.5">
                    <Link2 size={13} /> Survey Link *
                  </label>
                  <input required type="url" value={link} onChange={e => setLink(e.target.value)}
                    placeholder="https://forms.gle/..."
                    className="w-full bg-[#312a2f] border border-white/5 rounded-2xl px-5 py-4 text-sm font-medium text-white focus:outline-none focus:border-emerald-500 transition-all" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 flex items-center gap-1.5">
                    <BookOpen size={13} /> Research Specialty *
                  </label>
                  <input list="specialty-list" required maxLength={150} value={specialty} onChange={e => setSpecialty(e.target.value)}
                    placeholder="Search specialty..."
                    className="w-full bg-[#312a2f] border border-white/5 rounded-2xl px-5 py-4 text-sm font-medium text-white focus:outline-none focus:border-emerald-500 transition-all" />
                  <datalist id="specialty-list">
                    {allSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
                  </datalist>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 flex items-center gap-1.5">
                  <School size={13} /> Institution
                </label>
                <input maxLength={150} value={institution} onChange={e => setInstitution(e.target.value)}
                  placeholder="e.g. KAU, PNU"
                  className="w-full bg-[#312a2f] border border-white/5 rounded-2xl px-5 py-4 text-sm font-medium text-white focus:outline-none focus:border-emerald-500 transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 flex items-center gap-1.5">
                  <Clock size={13} /> Estimated Time *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {TIME_TIERS.map(t => {
                    const active = estimatedMinutes === t.minutes
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setEst(t.minutes)}
                        className={`rounded-2xl px-3 py-4 text-center border transition-all ${
                          active
                            ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10'
                            : 'bg-[#312a2f] border-white/5 hover:border-white/15'
                        }`}
                      >
                        <p className={`text-sm font-black ${active ? 'text-emerald-400' : 'text-white'}`}>{t.label}</p>
                        <p className={`text-[10px] font-bold mt-0.5 ${active ? 'text-emerald-400/70' : 'text-white/30'}`}>{t.range}</p>
                        <p className={`text-[10px] font-black mt-2 tabular-nums ${active ? 'text-emerald-400' : 'text-white/20'}`}>
                          {basePoints(t.minutes)} pts
                        </p>
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] font-bold text-emerald-400 mt-1 ml-1 flex items-center gap-1">
                  <Sparkles size={10} /> Participants earn {pointsEarned} pts
                  <span className="text-white/30 font-medium">
                    (+{EARLY_BIRD_BONUS} for the first 10, +{MATCH_BONUS} if they match your target audience)
                  </span>
                </p>
                <p className="text-[10px] font-medium text-white/25 ml-1">
                  Be honest. Once responses come in, the time shown to participants adjusts to the real average.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 flex items-center gap-1.5">
                    <Users size={13} /> Target Designation
                  </label>
                  <select value={targetRole} onChange={e => setTargetRole(e.target.value)}
                    className="w-full bg-[#312a2f] border border-white/5 rounded-2xl px-4 py-4 text-sm font-semibold text-white/90 focus:outline-none focus:border-emerald-500 transition-all">
                    <option value="">General Audience</option>
                    {Object.entries(ROLE_GROUPS).map(([group, roles]) => (
                      <optgroup key={group} label={group} className="bg-[#3d353a] text-white/40">
                        {roles.map(r => <option key={r.value} value={r.value} className="text-white">{r.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 flex items-center gap-1.5">
                    <Globe size={13} /> Target Region
                  </label>
                  <select value={targetCountry} onChange={e => setTargetCountry(e.target.value)}
                    className="w-full bg-[#312a2f] border border-white/5 rounded-2xl px-4 py-4 text-sm font-semibold text-white/90 focus:outline-none focus:border-emerald-500 transition-all">
                    <option value="">Global </option>
                    {COUNTRIES.map(c => <option key={c} value={c} className="bg-[#3d353a] text-white">{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Target Gender</label>
                  <select value={targetGender} onChange={e => setTargetGender(e.target.value)}
                    className="w-full bg-[#312a2f] border border-white/5 rounded-2xl px-4 py-4 text-sm font-semibold text-white/90 focus:outline-none focus:border-emerald-500 transition-all">
                    <option value="any">Any Gender</option>
                    <option value="male">Males Only</option>
                    <option value="female">Females Only</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Target Age </label>
                  <select value={ageRangeIndex} onChange={e => setAgeRangeIndex(e.target.value)}
                    className="w-full bg-[#312a2f] border border-white/5 rounded-2xl px-4 py-4 text-sm font-semibold text-white/90 focus:outline-none focus:border-emerald-500 transition-all">
                    {AGE_RANGES.map((range, index) => (
                      <option key={index} value={index} className="text-white">
                        {range.label}
                      </option>
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

            <button type="submit" disabled={loading}
              className="group w-full bg-white text-[#1e1a1d] py-5 rounded-[2.5rem] text-xs font-black uppercase tracking-[0.15em] hover:bg-white/90 active:scale-[0.99] transition-all shadow-2xl flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? 'Executing Protocol...' : (
                <>
                  Submit
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}
