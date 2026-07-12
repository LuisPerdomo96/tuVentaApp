'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCustomers() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', data: [] }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!company) return { error: 'Empresa no encontrada', data: [] }

  // ✅ CORRECCIÓN: Incluir TODOS los estados relevantes
  const { data: orders } = await supabase
    .from('orders')
    .select('customer_name, customer_phone, total_usd, status, created_at, payment_type, remaining_balance, paid_amount, pending_amount, initial_payment')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  if (!orders) return { error: 'Error al obtener datos', data: [] }

  const customerMap: any = {}

  orders.forEach(order => {
    const key = order.customer_phone
    if (!customerMap[key]) {
      customerMap[key] = {
        phone: order.customer_phone,
        name: order.customer_name,
        totalSpent: 0,
        totalOrders: 0,
        lastOrderDate: order.created_at,
        lastOrderTotal: order.total_usd,
        activeInstallments: 0,
        totalPending: 0,
      }
    }
    customerMap[key].totalSpent += order.total_usd
    customerMap[key].totalOrders += 1
    
    // ✅ CORRECCIÓN: Contar apartados con saldo pendiente
    const pendingAmount = order.pending_amount || order.remaining_balance || 0
    if (order.payment_type === 'installment' && pendingAmount > 0) {
      customerMap[key].activeInstallments = (customerMap[key].activeInstallments || 0) + 1
      customerMap[key].totalPending = (customerMap[key].totalPending || 0) + pendingAmount
    }
  })

  const customers = Object.values(customerMap).sort(
    (a: any, b: any) => b.totalSpent - a.totalSpent
  )

  return { success: true, data: customers }
}

export async function getCustomerHistory(phone: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', data: [] }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!company) return { error: 'Empresa no encontrada', data: [] }

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      customer_name,
      total_usd,
      status,
      delivery_type,
      payment_type,
      initial_payment,
      remaining_balance,
      paid_amount,
      pending_amount,
      created_at,
      order_items (
        product_name,
        quantity,
        price_usd
      )
    `)
    .eq('company_id', company.id)
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false })

  if (!orders) return { error: 'Error al obtener historial', data: [] }

  return { success: true, data: orders }
}

// ✅ NUEVA FUNCIÓN: Registrar abono
export async function registerPayment(formData: FormData) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const orderId = formData.get('orderId') as string
    const amount = parseFloat(formData.get('amount') as string)
    const paymentMethod = formData.get('paymentMethod') as string
    const paymentReference = formData.get('paymentReference') as string
    const paymentScreenshotUrl = formData.get('paymentScreenshotUrl') as string
    const notes = formData.get('notes') as string

    if (!orderId || !amount || amount <= 0) {
      return { error: 'Datos inválidos' }
    }

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
    const newPendingAmount = Math.max(0, order.total_usd - newPaidAmount)

    let newStatus = order.status
    if (newPendingAmount <= 0) {
      newStatus = 'installment_completed'
    } else if (order.status !== 'installment_active') {
      newStatus = 'installment_active'
    }

    const { error: paymentError } = await supabase
      .from('order_payments')
      .insert({
        order_id: orderId,
        amount: amount,
        payment_method: paymentMethod,
        payment_reference: paymentReference || null,
        payment_screenshot_url: paymentScreenshotUrl || null,
        notes: notes || null,
        created_by: user.id,
      })

    if (paymentError) {
      console.error('Error registrando pago:', paymentError)
      return { error: 'Error al registrar el pago' }
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        paid_amount: newPaidAmount,
        pending_amount: newPendingAmount,
        remaining_balance: newPendingAmount,
        status: newStatus,
        last_payment_date: new Date().toISOString(),
        installments_paid: (order.installments_paid || 0) + 1,
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Error actualizando pedido:', updateError)
      return { error: 'Error al actualizar el pedido' }
    }

    revalidatePath('/dashboard/customers')
    revalidatePath('/dashboard/orders')

    return { success: true, message: 'Abono registrado correctamente' }
  } catch (error: any) {
    console.error('Error en registerPayment:', error)
    return { error: 'Error inesperado: ' + error.message }
  }
}

export async function getOrderPayments(orderId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', data: [] }

  const { data: payments, error } = await supabase
    .from('order_payments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error obteniendo pagos:', error)
    return { error: 'Error al obtener pagos', data: [] }
  }

  return { success: true, data: payments || [] }
}

export async function getActiveInstallments() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', data: [] }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!company) return { error: 'Empresa no encontrada', data: [] }

  const { data: orders, error } = await supabase
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
    .eq('payment_type', 'installment')
    .gt('pending_amount', 0)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error obteniendo apartados:', error)
    return { error: 'Error al obtener apartados', data: [] }
  }

  return { success: true, data: orders || [] }
}