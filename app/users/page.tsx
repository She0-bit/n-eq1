import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Search, Users, School, BookOpen, ChevronRight, Sparkles } from 'lucide-react'
import { getAvatarGradient } from '@/components/Avatar'

export const revalidate = 0

function cleanSearch(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, '')
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/\s+/g, ' ')
    .slice(0, 30)
    .trim()
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  let results: any[] = []
  let activeResearchers: any[] = []
  const clean = q ? cleanSearch(q) : ''

  if (q && clean.length >= 1) {
    const { data } = await supabase
      .from('public_profiles')
      .select('id, username, name, institution, specialty')
      .not('username', 'is', null)
      .eq('is_listed', true)
      .or(`username.ilike."*${clean}*",name.ilike."*${clean}*"`)
      .order('name', { ascending: true })
      .limit(30)
    results = data ?? []
  } else if (!q) {
    const { data } = await supabase
      .from('public_profiles')
      .select('id, username, name, institution, specialty')
      .not('username', 'is', null)
      .eq('is_listed', true)
      .gt('points', 0)
      .order('name', { ascending: true })
      .limit(10)
    activeResearchers = data ?? []
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-8 bg-white text-slate-900 min-h-screen animate-fade-in">
      
      <div className="relative rounded-[2.5rem] overflow-hidden bg-[#1e1a1d]/90 border border-white/10 px-6 py-10 sm:px-10 sm:py-12 shadow-2xl text-white backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/50 bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl mb-4 backdrop-blur-sm">
            <Users size={12} className="text-white/40" />
            Researchers Cluster
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">Find researchers</h1>
          <p className="text-white/40 text-xs sm:text-sm mb-6 font-medium">Search the network by name or @username to discover and follow active profiles.</p>

          <form method="GET">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                name="q"
                defaultValue={q}
                maxLength={30}
                autoFocus
                placeholder="Search by name or @username…"
                className="w-full bg-white/[0.02] border border-white/10 text-white placeholder-white/20 rounded-xl pl-12 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:bg-white/[0.06] focus:border-white/20 transition-all shadow-inner backdrop-blur-md"
              />
            </div>
          </form>
        </div>
      </div>

      {!q ? (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 px-1">
            <Sparkles size={14} className="text-amber-500" />
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active Network Researchers</p>
          </div>
          
          {activeResearchers.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-10">No active researchers yet. Fill a survey to be the first!</p>
          )}

          <div className="grid grid-cols-1 gap-3">
            {activeResearchers.map((u) => {
              const seed = u.name || u.username || '?'
              const gradient = getAvatarGradient(seed)

              return (
                <Link
                  key={u.id}
                  href={`/u/${u.username}`}
                  className="group relative rounded-3xl p-5 shadow-sm border border-slate-100 bg-white text-slate-800 transition-all duration-300 flex items-center justify-between hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-base shrink-0 shadow-inner group-hover:scale-95 transition-transform`}>
                      {seed[0].toUpperCase()}
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <h3 className="font-bold text-sm tracking-tight text-slate-800 truncate pr-2">
                        {u.name || `@${u.username}`}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">@{u.username}</p>
                      
                      {(u.institution || u.specialty) && (
                        <div className="flex flex-col gap-0.5 pt-1 text-[11px] text-slate-400 font-semibold">
                          {u.institution && <span className="flex items-center gap-1 truncate max-w-[240px]"><School size={10} className="text-slate-300" /> {u.institution}</span>}
                          {u.specialty && <span className="flex items-center gap-1 truncate max-w-[240px]"><BookOpen size={10} className="text-slate-300" /> {u.specialty}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 pl-2">
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-100 transition-all">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-[2rem] p-12 text-center bg-slate-50 space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mx-auto text-slate-300 shadow-sm">
            <Users size={22} />
          </div>
          <div className="max-w-xs mx-auto">
            <p className="font-bold text-slate-800 text-sm">No results for "{q}"</p>
            <p className="text-xs text-slate-400 mt-1">Try another researcher name.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Search Results ({results.length})</p>
          <div className="grid grid-cols-1 gap-3">
            {results.map((u, i) => {
              const seed     = u.name || u.username || '?'
              const gradient = getAvatarGradient(seed)
              
              return (
                <Link
                  key={u.id}
                  href={`/u/${u.username}`}
                  className="group relative rounded-3xl p-5 shadow-sm border border-slate-100 bg-white text-slate-800 transition-all duration-300 flex items-center justify-between hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5"
                  style={{ animationDelay: `${i * 20}ms` }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-base shrink-0 shadow-inner group-hover:scale-95 transition-transform`}>
                      {seed[0].toUpperCase()}
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <h3 className="font-bold text-sm tracking-tight text-slate-800 truncate pr-2">
                        {u.name || `@${u.username}`}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">@{u.username}</p>
                      
                      {(u.institution || u.specialty) && (
                        <div className="flex flex-col gap-0.5 pt-1 text-[11px] text-slate-400 font-semibold">
                          {u.institution && <span className="flex items-center gap-1 truncate max-w-[240px]"><School size={10} className="text-slate-300" /> {u.institution}</span>}
                          {u.specialty && <span className="flex items-center gap-1 truncate max-w-[240px]"><BookOpen size={10} className="text-slate-300" /> {u.specialty}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 pl-2">
                    
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-100 transition-all">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
