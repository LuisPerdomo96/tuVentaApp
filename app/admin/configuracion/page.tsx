import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConfiguracionContent from './configuracion-content'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) redirect('/dashboard')

  const [settingsRes, plansRes, statsRes, logRes] = await Promise.all([
    supabase.rpc('admin_get_system_settings'),
    supabase.rpc('admin_get_plans_config'),
    supabase.rpc('admin_get_config_stats'),
    supabase.rpc('admin_get_config_change_log', { p_limit: 20 }),
  ])

  return (
    <ConfiguracionContent
      settings={(settingsRes.data as any[]) || []}
      plans={(plansRes.data as any[]) || []}
      stats={(statsRes.data as any) || {}}
      changeLog={(logRes.data as any[]) || []}
      adminEmail={user.email || ''}
    />
  )
}