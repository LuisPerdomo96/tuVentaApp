import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminPanel } from './admin-panel'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ¿Es super-admin? (valida contra super_admins dentro del RPC)
  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) redirect('/dashboard')

  // Cargar datos (las funciones re-validan admin dentro y cruzan el RLS)
  const [pendingRes, companiesRes] = await Promise.all([
    supabase.rpc('admin_list_pending_approvals'),
    supabase.rpc('admin_list_companies'),
  ])

  return (
    <AdminPanel
      initialPending={(pendingRes.data as any[]) || []}
      initialCompanies={(companiesRes.data as any[]) || []}
      adminEmail={user.email || ''}
    />
  )
}