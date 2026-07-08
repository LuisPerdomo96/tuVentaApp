'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Verificar que el pedido pertenezca a la empresa del usuario
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

  // Actualizar estado
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

  // Aplicar filtros
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

  // Filtrar por búsqueda en cliente
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

  // Obtener TODOS los pedidos
  const { data: allOrders, error } = await supabase
    .from('orders')
    .select('status')
    .eq('company_id', company.id)

  if (error) {
    return { error: error.message, stats: {} }
  }

  // Contar por estado
  const stats = {
    total: allOrders?.length || 0,
    pending: allOrders?.filter(o => o.status === 'pending_payment').length || 0,
    review: allOrders?.filter(o => o.status === 'payment_review').length || 0,
    approved: allOrders?.filter(o => o.status === 'payment_approved').length || 0,
    in_preparation: allOrders?.filter(o => o.status === 'in_preparation').length || 0,
    ready: allOrders?.filter(o => o.status === 'ready').length || 0,
    delivered: allOrders?.filter(o => o.status === 'delivered').length || 0,
    cancelled: allOrders?.filter(o => o.status === 'cancelled').length || 0,
  }

  return { success: true, stats }
}