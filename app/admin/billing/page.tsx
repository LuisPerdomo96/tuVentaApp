import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingClient } from './billing-client'

export default async function AdminBillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) redirect('/dashboard')

  // Todos los métodos (activos e inactivos) para poder editar/reactivar
  const { data: methods } = await supabase
    .from('super_admin_payment_methods')
    .select('*')
    .order('is_active', { ascending: false })
    .order('sort')

  // Settings singleton (tasa + soporte)
  const { data: settingsRows } = await supabase
    .from('saas_settings')
    .select('*')
    .limit(1)

  return (
    <BillingClient
      initialMethods={(methods as any[]) || []}
      initialSettings={(settingsRows?.[0] as any) || null}
    />
  )
}