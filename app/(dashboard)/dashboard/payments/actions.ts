'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPlan, checkPaymentMethodsLimit } from '@/lib/plans'

export async function createPaymentMethod(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: company } = await supabase
    .from('companies')
    .select('id, plan')
    .eq('owner_id', user.id)
    .single()

  if (!company) return { error: 'Empresa no encontrada' }

  // Enforcement: límite de métodos de pago por plan (fuente única: lib/plans.ts)
  const plan = getPlan(company.plan)
  const { count, error: countErr } = await supabase
    .from('payment_methods')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', company.id)
    .eq('is_active', true)

  if (countErr) return { error: 'Error al verificar límite de métodos de pago' }

  const blocked = checkPaymentMethodsLimit(plan, count || 0)
  if (blocked) return { error: blocked }

  const type = formData.get('type') as string
  const detailsString = formData.get('details') as string
  const details = detailsString ? JSON.parse(detailsString) : {}

  const validTypes = ['pago_movil', 'binance', 'zelle', 'paypal', 'cash']
  if (!validTypes.includes(type)) {
    return { error: 'Tipo de método de pago inválido' }
  }

  const { error } = await supabase
    .from('payment_methods')
    .insert({
      company_id: company.id,
      type,
      details,
      is_active: true,
    })

  if (error) {
    console.error('Error creating payment method:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/payments')
  return { success: true }
}