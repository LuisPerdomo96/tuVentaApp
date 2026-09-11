import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrialsContent from './trials-content'

export default async function TrialsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) redirect('/dashboard')

  const [trialsRes, statsRes, companiesRes] = await Promise.all([
    supabase.rpc('admin_get_all_trials'),
    supabase.rpc('admin_get_trial_stats'),
    supabase.rpc('admin_list_companies'),
  ])

  return (
    <TrialsContent
      trials={(trialsRes.data as any[]) || []}
      stats={(statsRes.data as any) || {}}
      companies={(companiesRes.data as any[]) || []}
    />
  )
}