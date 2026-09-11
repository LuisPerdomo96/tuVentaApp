import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TiendasContent from './tiendas-content'

export default async function TiendasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) redirect('/dashboard')

  const [pendingRes, companiesRes] = await Promise.all([
    supabase.rpc('admin_list_pending_approvals'),
    supabase.rpc('admin_list_companies'),
  ])

  return (
    <TiendasContent
      initialPending={(pendingRes.data as any[]) || []}
      initialCompanies={(companiesRes.data as any[]) || []}
    />
  )
}