'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function registerInstallmentPayment(
  orderId: string,
  amount: number,
  reference?: string,
  method?: string,
  notes?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Todo el cobro (insert + recálculo con tope) vive en el RPC del servidor.
  // p_customer_phone = null → valida por dueño (auth.uid() = owner).
    const { data, error } = await supabase.rpc('record_order_payment', {
    p_order_id: orderId,
    p_amount: amount,
    p_method: method || null,
    p_reference: reference || null,
    p_screenshot_url: null,
    p_notes: notes || null,
    p_customer_phone: null,
    p_auto_approve: true,   // el dueño cobra en mano => acredita al instante
  })

  if (error) return { error: error.message }
  if (data && (data as any).ok === false) return { error: (data as any).error || 'Error al registrar el pago' }

  revalidatePath(`/dashboard/orders/${orderId}`)
  revalidatePath('/dashboard/orders')
  revalidatePath('/dashboard/customers')

  return {
    success: true,
    isFullyPaid: !!(data as any)?.fully_paid,
    newRemainingBalance: Number((data as any)?.pending ?? 0),
  }
}

export async function getInstallmentHistory(orderId: string) {
  const supabase = await createClient()

  // Fuente única de pagos: order_payments (la misma que usa el track-order del cliente)
  const { data: payments } = await supabase
    .from('order_payments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

return { success: true, data: payments || [] }
}

// Aprobar un abono pendiente (solo el dueño; el RPC valida ownership)
export async function approvePayment(paymentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('approve_order_payment', { p_payment_id: paymentId })
  if (error) return { error: error.message }
  if (data && (data as any).ok === false) return { error: (data as any).error || 'No se pudo aprobar' }

  revalidatePath('/dashboard/orders', 'layout')
  revalidatePath('/dashboard/customers')
  return { success: true, fullyPaid: !!(data as any)?.fully_paid }
}

// Rechazar un abono pendiente (NO acredita; solo el dueño)
export async function rejectPayment(paymentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('reject_order_payment', { p_payment_id: paymentId })
  if (error) return { error: error.message }
  if (data && (data as any).ok === false) return { error: (data as any).error || 'No se pudo rechazar' }

  revalidatePath('/dashboard/orders', 'layout')
  revalidatePath('/dashboard/customers')
  return { success: true }

}