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

  // Obtener el pedido
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (!order) return { error: 'Pedido no encontrado' }

  // Verificar que pertenece a la empresa del usuario
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .eq('id', order.company_id)
    .single()

  if (!company) return { error: 'No tienes acceso a este pedido' }

  // Calcular cuánto falta por pagar
  const totalPaidSoFar = order.initial_payment + (order.installments_paid || 0)
  const remaining = order.total_usd - totalPaidSoFar

  if (amount > remaining) {
    return { error: `El monto excede el saldo pendiente ($${remaining.toFixed(2)})` }
  }

  if (amount <= 0) {
    return { error: 'El monto debe ser mayor a 0' }
  }

  // Registrar el pago parcial
  const { error: insertError } = await supabase
    .from('order_installments')
    .insert({
      order_id: orderId,
      amount,
      payment_reference: reference || null,
      payment_method: method || null,
      notes: notes || null,
    })

  if (insertError) return { error: insertError.message }

  // Actualizar el pedido
  const newInstallmentsPaid = (order.installments_paid || 0) + amount
  const newRemainingBalance = order.total_usd - order.initial_payment - newInstallmentsPaid
  const isFullyPaid = newRemainingBalance <= 0

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      installments_paid: newInstallmentsPaid,
      remaining_balance: newRemainingBalance,
      status: isFullyPaid ? 'payment_approved' : order.status,
    })
    .eq('id', orderId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/dashboard/orders/${orderId}`)
  
  return { 
    success: true, 
    isFullyPaid,
    newRemainingBalance 
  }
}

export async function getInstallmentHistory(orderId: string) {
  const supabase = await createClient()

  const { data: installments } = await supabase
    .from('order_installments')
    .select('*')
    .eq('order_id', orderId)
    .order('paid_at', { ascending: false })

  return { success: true, data: installments || [] }
}