'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { ArrowLeft, User, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import UpdateProfileForm from './UpdateProfileForm'

export default function EditProfileDetailsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profileData, setProfileData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<string>('')

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser()
        if (userErr || !user) {
          setLoadError('You are not signed in. Please sign in again.')
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          setLoadError(error.message)
          return
        }

        if (!data) {
          const meta = user.user_metadata ?? {}
          const { data: created, error: createErr } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              name: typeof meta.name === 'string' ? meta.name.trim().slice(0, 60) : null,
              username: typeof meta.username === 'string' ? meta.username.trim().toLowerCase() : null,
            })
            .select('*')
            .single()

          if (createErr) {
            setLoadError(`No profile found and could not create one: ${createErr.message}`)
            return
          }
          setProfileData(created)
          return
        }

        setProfileData(data)
      } catch (err: any) {
        setLoadError(err?.message ?? 'Connection error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    getProfile()
  }, [supabase])

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-6 bg-white text-slate-900 min-h-screen animate-fade-in">

      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft size={14} /> Back to profile
      </button>

      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2">
          <User size={22} className="text-slate-800" /> Edit Profile Details
        </h1>
        <p className="text-xs text-slate-400 mt-1">Update your academic identity and fields of specialty.</p>
      </div>

      <div className="relative rounded-[2.5rem] overflow-hidden p-8 shadow-2xl border border-charcoal/10 bg-[#1e1a1d]/95 backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.01] rounded-full blur-2xl pointer-events-none" />

        {loading ? (
          <div className="flex items-center justify-center py-12 text-xs text-white/40 font-medium gap-2">
            <Loader2 size={16} className="animate-spin text-white" /> Loading form...
          </div>
        ) : profileData ? (
          <UpdateProfileForm profile={profileData} />
        ) : (
          <div className="text-center p-4 space-y-3">
            <p className="text-xs text-rose-400 font-bold">Failed to load profile data.</p>
            {loadError && (
              <p className="text-[11px] text-white/40 font-medium break-words">{loadError}</p>
            )}
            {loadError.includes('not signed in') ? (
              <button
                type="button"
                onClick={() => router.push('/auth')}
                className="inline-flex bg-white text-[#1e1a1d] text-xs font-bold px-5 py-2.5 rounded-xl"
              >
                Sign in
              </button>
            ) : (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex bg-white/10 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-white/15 transition-colors"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
