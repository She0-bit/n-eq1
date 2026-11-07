import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Users, Crown, Medal, Star, ChevronLeft, FileText } from 'lucide-react'
import { getAvatarGradient } from '@/components/Avatar'

export const revalidate = 0
export const dynamic = 'force-dynamic'

type RankedUser = {
  id: string
  name: string | null
  username: string | null
  points: number
  fills: number
  showInLeaderboard: boolean
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = tab === 'alltime' ? 'alltime' : 'monthly'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const [{ data: monthlyData }, { data: allTimeData }, { data: allProfiles }] = await Promise.all([
    supabase.rpc('get_monthly_leaderboard'),
    supabase.rpc('get_alltime_leaderboard'),
    supabase.from('profiles').select('id, show_in_leaderboard'),
  ])

  const privacyMap = (allProfiles ?? []).reduce((acc: any, p: any) => {
    acc[p.id] = p.show_in_leaderboard !== false
    return acc
  }, {})

  const monthlyRanking: RankedUser[] = (monthlyData ?? []).map((r: any) => ({
    id:       r.user_id,
    name:     r.name,
    username: r.username,
    points:   Number(r.monthly_points),
    fills:    Number(r.fill_count),
    showInLeaderboard: privacyMap[r.user_id] ?? true,
  }))

  const allTimeRanking: RankedUser[] = (allTimeData ?? []).map((r: any) => ({
    id:       r.user_id,
    name:     r.name,
    username: r.username,
    points:   Number(r.total_points),
    fills:    Number(r.fill_count),
    showInLeaderboard: privacyMap[r.user_id] ?? true,
  }))

  const rawRanking = activeTab === 'monthly' ? monthlyRanking : allTimeRanking

  const ranking = rawRanking
    .filter(u => u.points > 0 && u.showInLeaderboard !== false)
    .slice(0, 30)

  const denseRanks: number[] = []
  ranking.forEach((u, i) => {
    denseRanks.push(i > 0 && u.points === ranking[i - 1].points ? denseRanks[i - 1] : i + 1)
  })

  const [gold, silver, bronze] = ranking
  const rest = ranking.slice(3)

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 min-h-screen bg-white animate-fade-in">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-[#1e1a1d] to-[#2b2427] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.35)]">

        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute left-1/2 top-[230px] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-[560px] h-[560px] rounded-full bg-white/[0.015] flex items-center justify-center">
            <div className="w-[420px] h-[420px] rounded-full bg-white/[0.02] flex items-center justify-center">
              <div className="w-[280px] h-[280px] rounded-full bg-amber-400/[0.04]" />
            </div>
          </div>
        </div>

        <Star size={16} className="absolute left-8 top-44 text-amber-300 fill-amber-300 opacity-80 pointer-events-none" />
        <Star size={9} className="absolute left-[30%] top-[260px] text-white/40 fill-white/40 pointer-events-none" />
        <div className="absolute right-12 top-48 w-2.5 h-2.5 rounded-full border-2 border-emerald-400/50 pointer-events-none" />
        <div className="absolute right-[22%] top-28 w-1.5 h-1.5 rounded-full bg-white/30 pointer-events-none" />

        <div className="relative z-10 px-6 pt-7">
          <div className="flex items-center justify-between">
            <Link href="/" className="w-9 h-9 -ml-2 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <ChevronLeft size={22} />
            </Link>
            <h1 className="text-lg font-bold text-white tracking-tight">Leaderboard</h1>
            <div className="w-9" />
          </div>
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">
            {activeTab === 'monthly' ? `${monthName} · Resets monthly` : 'All-time records'}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-5 bg-white/[0.04] border border-white/5 p-1 rounded-full">
            <Link
              href="/leaderboard"
              className={`text-center py-2.5 rounded-full text-xs font-bold transition-all ${
                activeTab === 'monthly'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              This month
            </Link>
            <Link
              href="/leaderboard?tab=alltime"
              className={`text-center py-2.5 rounded-full text-xs font-bold transition-all ${
                activeTab === 'alltime'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              All time
            </Link>
          </div>
        </div>

        {ranking.length === 0 ? (
          <div className="relative z-10 mt-10 bg-white rounded-t-[2rem] px-6 py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-300">
              <Users size={24} />
            </div>
            <p className="font-bold text-slate-800 text-sm mt-4">No one on the board yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-5">Fill surveys to claim the first spot.</p>
            <Link href="/" className="inline-flex bg-[#1e1a1d] text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-md">
              Browse Surveys →
            </Link>
          </div>
        ) : (
          <>
            <div className="relative z-10 flex items-end justify-center gap-1.5 px-4 sm:px-8 mt-8">
              {silver
                ? <PodiumSpot user={silver} place={2} rank={denseRanks[1]} isMe={silver.id === user?.id} />
                : <div className="flex-1" />}
              <PodiumSpot user={gold} place={1} rank={denseRanks[0]} isMe={gold.id === user?.id} />
              {bronze
                ? <PodiumSpot user={bronze} place={3} rank={denseRanks[2]} isMe={bronze.id === user?.id} />
                : <div className="flex-1" />}
            </div>

            <div className="relative z-20 -mt-6 bg-white rounded-t-[2rem] px-3 sm:px-5 pt-4 pb-6 shadow-[0_-12px_30px_-12px_rgba(0,0,0,0.4)]">
              {rest.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">Only the top {ranking.length} so far. Keep going!</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {rest.map((u, i) => {
                    const isMe = u.id === user?.id
                    const rank = denseRanks[i + 3]
                    const seed = u.name || u.username || '?'
                    const gradient = getAvatarGradient(seed)

                    return (
                      <Link
                        key={u.id}
                        href={u.username ? `/u/${u.username}` : '#'}
                        className={`group flex items-center gap-3 px-3 py-3.5 rounded-2xl transition-colors ${
                          isMe ? 'bg-emerald-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-6 text-center text-sm font-bold tabular-nums ${isMe ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {rank}
                        </span>

                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-sm font-black text-white shrink-0 ring-2 ring-white shadow-md group-hover:scale-95 transition-transform`}>
                          {seed[0].toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {u.name || `@${u.username}`}
                            {isMe && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-white bg-emerald-500 px-1.5 py-0.5 rounded-md align-middle">You</span>}
                          </p>
                          {u.fills > 0 && (
                            <p className="flex items-center gap-1 text-[11px] font-medium text-slate-400 mt-0.5">
                              <FileText size={10} /> {u.fills} responses
                            </p>
                          )}
                        </div>

                        <span className={`shrink-0 text-xs font-bold tabular-nums px-3 py-1.5 rounded-full ${
                          isMe ? 'text-emerald-700 bg-emerald-100' : 'text-slate-600 bg-slate-100'
                        }`}>
                          {u.points} pts
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PodiumSpot({
  user, place, rank, isMe,
}: {
  user: RankedUser
  place: 1 | 2 | 3
  rank: number
  isMe: boolean
}) {
  const seed = user.name || user.username || '?'
  const gradient = getAvatarGradient(seed)

  const cfg = {
    1: {
      wrap: 'flex-[1.25] z-10',
      avatar: 'w-20 h-20 text-2xl',
      ring: 'bg-amber-400/15 border border-amber-400/30',
      block: 'h-48 bg-gradient-to-b from-amber-400/30 to-amber-400/[0.04] border-x border-amber-400/25',
      lid: 'bg-amber-300/50',
      num: 'text-7xl text-amber-300',
      badge: 'bg-amber-400',
      icon: <Crown size={11} strokeWidth={3} />,
    },
    2: {
      wrap: 'flex-1',
      avatar: 'w-16 h-16 text-xl',
      ring: 'bg-slate-300/10 border border-slate-300/20',
      block: 'h-32 bg-gradient-to-b from-slate-300/25 to-slate-300/[0.03] border-x border-slate-300/20',
      lid: 'bg-slate-200/40',
      num: 'text-6xl text-slate-200',
      badge: 'bg-slate-400',
      icon: <Medal size={11} strokeWidth={3} />,
    },
    3: {
      wrap: 'flex-1',
      avatar: 'w-16 h-16 text-xl',
      ring: 'bg-amber-700/15 border border-amber-700/30',
      block: 'h-24 bg-gradient-to-b from-amber-700/35 to-amber-700/[0.04] border-x border-amber-700/30',
      lid: 'bg-amber-600/50',
      num: 'text-5xl text-amber-600',
      badge: 'bg-amber-700',
      icon: <Medal size={11} strokeWidth={3} />,
    },
  }[place]

  return (
    <Link
      href={user.username ? `/u/${user.username}` : '#'}
      className={`group flex flex-col items-center min-w-0 animate-scale-up ${cfg.wrap}`}
    >
      <div className="relative mb-2">
        <div className={`rounded-full p-1.5 ${cfg.ring} ${isMe ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#1e1a1d]' : ''}`}>
          <div className={`${cfg.avatar} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-white shadow-lg group-hover:scale-105 transition-transform`}>
            {seed[0].toUpperCase()}
          </div>
        </div>
        <span className={`absolute bottom-0 right-0 w-6 h-6 rounded-full ${cfg.badge} border-2 border-[#1e1a1d] flex items-center justify-center text-white shadow`}>
          {cfg.icon}
        </span>
      </div>

      <p className="text-[11px] sm:text-xs font-bold text-white truncate max-w-full px-1">
        {user.name || `@${user.username}`}
        {isMe && <span className="text-emerald-400"> (You)</span>}
      </p>

      <span className="mt-1.5 mb-2 text-[10px] font-black tabular-nums text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
        {user.points} pts
      </span>

      <div className="w-full">
        <div className={`h-3 ${cfg.lid}`} style={{ clipPath: 'polygon(10% 0, 90% 0, 100% 100%, 0 100%)' }} />
        <div className={`${cfg.block} flex justify-center pt-2`}>
          <span className={`${cfg.num} font-black leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]`}>
            {place}
          </span>
        </div>
      </div>
    </Link>
  )
}
