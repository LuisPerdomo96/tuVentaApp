import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubscriptionClient } from './subscription-client'

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug, plan, plan_expires_at, subscription_status')
    .eq('owner_id', user.id)
    .single()
  if (!company) redirect('/onboarding')

  // Solicitud abierta (upgrade/renewal en revisión)
  const { data: pendingRows } = await supabase
    .from('subscription_events')
    .select('*')
    .eq('company_id', company.id)
    .eq('status', 'pending')
    .in('type', ['upgrade', 'renewal'])
    .order('created_at', { ascending: false })
    .limit(1)

  // Historial de solicitudes (últimas 5)
  const { data: history } = await supabase
    .from('subscription_events')
    .select('id, type, status, plan_to, amount_usd, billing_cycle, created_at')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Métodos de pago del SaaS (RLS: lectura abierta a authenticated)
  const { data: paymentMethods } = await supabase
    .from('super_admin_payment_methods')
    .select('*')
    .eq('is_active', true)
    .order('sort')

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
        </div>
      }
    >
      <SubscriptionClient
        company={company}
        pendingEvent={pendingRows?.[0] || null}
        history={(history as any[]) || []}
        paymentMethods={(paymentMethods as any[]) || []}
      />
    </Suspense>
  )
}