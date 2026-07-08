'use server'

import { createClient } from '@/lib/supabase/server'

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

  const { data: orders } = await supabase
    .from('orders')
    .select('customer_name, customer_phone, total_usd, status, created_at, payment_type, remaining_balance')
    .eq('company_id', company.id)
    .in('status', ['payment_approved', 'in_preparation', 'ready', 'delivered', 'payment_review'])
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
    
    // Contar apartados activos
    if (order.payment_type === 'installment' && order.remaining_balance > 0) {
      customerMap[key].activeInstallments = (customerMap[key].activeInstallments || 0) + 1
      customerMap[key].totalPending = (customerMap[key].totalPending || 0) + order.remaining_balance
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