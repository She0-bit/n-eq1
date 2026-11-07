import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import AdminControls from './AdminControls'
import { Shield } from 'lucide-react'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

 
  const { data: me } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!me?.is_admin) notFound()

  
  await supabase.rpc('admin_release_expired_bans')

  const [
    { data: reportGroups },
    { data: users },
    { data: forms },
  ] = await Promise.all([
    supabase.rpc('admin_get_reports', { include_resolved: true }),
    supabase
      .from('profiles')
      .select('id, name, username, institution, specialty, points, strikes, banned_until, ban_reason, is_admin')
      .not('username', 'is', null)
      .order('name', { ascending: true }),
    supabase
      .from('forms')
      .select('id, title, user_id, is_active, moderation_status, fill_count, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const openReports = (reportGroups ?? []).reduce((n: number, g: any) => n + Number(g.open_count ?? 0), 0)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8 bg-white text-slate-900 min-h-screen animate-fade-in">

      {/**/}
      <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-b from-[#1e1a1d] to-[#2b2427] border border-white/10 px-6 py-10 sm:px-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.35)] text-white">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl mb-4">
            <Shield size={12} /> Admin
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Moderation Panel</h1>
          <p className="text-white/40 text-xs sm:text-sm font-medium">Review reports, warn researchers, and manage accounts.</p>

          <div className="grid grid-cols-3 gap-2.5 mt-8">
            <HeroStat value={openReports} label="open reports" highlight={openReports > 0} />
            <HeroStat value={users?.length ?? 0} label="users" />
            <HeroStat value={forms?.length ?? 0} label="surveys" />
          </div>
        </div>
      </div>

      <AdminControls
        reportGroups={(reportGroups as any[]) ?? []}
        users={(users as any[]) ?? []}
        forms={(forms as any[]) ?? []}
        myId={user.id}
      />
    </div>
  )
}

function HeroStat({ value, label, highlight = false }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 text-center border ${highlight ? 'bg-rose-500/10 border-rose-500/25' : 'bg-white/[0.04] border-white/5'}`}>
      <p className={`text-2xl font-black tabular-nums leading-none ${highlight ? 'text-rose-400' : 'text-white'}`}>{value}</p>
      <p className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 ${highlight ? 'text-rose-400/70' : 'text-white/30'}`}>{label}</p>
    </div>
  )
}
