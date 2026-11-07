import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { FileText, Plus, Lock, Pencil, Settings, School, BookOpen } from 'lucide-react'
import FollowButton from './FollowButton'
import ShareProfileButton from './ShareProfileButton'
import FormCard from '@/components/FormCard'
import type { FormFeedItem } from '@/lib/types'

export const revalidate = 0

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username: rawUsername } = await params
  const username = decodeURIComponent(rawUsername).trim().toLowerCase()
  if (!/^[a-z0-9_]{1,20}$/.test(username)) notFound()

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, username, institution, specialty, points, show_in_leaderboard')
    .eq('username', username)
    .maybeSingle()

  if (!profile) notFound()

  const isOwner = user?.id === profile.id
  const canShowPoints = isOwner || profile.show_in_leaderboard !== false

  const [{ data: forms }, { data: followerRows }, { data: followingRows }, { data: isFollowingRow }] =
    await Promise.all([
      supabase.from('forms_feed').select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase.from('follows').select('id').eq('following_id', profile.id),
      supabase.from('follows').select('id').eq('follower_id', profile.id),
      user && !isOwner
        ? supabase.from('follows').select('id')
            .eq('follower_id', user.id)
            .eq('following_id', profile.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

  const followerCount  = followerRows?.length ?? 0
  const followingCount = followingRows?.length ?? 0
  const isFollowing    = !!isFollowingRow
  const feed           = (forms ?? []) as FormFeedItem[]
  const totalResponses = feed.reduce((a, f) => a + (f.fill_count ?? 0), 0)
  const displayName    = profile.name || `@${profile.username}`
  const initialLetter  = displayName.replace(/^@/, '').charAt(0).toUpperCase()

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-10 bg-white text-slate-900 animate-fade-in">
      
      <div className="relative rounded-[2.5rem] overflow-hidden p-8 md:p-10 shadow-2xl border border-charcoal/10 bg-[#1e1a1d]/95 backdrop-blur-xl text-white">
        
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
            
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-3xl font-black text-white shadow-inner select-none">
                {initialLetter}
              </div>
              
              <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-white">{displayName}</h1>
                <p className="text-sm text-white/50 font-medium">@{profile.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {isOwner ? (
                <Link href="/profile"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-charcoal hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-sm">
                  <Pencil size={14} />
                  Edit details
                </Link>
              ) : (
                <FollowButton
                  targetUserId={profile.id}
                  currentUserId={user?.id ?? null}
                  initialFollowing={isFollowing}
                  followerCount={followerCount}
                />
              )}
              
              <ShareProfileButton username={profile.username!} />
              
              {isOwner && (
                <Link href="/settings" title="Account Settings"
                  className="p-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-white/80 hover:text-white transition-all shadow-sm">
                  <Settings size={16} />
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Points', value: profile.points ?? 0, isPoints: true },
              { label: 'Followers', value: followerCount },
              { label: 'Following', value: followingCount },
              { label: 'Responses', value: totalResponses },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
                {s.isPoints && !canShowPoints ? (
                  <div className="flex items-center justify-center gap-1 text-xs font-bold text-white/30 py-1">
                    <Lock size={12}/> Hidden
                  </div>
                ) : (
                  <div className="text-2xl font-black text-white tabular-nums tracking-tight">{s.value}</div>
                )}
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!isOwner && (profile.institution || profile.specialty) && (
        <div className="flex flex-wrap items-center gap-2 px-2 text-slate-500 text-xs font-semibold animate-fade-in">
          {profile.institution && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-xl text-slate-600 shadow-sm">
              <School size={13} className="text-slate-400" />
              <span>{profile.institution}</span>
            </div>
          )}
          {profile.specialty && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-xl text-slate-600 shadow-sm">
              <BookOpen size={13} className="text-slate-400" />
              <span>{profile.specialty}</span>
            </div>
          )}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <h2 className="flex items-center gap-2.5 font-black text-slate-900 text-base tracking-tight">
            <FileText className="text-slate-400" size={18} /> 
            {isOwner ? 'My surveys' : `${displayName}'s surveys`}
          </h2>
          {isOwner && (
            <Link href="/submit"
              className="flex items-center gap-1 text-xs font-bold text-charcoal hover:text-charcoal-deep">
              <Plus size={14} /> Submit new
            </Link>
          )}
        </div>

        {feed.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-[2rem] p-12 text-center bg-slate-50 space-y-4">
            <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center mx-auto text-slate-400 shadow-sm">
              <FileText size={20} />
            </div>
            <div className="max-w-xs mx-auto">
              <p className="font-bold text-slate-800 text-sm">No surveys yet</p>
              <p className="text-xs text-slate-400 mt-1">
                {isOwner ? "Post your first survey and start collecting responses." : "This researcher hasn't posted any surveys yet."}
              </p>
            </div>
            {isOwner && (
              <Link href="/submit"
                className="inline-block bg-charcoal hover:bg-charcoal-deep text-white text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-sm">
                Submit a survey →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feed.map((form, i) => (
              <FormCard key={form.id} form={form} rank={i + 1} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
