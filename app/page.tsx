import { createClient } from '@/lib/supabase-server'
import FormCard from '@/components/FormCard'
import FeedFilters from '@/components/FeedFilters'
import LandingView from './LandingView'
import Link from 'next/link'
import { Sparkles, ArrowRight, UserPlus, ClipboardList, ChevronDown } from 'lucide-react'
import { matchesCriteria, type FormFeedItem } from '@/lib/types'

export const revalidate = 0

function clampInt(raw: string | undefined, fallback: number, min: number, max: number) {
  const n = raw ? parseInt(raw, 10) : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; specialty?: string; tab?: string; max_min?: string; limit_sug?: string; limit_main?: string }>
}) {
  const params = await searchParams
  const q = (params.q || '').trim().slice(0, 100)
  const specialty = (params.specialty || '').trim().slice(0, 150)
  const tab = params.tab || 'all'
  const maxMinNum = params.max_min ? clampInt(params.max_min, 0, 1, 600) : 0
  const max_min = maxMinNum ? String(maxMinNum) : ''

  const limitSuggested = clampInt(params.limit_sug, 3, 1, 100)
  const limitMain = clampInt(params.limit_main, 3, 1, 100)

  const supabase = await createClient()

  
  const { data: { user } } = await supabase.auth.getUser()

  
  let query = supabase
    .from('forms_feed')
    .select('*')
    .order('submitter_points', { ascending: false })
    .limit(100)

  if (specialty) query = query.eq('specialty', specialty)
  if (maxMinNum) query = query.lte('estimated_minutes', maxMinNum)
  if (q)         query = query.ilike('title', `%${q}%`)
  
  const { data: forms } = await query
  const feed = (forms ?? []) as FormFeedItem[]

  
  if (!user) {
    const { count: userCount } = await supabase
      .from('profiles').select('*', { count: 'exact', head: true }).not('username', 'is', null)
    const totalFills = feed.reduce((a, f) => a + (f.fill_count ?? 0), 0)
    return (
      <LandingView
        previewForms={feed.slice(0, 6)}
        stats={{ users: userCount ?? 0, surveys: feed.length, fills: totalFills }}
      />
    )
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const myFillIds = new Set<string>()
  const { data: fills } = await supabase.from('fills').select('form_id').eq('user_id', user.id)
  fills?.forEach(f => myFillIds.add(f.form_id))

  const { data: followRows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
  const followingIds = new Set(followRows?.map(r => r.following_id) || [])

  
  const visibleFeed = feed.filter(f => !myFillIds.has(f.id) && f.user_id !== user.id)
  const followingFeed = visibleFeed.filter(f => followingIds.has(f.user_id))
  const completedFeed = feed.filter(f => myFillIds.has(f.id))
  
  
  const pObj = Array.isArray(profile) ? profile[0] : profile
  const isProfileComplete = !!(pObj && pObj.role && pObj.age && pObj.sex && pObj.country)

  const suggestedFeed = isProfileComplete && pObj
    ? visibleFeed.filter(form => {
        const criteria = (form as any).sample_criteria
        return criteria ? matchesCriteria(criteria, pObj) : false
      })
    : []

  const activeTab = tab === 'following' ? 'following' : tab === 'completed' ? 'completed' : 'all'
  const currentFeedList = activeTab === 'following' ? followingFeed : activeTab === 'completed' ? completedFeed : visibleFeed

  
  let displayName = 'Researcher'
  const rawName = pObj?.name || pObj?.username || user?.user_metadata?.name
  if (typeof rawName === 'string' && rawName.trim()) {
    displayName = rawName.trim().split(/\s+/)[0].slice(0, 30)
  }

 
  const buildQueryString = (newParams: Record<string, string | number>) => {
    const currentParams = new URLSearchParams()
    if (q) currentParams.set('q', q)
    if (specialty) currentParams.set('specialty', specialty)
    if (max_min) currentParams.set('max_min', max_min)
    if (activeTab !== 'all') currentParams.set('tab', activeTab)
    currentParams.set('limit_sug', String(limitSuggested))
    currentParams.set('limit_main', String(limitMain))
    
    Object.entries(newParams).forEach(([key, val]) => currentParams.set(key, String(val)))
    return `/?${currentParams.toString()}`
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 bg-[#f8f9fa] min-h-screen">

      {!isProfileComplete && (
        <div className="p-8 rounded-[2.5rem] bg-[#3d353a] border border-white/5 shadow-2xl relative overflow-hidden text-white animate-fade-in">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <h1 className="text-2xl font-black tracking-tight">Welcome, {displayName}! ✨</h1>
            <p className="text-white/40 text-xs max-w-[85%] leading-relaxed font-medium">Complete your academic profile details now to activate the smart matching matrix and find tailored research.</p>
            <Link href="/profile" className="inline-flex items-center gap-2 bg-white text-[#1e1a1d] px-6 py-3.5 rounded-xl text-xs font-black hover:bg-white/90 active:scale-[0.99] transition-all shadow-xl">
              Complete Profile <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {isProfileComplete && suggestedFeed.length > 0 && !q && !specialty && activeTab === 'all' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 px-1">
            <Sparkles size={14} className="text-emerald-500" />
            <h2 className="font-black text-slate-800 text-xs uppercase tracking-widest">Suggested For You</h2>
          </div>
          <div className="space-y-3">
             {suggestedFeed.slice(0, limitSuggested).map((form) => (
              <FormCard key={form.id} form={form} rank={feed.indexOf(form) + 1} highlighted />
             ))}
          </div>
          
        
          {suggestedFeed.length > limitSuggested && (
            <Link 
              href={buildQueryString({ limit_sug: suggestedFeed.length })} scroll={false}
              className="w-full py-3.5 bg-[#3d353a] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#1e1a1d] transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-[0.99]"
            >
              View More
              <ChevronDown size={14} />
            </Link>
          )}
        </div>
      )}

      <div className="space-y-4 pt-2 animate-fade-in">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black text-slate-800 uppercase tracking-widest">
            {activeTab === 'completed' ? 'Your Contributions' : 'Live Survey Stream'}
          </span>
        </div>

        
        {activeTab === 'all' && <FeedFilters />}

        
        <div className="flex gap-1 bg-slate-200/60 p-1 rounded-xl w-full sm:w-fit">
          <Link href="/" className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'all' ? 'bg-white text-[#1e1a1d] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            All
          </Link>
          <Link href="/?tab=following" className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'following' ? 'bg-white text-[#1e1a1d] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            Following
          </Link>
          <Link href="/?tab=completed" className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'completed' ? 'bg-white text-[#1e1a1d] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            Completed
          </Link>
        </div>

        
        <div className="space-y-3">
          {currentFeedList.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-100 rounded-[2.5rem] px-6 shadow-sm animate-fade-in">
              {activeTab === 'following' ? (
                <>
                  <UserPlus size={36} className="mx-auto mb-3 text-slate-300" />
                  <h3 className="text-sm font-bold text-slate-700 mb-1">You aren't following anyone yet</h3>
                  <p className="text-xs text-slate-400 max-w-[260px] mx-auto leading-relaxed mb-5">Follow researchers to see their latest surveys here in your personal feed.</p>
                  
                  <Link href="/users" className="inline-flex items-center gap-2 bg-[#3d353a] text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-[#1e1a1d] shadow-md transition-all active:scale-[0.98]">
                   Explore
                  </Link>
                </>
              ) : (
                <>
                  <ClipboardList size={36} className="mx-auto mb-3 text-slate-300" />
                  <h3 className="text-sm font-bold text-slate-700 mb-1">{activeTab === 'completed' ? "No historical records" : "No results match configuration"}</h3>
                  <p className="text-xs text-slate-400 max-w-[260px] mx-auto leading-relaxed mb-5">Help researchers and fill out surveys.</p>
                </>
              )}
            </div>
          ) : (
            currentFeedList.slice(0, limitMain).map((form, i) => (
              <FormCard key={form.id} form={form} rank={i + 1} />
            ))
          )}
        </div>

       
        {currentFeedList.length > limitMain && (
          <Link 
            href={buildQueryString({ limit_main: currentFeedList.length })} scroll={false}
            className="w-full py-3.5 bg-[#3d353a] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#1e1a1d] transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-[0.99]"
          >
            View More
            <ChevronDown size={14} />
          </Link>
        )}
      </div>
    </div>
  )
}
