'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useState } from 'react'

export default function DeactivateButton({ formId, isActive }: { formId: string; isActive: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function toggle() {
    setLoading(true)
    setError('')
    const { data, error: updateError } = await supabase
      .from('forms')
      .update({ is_active: !isActive })
      .eq('id', formId)
      .select('is_active')
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }
    if (!data || data.length === 0) {
      setError('You can only change your own surveys.')
      return
    }
    if (data[0].is_active === isActive) {
      setError('This survey is under review and can’t be reactivated yet.')
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggle}
        disabled={loading}
        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 whitespace-nowrap ${
          isActive
            ? 'text-red-500 border-red-200 hover:bg-red-50'
            : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
        }`}
      >
        {loading ? '…' : isActive ? 'Deactivate' : 'Reactivate'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
