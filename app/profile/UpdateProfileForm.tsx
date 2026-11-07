'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { ROLES, SPECIALTY_GROUPS, type Profile } from '@/lib/types'
import { Save, CheckCircle, XCircle, Loader2, School, BookOpen, Globe, Search, ChevronsUpDown, Check, UserCheck } from 'lucide-react'

const COUNTRIES = [
  'Saudi Arabia','Egypt','UAE','Kuwait','Bahrain','Oman','Qatar','Jordan','Lebanon',
  'Iraq','Syria','Libya','Tunisia','Algeria','Morocco','Sudan','Yemen','Palestine',
  'United States','United Kingdom','Canada','Australia','Germany','France',
  'Turkey','Pakistan','India','Malaysia','Other',
]

const SAUDI_UNIVERSITIES = [
  "Al-Baha University (BU)",
  "Al-Maarefa University",
  "Al Jouf University (JU)",
  "Alfaisal University",
  "Almaarefa University",
  "Al-Yamamah University (YU)",
  "Arab Open University (AOU)",
  "Bisha University (UB)",
  "Dar Al Uloom University (DAU)",
  "Dar Al Hekma University",
  "Effat University",
  "Hail University (UOH)",
  "Imam Abdulrahman bin Faisal University (IAU)",
  "Imam Mohammad Ibn Saud Islamic University (IMSIU)",
  "Islamic University of Madinah",
  "Jazan University (JU)",
  "Jedda University (UJ)",
  "King Abdullah University of Science and Technology (KAUST)",
  "King Abdulaziz University (KAU)",
  "King Fahd University of Petroleum and Minerals (KFUPM)",
  "King Faisal University (KFU)",
  "King Khalid University (KKU)",
  "King Saud University (KSU)",
  "King Saud bin Abdulaziz University for Health Sciences (KSAU-HS)",
  "Majmaah University (MU)",
  "Najran University (NU)",
  "Northern Border University (NBU)",
  "Prince Mohammad bin Fahd University (PMU)",
  "Prince Sattam bin Abdulaziz University (PSAU)",
  "Prince Sultan University (PSU)",
  "Princess Nourah bint Abdulrahman University (PNU)",
  "Qassim University (QU)",
  "Shaqra University (SU)",
  "Saudi Electronic University (SEU)",
  "Taibah University (TU)",
  "Taif University (TU)",
  "Tabuk University (UT)",
  "Umm Al-Qura University (UQU)",
]

const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/

export default function UpdateProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName]           = useState(profile.name ?? '')
  const [username, setUsername]   = useState(profile.username ?? '')
  
  const [institution, setInst]    = useState(profile.institution ?? '')
  const [instOpen, setInstOpen]   = useState(false)
  const [instSearch, setInstSearch] = useState('')

  const [specialty, setSpecialty] = useState(profile.specialty ?? '')
  const [specOpen, setSpecOpen]   = useState(false)
  const [specSearch, setSpecSearch] = useState('')

  const currentRoleLabel = ROLES.find(r => r.value === profile.role)?.label || profile.role || ''
  const [role, setRole]           = useState(profile.role ?? '')
  const [roleInputLabel, setRoleInputLabel] = useState(currentRoleLabel)
  const [roleOpen, setRoleOpen]   = useState(false)
  const [roleSearch, setRoleSearch] = useState('')

  const [age, setAge]             = useState(profile.age?.toString() ?? '')
  const [sex, setSex]             = useState(profile.sex ?? '')
  const [country, setCountry]     = useState(profile.country ?? '')
  const [customCountry, setCustom] = useState('')
  const [saved, setSaved]         = useState(false)
  const [loading, setLoading]     = useState(false)
  const [saveError, setSaveError] = useState('')

  const ALL_SPECIALTIES = Object.values(SPECIALTY_GROUPS).flat()

  const filteredInstitutions = SAUDI_UNIVERSITIES.filter(item =>
    item.toLowerCase().includes(instSearch.toLowerCase())
  )

  const filteredSpecialties = ALL_SPECIALTIES.filter(item =>
    item.toLowerCase().includes(specSearch.toLowerCase())
  )

  const filteredRoles = ROLES.filter(r =>
    r.label.toLowerCase().includes(roleSearch.toLowerCase())
  )

  const initial = useRef({
    name:        profile.name ?? '',
    username:    profile.username ?? '',
    institution: profile.institution ?? '',
    specialty:   profile.specialty ?? '',
    role:        profile.role ?? '',
    age:         profile.age?.toString() ?? '',
    sex:         profile.sex ?? '',
    country:     profile.country ?? '',
  })

  const isDirty =
    name        !== initial.current.name        ||
    username    !== initial.current.username    ||
    institution !== initial.current.institution ||
    specialty   !== initial.current.specialty   ||
    role        !== initial.current.role        ||
    age         !== initial.current.age         ||
    sex         !== initial.current.sex         ||
    country     !== initial.current.country

  const [usernameStatus, setUsernameStatus] = useState<'idle'|'checking'|'available'|'taken'|'invalid'|'same'>('idle')
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current)
    if (!username) { setUsernameStatus('invalid'); return }
    if (username === profile.username) { setUsernameStatus('same'); return }
    if (!USERNAME_REGEX.test(username)) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    let cancelled = false
    usernameTimer.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('profiles').select('id')
          .eq('username', username)
          .neq('id', profile.id)
          .maybeSingle()
        if (!cancelled) setUsernameStatus(data ? 'taken' : 'available')
      } catch {
        if (!cancelled) setUsernameStatus('idle')
      }
    }, 500)
    return () => {
      cancelled = true
      if (usernameTimer.current) clearTimeout(usernameTimer.current)
    }
  }, [username, profile.username, profile.id, supabase])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveError('')
    if (usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking') return

    const ageNum = age ? parseInt(age, 10) : null
    if (ageNum !== null && (Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120)) {
      setSaveError('Please enter a valid age (1–120).')
      return
    }
    if (sex && sex !== 'male' && sex !== 'female') {
      setSaveError('Please choose a valid option for sex.')
      return
    }

    setLoading(true)
    const resolvedCountry = (country === 'Other' ? customCountry.trim() : country).slice(0, 100)

    const { data, error } = await supabase.from('profiles').update({
      name:        name.trim().slice(0, 60),
      username:    username.toLowerCase().trim(),
      institution: institution.trim().slice(0, 150),
      specialty:   specialty.trim().slice(0, 150),
      role:        role.trim().slice(0, 100),
      age:         ageNum,
      sex:         sex || null,
      country:     resolvedCountry || null,
    }).eq('id', profile.id).select('id')

    setLoading(false)

    if (error) {
      const m = error.message
      setSaveError(
        m.includes('username_format') ? 'Username must start with a letter and be 3–20 characters (a-z, 0-9, _).' :
        m.includes('duplicate') || m.includes('unique') ? 'That username is already taken.' :
        m.includes('name_length') ? 'Name is too long.' :
        m
      )
      return
    }
    if (!data || data.length === 0) {
      setSaveError('Could not save your profile. Please sign in again.')
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    initial.current = { name: name.trim(), username, institution, specialty, role, age, sex, country }
    router.refresh()
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 text-white text-left">
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40">Full name</label>
          <input 
            value={name} 
            maxLength={60}
            onChange={e => setName(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-white placeholder-white/20 shadow-inner" 
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40">
            Username <span className="text-white/20 font-normal">— public @handle</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-bold">@</span>
            <input
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              maxLength={20} 
              placeholder="your_handle"
              className={`w-full bg-white/[0.03] border rounded-2xl pl-8 pr-10 py-3 text-sm font-medium focus:outline-none focus:ring-0 transition-all text-white placeholder-white/20 shadow-inner ${
                usernameStatus === 'available' || usernameStatus === 'same' ? 'border-emerald-500/50 bg-emerald-500/[0.02]' :
                usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-rose-500/50 bg-rose-500/[0.02]' : 'border-white/5'
              }`}
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              {usernameStatus === 'checking'  && <Loader2 size={14} className="animate-spin text-white/40" />}
              {(usernameStatus === 'available' || usernameStatus === 'same') && <CheckCircle size={14} className="text-emerald-400" />}
              {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <XCircle size={14} className="text-rose-400" />}
            </div>
          </div>
          <p className="text-[11px] mt-1 font-semibold tracking-wide">
            {usernameStatus === 'taken'   && <span className="text-rose-400">Already taken</span>}
            {usernameStatus === 'invalid' && <span className="text-rose-400">3–20 chars, start with a letter, a-z 0-9 _ only</span>}
            {usernameStatus === 'available' && <span className="text-emerald-400">Available!</span>}
            {(usernameStatus === 'idle' || usernameStatus === 'same') && <span className="text-white/30">n-eq1.com/u/{username || 'username'}</span>}
          </p>
        </div>
      </div>

      <div className="space-y-1.5 relative">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
          <School size={12} /> Institution
        </label>
        
        <button
          type="button"
          onClick={() => { setInstOpen(!instOpen); setSpecOpen(false); setRoleOpen(false); }}
          className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 text-sm font-medium flex items-center justify-between text-left text-white focus:outline-none focus:border-white/20 transition-all shadow-sm"
        >
          <span className={institution ? "text-white" : "text-white/20"}>
            {institution || "Select or search your university..."}
          </span>
          <ChevronsUpDown size={14} className="text-white/30" />
        </button>

        {instOpen && (
          <div className="absolute z-50 w-full mt-2 bg-[#171416] border border-white/10 rounded-2xl shadow-2xl p-2 space-y-2 max-h-60 overflow-y-auto backdrop-blur-xl animate-scale-up">
            <div className="relative flex items-center bg-white/5 rounded-xl px-3 border border-white/5 focus-within:border-white/10 transition-all">
              <Search size={14} className="text-white/30 shrink-0" />
              <input
                type="text"
                placeholder="Type university name to filter..."
                value={instSearch}
                maxLength={150}
                onChange={(e) => setInstSearch(e.target.value)}
                className="w-full bg-transparent px-2 py-2.5 text-xs text-white focus:outline-none placeholder-white/20"
              />
            </div>
            <div className="space-y-0.5">
              {filteredInstitutions.length > 0 ? (
                filteredInstitutions.map((inst) => (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => { setInst(inst); setInstOpen(false); setInstSearch(''); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-white/70 hover:text-white hover:bg-white/5 text-left transition-colors"
                  >
                    <span>{inst}</span>
                    {institution === inst && <Check size={12} className="text-emerald-400" />}
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  onClick={() => { setInst(instSearch); setInstOpen(false); setInstSearch(''); }}
                  className="w-full px-3 py-2 text-xs rounded-xl text-emerald-400 hover:bg-white/5 text-left font-bold transition-all"
                >
                  Use custom university: "{instSearch}"
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        <div className="space-y-1.5 relative">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
            <UserCheck size={12} /> Your role / occupation
          </label>
          
          <button
            type="button"
            onClick={() => { setRoleOpen(!roleOpen); setInstOpen(false); setSpecOpen(false); }}
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 text-sm font-medium flex items-center justify-between text-left text-white focus:outline-none focus:border-white/20 transition-all shadow-sm"
          >
            <span className={roleInputLabel ? "text-white" : "text-white/20"}>
              {roleInputLabel || "Select or search role..."}
            </span>
            <ChevronsUpDown size={14} className="text-white/30" />
          </button>

          {roleOpen && (
            <div className="absolute z-50 w-full mt-2 bg-[#171416] border border-white/10 rounded-2xl shadow-2xl p-2 space-y-2 max-h-60 overflow-y-auto backdrop-blur-xl animate-scale-up">
              <div className="relative flex items-center bg-white/5 rounded-xl px-3 border border-white/5 focus-within:border-white/10 transition-all">
                <Search size={14} className="text-white/30 shrink-0" />
                <input
                  type="text"
                  placeholder="Type role name (e.g. Teaching Assistant)..."
                  value={roleSearch}
                  maxLength={100}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  className="w-full bg-transparent px-2 py-2.5 text-xs text-white focus:outline-none placeholder-white/20"
                />
              </div>
              <div className="space-y-0.5">
                {filteredRoles.length > 0 ? (
                  filteredRoles.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => { setRole(r.value); setRoleInputLabel(r.label); setRoleOpen(false); setRoleSearch(''); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-white/70 hover:text-white hover:bg-white/5 text-left transition-colors"
                    >
                      <span>{r.label}</span>
                      {role === r.value && <Check size={12} className="text-emerald-400" />}
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    onClick={() => { setRole(roleSearch); setRoleInputLabel(roleSearch); setRoleOpen(false); setRoleSearch(''); }}
                    className="w-full px-3 py-2 text-xs rounded-xl text-emerald-400 hover:bg-white/5 text-left font-bold transition-all"
                  >
                    Use custom role: "{roleSearch}"
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5 relative">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
            <BookOpen size={12} /> Field / Specialty
          </label>
          
          <button
            type="button"
            onClick={() => { setSpecOpen(!specOpen); setInstOpen(false); setRoleOpen(false); }}
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 text-sm font-medium flex items-center justify-between text-left text-white focus:outline-none focus:border-white/20 transition-all shadow-sm"
          >
            <span className={specialty ? "text-white" : "text-white/20"}>
              {specialty || "Select specialty..."}
            </span>
            <ChevronsUpDown size={14} className="text-white/30" />
          </button>

          {specOpen && (
            <div className="absolute z-40 w-full mt-2 bg-[#171416] border border-white/10 rounded-2xl shadow-2xl p-2 space-y-2 max-h-60 overflow-y-auto backdrop-blur-xl animate-scale-up">
              <div className="relative flex items-center bg-white/5 rounded-xl px-3 border border-white/5 focus-within:border-white/10 transition-all">
                <Search size={14} className="text-white/30 shrink-0" />
                <input
                  type="text"
                  placeholder="Type your specialty..."
                  value={specSearch}
                  maxLength={150}
                  onChange={(e) => setSpecSearch(e.target.value)}
                  className="w-full bg-transparent px-2 py-2.5 text-xs text-white focus:outline-none placeholder-white/20"
                />
              </div>
              <div className="space-y-0.5">
                {filteredSpecialties.length > 0 ? (
                  filteredSpecialties.map((spec) => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => { setSpecialty(spec); setSpecOpen(false); setSpecSearch(''); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-white/70 hover:text-white hover:bg-white/5 text-left transition-colors"
                    >
                      <span>{spec}</span>
                      {specialty === spec && <Check size={12} className="text-emerald-400" />}
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    onClick={() => { setSpecialty(specSearch); setSpecOpen(false); setSpecSearch(''); }}
                    className="w-full px-3 py-2 text-xs rounded-xl text-emerald-400 hover:bg-white/5 text-left font-bold transition-all"
                  >
                    Use custom: "{specSearch}"
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40">Age</label>
          <input 
            type="number" 
            min={1} 
            max={120} 
            value={age} 
            onChange={e => setAge(e.target.value)}
            placeholder="e.g. 24"
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-white placeholder-white/20 shadow-inner" 
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40">Sex</label>
          <select 
            value={sex} 
            onChange={e => setSex(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-white/20 focus:bg-[#1e1a1d] transition-all text-white shadow-md cursor-pointer appearance-none"
            style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\' opacity=\'0.3\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")', backgroundPosition: 'right 16px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
          >
            <option value="" className="bg-[#1e1a1d] text-white/40">Prefer not to say</option>
            <option value="male" className="bg-[#1e1a1d] text-white">Male</option>
            <option value="female" className="bg-[#1e1a1d] text-white">Female</option>
          </select>
        </div>
        
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1"><Globe size={11}/> Country</label>
          <select 
            value={country} 
            onChange={e => setCountry(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-white/20 focus:bg-[#1e1a1d] transition-all text-white shadow-md cursor-pointer appearance-none"
            style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\' opacity=\'0.3\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")', backgroundPosition: 'right 16px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
          >
            <option value="" className="bg-[#1e1a1d] text-white/40">Select country…</option>
            {COUNTRIES.map(c => <option key={c} value={c} className="bg-[#1e1a1d] text-white">{c}</option>)}
          </select>
        </div>
      </div>

      {country === 'Other' && (
        <div className="space-y-1.5 animate-fade-in">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40">Specify country</label>
          <input 
            value={customCountry} 
            maxLength={100}
            onChange={e => setCustom(e.target.value)}
            placeholder="Type your country name"
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-white placeholder-white/20 shadow-inner" 
          />
        </div>
      )}

      <div className="flex items-center gap-4 pt-4 border-t border-white/5">
        <button 
          type="submit" 
          disabled={loading || !isDirty || usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking'}
          className="flex items-center gap-2 bg-white text-charcoal px-6 py-3 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={13} className="animate-spin text-charcoal" /> : <Save size={13} />} 
          {loading ? 'Saving Changes…' : 'Save Profile Details'}
        </button>
        {saved && <span className="text-xs font-bold text-emerald-400 animate-pulse">✓ Changes saved successfully!</span>}
      </div>

      {saveError && (
        <p className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3">{saveError}</p>
      )}

      <p className="text-[11px] text-white/30 leading-relaxed font-medium">
        This information is used to match you with relevant studies in the "Suggested for you" section.
      </p>
    </form>
  )
}
