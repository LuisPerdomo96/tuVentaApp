'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: order } = await supabase
    .from('orders')
    .select('company_id')
    .eq('id', orderId)
    .single()

  if (!order) return { error: 'Pedido no encontrado' }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .eq('id', order.company_id)
    .single()

  if (!company) return { error: 'No tienes acceso a este pedido' }

  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/orders')
  return { success: true }
}

export async function getOrders(filters?: {
  status?: string
  startDate?: string
  endDate?: string
  search?: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', data: [] }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!company) return { error: 'Empresa no encontrada', data: [] }

  let query = supabase
    .from('orders')
    .select(`
      *,
      order_items (
        product_name,
        quantity,
        price_usd
      )
    `)
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate)
  }

  const { data, error } = await query

  if (error) {
    return { error: error.message, data: [] }
  }

  let filteredData = data || []
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    filteredData = filteredData.filter(order => 
      order.customer_name.toLowerCase().includes(searchLower) ||
      order.customer_phone.includes(searchLower) ||
      order.id.toLowerCase().includes(searchLower)
    )
  }

  return { success: true, data: filteredData }
}

export async function getOrderStats() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!company) return { error: 'Empresa no encontrada' }

  const { data: allOrders, error } = await supabase
    .from('orders')
    .select('status')
    .eq('company_id', company.id)

  if (error) {
    return { error: error.message, stats: {} }
  }

  const stats = {
    total: allOrders?.length || 0,
    pending: allOrders?.filter(o => o.status === 'pending_payment').length || 0,
    review: allOrders?.filter(o => o.status === 'payment_review').length || 0,
    approved: allOrders?.filter(o => o.status === 'payment_approved').length || 0,
    in_preparation: allOrders?.filter(o => o.status === 'in_preparation').length || 0,
    ready: allOrders?.filter(o => o.status === 'ready').length || 0,
    delivered: allOrders?.filter(o => o.status === 'delivered').length || 0,
    cancelled: allOrders?.filter(o => o.status === 'cancelled').length || 0,
    installment_active: allOrders?.filter(o => o.status === 'installment_active').length || 0,
    installment_completed: allOrders?.filter(o => o.status === 'installment_completed').length || 0,
  }

  return { success: true, stats }
}

// ✅ NUEVA: Historial de apartados
export async function getInstallmentHistory(orderId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', data: [] }

  const { data: payments, error } = await supabase
    .from('order_payments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error obteniendo historial:', error)
    return { error: error.message, data: [] }
  }

  return { success: true, data: payments || [] }
}

// ✅ NUEVA: Registrar pago de apartado
export async function registerInstallmentPayment(
  orderId: string,
  amount: number,
  reference: string,
  method: string,
  notes: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    return { error: 'Pedido no encontrado' }
  }

  const currentPaid = order.paid_amount || order.initial_payment || 0
  const newPaidAmount = currentPaid + amount
  const newRemainingBalance = Math.max(0, order.total_usd - newPaidAmount)

  let newStatus = order.status
  if (newRemainingBalance <= 0) {
    newStatus = 'installment_completed'
  } else if (order.status !== 'installment_active') {
    newStatus = 'installment_active'
  }

  const { error: paymentError } = await supabase
    .from('order_payments')
    .insert({
      order_id: orderId,
      amount: amount,
      payment_method: method,
      payment_reference: reference || null,
      notes: notes || null,
      created_by: user.id,
    })

  if (paymentError) {
    return { error: paymentError.message }
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      paid_amount: newPaidAmount,
      pending_amount: newRemainingBalance,
      remaining_balance: newRemainingBalance,
      status: newStatus,
      last_payment_date: new Date().toISOString(),
      installments_paid: (order.installments_paid || 0) + 1,
    })
    .eq('id', orderId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/dashboard/orders')
  revalidatePath('/dashboard/customers')

  return { 
    success: true, 
    isFullyPaid: newRemainingBalance <= 0,
    newRemainingBalance 
  }
}