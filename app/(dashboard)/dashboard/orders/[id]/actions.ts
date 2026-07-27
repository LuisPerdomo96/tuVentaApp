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