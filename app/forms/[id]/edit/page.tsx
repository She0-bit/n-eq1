import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import EditFormClient from './EditFormClient'

export const revalidate = 0

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: form } = await supabase
    .from('forms')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!form) notFound()

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 py-12 px-6 animate-fade-in">
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="space-y-6">
          <Link href={`/forms/${form.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-[#1e1a1d] transition-colors">
            <ChevronLeft size={18} />
            Back to survey
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-[#1e1a1d] tracking-tight">Edit Survey</h1>
            <p className="text-slate-500 text-sm font-medium">Update your research protocol and target audience.</p>
          </div>
        </div>

        <EditFormClient form={form} />
      </div>
    </div>
  )
}
