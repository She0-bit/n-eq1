'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { UserPlus, UserMinus, Loader2 } from 'lucide-react'

type Props = {
  targetUserId:     string
  currentUserId:    string | null
  initialFollowing: boolean
  followerCount:    number
}

export default function FollowButton({ targetUserId, currentUserId, initialFollowing, followerCount }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [count, setCount]         = useState(followerCount)
  const [loading, setLoading]     = useState(false)

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setFollowing(initialFollowing)
    setCount(followerCount)
  }, [initialFollowing, followerCount])

  if (currentUserId && currentUserId === targetUserId) return null

  async function toggle() {
    if (!currentUserId) {
      router.push('/auth')
      return
    }

    setLoading(true)

    if (following) {
      const { error } = await supabase.from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)

      if (!error) {
        setFollowing(false)
        setCount(c => Math.max(0, c - 1))
      }
    } else {
      const { error } = await supabase.from('follows')
        .insert({ follower_id: currentUserId, following_id: targetUserId })

      if (!error) {
        setFollowing(true)
        setCount(c => c + 1)
      } else if (error.code === '23505') {
        setFollowing(true)
      }
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 ${
        following
          ? 'bg-white/10 text-white hover:bg-rose-500/20 hover:text-rose-300 border border-white/10'
          : 'bg-white text-charcoal hover:bg-slate-100'
      }`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : following ? (
        <>
          <UserMinus size={14} />
          Following ({count})
        </>
      ) : (
        <>
          <UserPlus size={14} />
          Follow ({count})
        </>
      )}
    </button>
  )
}
