import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardContent from './dashboard-content'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) redirect('/dashboard')

  // Cargar todos los datos necesarios
  const [statsRes, companiesRes, pendingRes, planDistRes, revenueRes] = await Promise.all([
    supabase.rpc('admin_get_stats'),
    supabase.rpc('admin_list_companies'),
    supabase.rpc('admin_list_pending_approvals'),
    supabase.rpc('admin_get_plan_distribution'),
    supabase.rpc('admin_get_revenue_history'),
  ])

  const stats = (statsRes.data as any) || {
    total_companies: 0,
    active_companies: 0,
    pending_upgrades: 0,
    monthly_revenue: 0,
  }

  const companies = (companiesRes.data as any[]) || []
  const pending = (pendingRes.data as any[]) || []
  const planDistribution = (planDistRes.data as any[]) || []
  const revenueHistory = (revenueRes.data as any[]) || []

  return (
    <DashboardContent 
      stats={stats}
      recentCompanies={companies.slice(0, 5)}
      pendingCount={pending.length}
      planDistribution={planDistribution}
      revenueHistory={revenueHistory}
    />
  )
}