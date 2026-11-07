'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Plus, LogOut, Menu, X, Trophy, Users, Settings, User as UserIcon, ChevronDown, Shield, Bell, AlertTriangle, Trash2, Ban, CheckCircle, EyeOff } from 'lucide-react'
import { getAvatarGradient } from '@/components/Avatar'
import type { User as SupabaseUser } from '@supabase/supabase-js'

type Notif = {
  id: string
  type: string
  title: string
  body: string | null
  form_id: string | null
  read_at: string | null
  created_at: string
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); return `${d}d ago`
}

function NotifIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ReactNode; cls: string }> = {
    warning:      { icon: <AlertTriangle size={14} />, cls: 'text-amber-300 bg-amber-400/10' },
    removed:      { icon: <Trash2 size={14} />,        cls: 'text-rose-400 bg-rose-500/10' },
    banned:       { icon: <Ban size={14} />,           cls: 'text-rose-400 bg-rose-500/10' },
    under_review: { icon: <EyeOff size={14} />,        cls: 'text-white/60 bg-white/5' },
    restored:     { icon: <CheckCircle size={14} />,   cls: 'text-emerald-400 bg-emerald-500/10' },
    unbanned:     { icon: <CheckCircle size={14} />,   cls: 'text-emerald-400 bg-emerald-500/10' },
  }
  const m = map[type] ?? { icon: <Bell size={14} />, cls: 'text-white/60 bg-white/5' }
  return <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.cls}`}>{m.icon}</div>
}

export default function Navbar() {
  const [user, setUser]         = useState<SupabaseUser | null>(null)
  const [points, setPoints]     = useState(0)
  const [username, setUsername] = useState<string | null>(null)
  const [name, setName]         = useState<string | null>(null)
  const [isAdmin, setIsAdmin]   = useState(false)
  const [openReports, setOpenReports] = useState(0)
  const [notifs, setNotifs]     = useState<Notif[]>([])
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false) 
  const [userDropdown, setUserDropdown] = useState(false) 
  const [scrolled, setScrolled] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdown(false)
      }
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        closeBell()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

 
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setPoints(0); setUsername(null); setName(null); setIsAdmin(false); setOpenReports(0); setNotifs([]); return }

    supabase.from('notifications')
      .select('id, type, title, body, form_id, read_at, created_at')
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifs((data as Notif[]) ?? []))

    supabase.from('profiles').select('points, username, name, is_admin').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setPoints(data.points); setUsername(data.username); setName(data.name)
          setIsAdmin(!!data.is_admin)
          if (data.is_admin) {
            supabase.rpc('admin_open_reports_count').then(({ data: n }) => setOpenReports(Number(n ?? 0)))
          } else {
            setOpenReports(0)
          }
        }
      })
  }, [user, pathname])

  useEffect(() => { setUserDropdown(false); setMenuOpen(false); setBellOpen(false) }, [pathname])

  function openBell() {
    setBellOpen(true)
    setUserDropdown(false)
    if (notifs.length > 0) supabase.rpc('mark_notifications_read').then(() => {})
  }

  function toggleMenu() {
    if (menuOpen) {
      setMenuOpen(false)
      if (notifs.length > 0) setNotifs([])
    } else {
      setMenuOpen(true)
      if (notifs.length > 0) supabase.rpc('mark_notifications_read').then(() => {})
    }
  }

  function closeBell() {
    setBellOpen(open => {
      if (open) setNotifs([])
      return false
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const leaderboardHref = user ? '/leaderboard' : '/auth'
  const usersHref       = user ? '/users'       : '/auth'
  const profileHref     = username ? `/u/${username}` : '/profile'
  const avatarSeed      = name || username || 'U'
  const avatarInitial   = avatarSeed[0]?.toUpperCase() ?? 'U'
  const gradient        = getAvatarGradient(avatarSeed)

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-[#1e1a1d]/95 backdrop-blur-md border-b border-white/5' : 'bg-[#1e1a1d] border-b border-white/5'
    }`}>
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-20">
        
        <Link href="/" className="shrink-0 transition-transform hover:scale-105">
          <img src="/logo-light.png" alt="n=1" className="h-9 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
        </Link>

        <div className="hidden sm:flex items-center gap-10">
          <div className="flex items-center gap-8">
            <Link href={leaderboardHref} className="flex items-center gap-2 text-white/50 hover:text-white transition-all text-sm font-medium group">
              <Trophy size={16} className="group-hover:text-emerald-400 transition-colors" /> Leaderboard
            </Link>
            <Link href={usersHref} className="flex items-center gap-2 text-white/50 hover:text-white transition-all text-sm font-medium group">
              <Users size={16} className="group-hover:text-emerald-400 transition-colors" /> Researchers
            </Link>
            {isAdmin && (
              <Link href="/admin" className={`relative flex items-center gap-2 text-sm font-bold transition-all px-3 py-1.5 rounded-xl border ${
                pathname?.startsWith('/admin')
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                  : 'text-white/70 border-white/10 hover:text-white hover:border-white/20'
              }`}>
                <Shield size={15} /> Admin
                {openReports > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg">
                    {openReports > 99 ? '99+' : openReports}
                  </span>
                )}
              </Link>
            )}
          </div>

          <div className="h-6 w-px bg-white/10" />

          {user && notifs.length > 0 && (
            <div className="relative -mr-6" ref={bellRef}>
              <button
                onClick={() => (bellOpen ? closeBell() : openBell())}
                className="relative w-10 h-10 flex items-center justify-center rounded-2xl text-white/70 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                aria-label="Notifications"
              >
                <Bell size={18} className={bellOpen ? '' : 'animate-pulse'} />
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-lg">
                  {notifs.length > 9 ? '9+' : notifs.length}
                </span>
              </button>

              {bellOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-[#262125] border border-white/10 rounded-[2rem] shadow-2xl py-3 px-2 animate-fade-in backdrop-blur-xl">
                  <p className="px-4 py-2 text-[10px] uppercase tracking-widest text-white/30 font-bold">Notifications</p>
                  <div className="max-h-96 overflow-y-auto space-y-1">
                    {notifs.map(n => {
                      const inner = (
                        <>
                          <NotifIcon type={n.type} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white leading-snug">{n.title}</p>
                            {n.body && <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{n.body}</p>}
                            <p className="text-[10px] text-white/25 font-bold mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                        </>
                      )
                      return n.form_id ? (
                        <Link key={n.id} href={`/forms/${n.form_id}`}
                          className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-all">
                          {inner}
                        </Link>
                      ) : (
                        <div key={n.id} className="flex items-start gap-3 px-3 py-3 rounded-xl">
                          {inner}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setUserDropdown(!userDropdown)}
                className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
              >
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xs font-bold text-white shadow-inner`}>
                  {avatarInitial}
                </div>
                <ChevronDown size={14} className={`text-white/30 transition-transform ${userDropdown ? 'rotate-180' : ''}`} />
              </button>

              {userDropdown && (
                <div className="absolute right-0 mt-3 w-64 bg-[#262125] border border-white/10 rounded-[2rem] shadow-2xl py-3 px-2 animate-fade-in backdrop-blur-xl">
                  <div className="px-4 py-3 mb-2 border-b border-white/5">
                    <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">My Points</p>
                    <div className="flex items-center justify-between">
                       <span className="text-emerald-400 font-bold text-lg tabular-nums">{points} <span className="text-[10px] text-emerald-400/60 uppercase">pts</span></span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {isAdmin && (
                      <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 transition-all text-sm font-bold">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Shield size={16} /></div>
                        Admin Panel
                        {openReports > 0 && (
                          <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                            {openReports > 99 ? '99+' : openReports}
                          </span>
                        )}
                      </Link>
                    )}
                    <Link href="/submit" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-all text-sm font-medium">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><Plus size={16} /></div>
                      Submit Survey
                    </Link>
                    <Link href={profileHref} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-all text-sm font-medium">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><UserIcon size={16} /></div>
                      My Profile
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-all text-sm font-medium">
  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><Settings size={16} /></div>
  Settings
</Link>
                    
                    <div className="h-px bg-white/5 my-2 mx-2" />
                    
                    <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400/70 hover:text-red-400 transition-all text-sm font-medium text-left">
                      <div className="w-8 h-8 rounded-lg bg-red-500/5 flex items-center justify-center"><LogOut size={16} /></div>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth" className="bg-white text-[#1e1a1d] px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-white/90 transition-all shadow-xl">
              Sign in
            </Link>
          )}
        </div>

        <button onClick={toggleMenu} className="sm:hidden relative w-10 h-10 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all" aria-label="Menu">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
          {!menuOpen && (notifs.length > 0 || openReports > 0) && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#1e1a1d]" />
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-white/5 bg-[#1e1a1d] px-4 pb-6 pt-3 max-h-[calc(100vh-5rem)] overflow-y-auto animate-fade-in">
          {user ? (
            <>
              <Link href={profileHref} className="flex items-center gap-3 px-3 py-3 mb-2 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-sm font-bold text-white shrink-0`}>
                  {avatarInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{name || (username ? `@${username}` : 'My account')}</p>
                  {username && <p className="text-xs text-white/30 truncate">@{username}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-emerald-400 font-black text-base tabular-nums leading-none">{points}</p>
                  <p className="text-[9px] text-emerald-400/60 font-bold uppercase tracking-wider mt-1">pts</p>
                </div>
              </Link>

              {notifs.length > 0 && (
                <div className="mb-2 rounded-2xl bg-white/[0.03] border border-white/5 p-2">
                  <p className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-widest text-white/30 font-bold flex items-center gap-1.5">
                    <Bell size={11} className="text-rose-400" /> Notifications
                    <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                      {notifs.length}
                    </span>
                  </p>
                  <div className="space-y-1">
                    {notifs.map(n => {
                      const inner = (
                        <>
                          <NotifIcon type={n.type} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white leading-snug">{n.title}</p>
                            {n.body && <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{n.body}</p>}
                            <p className="text-[10px] text-white/25 font-bold mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                        </>
                      )
                      return n.form_id ? (
                        <Link key={n.id} href={`/forms/${n.form_id}`} className="flex items-start gap-3 px-2 py-2.5 rounded-xl hover:bg-white/5">
                          {inner}
                        </Link>
                      ) : (
                        <div key={n.id} className="flex items-start gap-3 px-2 py-2.5">{inner}</div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                {isAdmin && (
                  <MobileLink href="/admin" icon={<Shield size={16} />} highlight badge={openReports}>Admin Panel</MobileLink>
                )}
                <MobileLink href="/leaderboard" icon={<Trophy size={16} />} active={pathname === '/leaderboard'}>Leaderboard</MobileLink>
                <MobileLink href="/users" icon={<Users size={16} />} active={pathname === '/users'}>Researchers</MobileLink>
                <MobileLink href="/submit" icon={<Plus size={16} />} active={pathname === '/submit'}>Submit Survey</MobileLink>
                <MobileLink href={profileHref} icon={<UserIcon size={16} />}>My Profile</MobileLink>
                <MobileLink href="/settings" icon={<Settings size={16} />} active={pathname === '/settings'}>Settings</MobileLink>

                <div className="h-px bg-white/5 my-2 mx-2" />

                <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-500/10 text-red-400/70 hover:text-red-400 transition-all text-sm font-medium text-left">
                  <div className="w-9 h-9 rounded-lg bg-red-500/5 flex items-center justify-center"><LogOut size={16} /></div>
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <MobileLink href="/auth" icon={<Trophy size={16} />}>Leaderboard</MobileLink>
              <MobileLink href="/auth" icon={<Users size={16} />}>Researchers</MobileLink>
              <Link href="/auth" className="block w-full text-center bg-white text-[#1e1a1d] mt-3 py-3.5 rounded-xl text-sm font-bold hover:bg-white/90 transition-all shadow-xl">
                Sign in
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
function MobileLink({ href, icon, children, active = false, highlight = false, badge = 0 }: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  active?: boolean
  highlight?: boolean
  badge?: number
}) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm ${
      highlight
        ? 'bg-emerald-500/10 text-emerald-400 font-bold'
        : active
          ? 'bg-white/5 text-white font-bold'
          : 'text-white/70 hover:text-white hover:bg-white/5 font-medium'
    }`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${highlight ? 'bg-emerald-500/10' : 'bg-white/5'}`}>{icon}</div>
      {children}
      {badge > 0 && (
        <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}
