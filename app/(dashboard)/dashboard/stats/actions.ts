'use server'

import { createClient } from '@/lib/supabase/server'

export async function getSalesStats(period: '7days' | '30days' | '3months' = '7days') {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!company) return { error: 'Empresa no encontrada' }

  // Calcular fecha de inicio según el período
  const now = new Date()
  let startDate = new Date()
  
  if (period === '7days') {
    startDate.setDate(now.getDate() - 7)
  } else if (period === '30days') {
    startDate.setDate(now.getDate() - 30)
  } else if (period === '3months') {
    startDate.setMonth(now.getMonth() - 3)
  }

  // ✅ CORRECCIÓN: Incluir TODOS los estados relevantes (no solo los pagados)
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total_usd, status, created_at')
    .eq('company_id', company.id)
    .in('status', [
      'payment_approved', 
      'in_preparation', 
      'ready', 
      'delivered',
      'installment_active',
      'installment_completed'
    ])
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  console.log('📊 Pedidos encontrados:', orders?.length || 0)

  if (!orders) return { error: 'Error al obtener datos', stats: null }

  // Calcular estadísticas
  const totalRevenue = orders.reduce((sum, order) => sum + order.total_usd, 0)
  const totalOrders = orders.length
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Agrupar por día
  const salesByDay: any = {}
  orders.forEach(order => {
    const date = new Date(order.created_at).toLocaleDateString('es-VE', { 
      month: 'short', 
      day: 'numeric' 
    })
    salesByDay[date] = (salesByDay[date] || 0) + order.total_usd
  })

  // ✅ CORRECCIÓN: Obtener IDs de los pedidos
  const orderIds = orders.map(o => o.id)
  
  console.log('🔍 Buscando order_items para pedidos:', orderIds)

  // ✅ CORRECCIÓN: Obtener order_items con los IDs correctos
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('product_name, quantity, price_usd, order_id')
    .in('order_id', orderIds)

  if (itemsError) {
    console.error('❌ Error obteniendo order_items:', itemsError)
  }

  console.log('📦 Order items encontrados:', orderItems?.length || 0)

  // ✅ CORRECCIÓN: Calcular productos más vendidos
  const productSales: any = {}
  orderItems?.forEach(item => {
    if (!productSales[item.product_name]) {
      productSales[item.product_name] = {
        name: item.product_name,
        quantity: 0,
        revenue: 0
      }
    }
    productSales[item.product_name].quantity += item.quantity
    productSales[item.product_name].revenue += item.quantity * item.price_usd
  })

  const topProducts = Object.values(productSales)
    .sort((a: any, b: any) => b.quantity - a.quantity)
    .slice(0, 10)

  console.log('🏆 Top productos:', topProducts)

  // Pedidos por estado (TODOS los pedidos, no solo los pagados)
  const { data: allOrders } = await supabase
    .from('orders')
    .select('status, total_usd')
    .eq('company_id', company.id)
    .gte('created_at', startDate.toISOString())

  const ordersByStatus = {
    pending: allOrders?.filter(o => o.status === 'pending_payment').length || 0,
    review: allOrders?.filter(o => o.status === 'payment_review').length || 0,
    approved: allOrders?.filter(o => o.status === 'payment_approved').length || 0,
    in_preparation: allOrders?.filter(o => o.status === 'in_preparation').length || 0,
    ready: allOrders?.filter(o => o.status === 'ready').length || 0,
    delivered: allOrders?.filter(o => o.status === 'delivered').length || 0,
    installment_active: allOrders?.filter(o => o.status === 'installment_active').length || 0,
    installment_completed: allOrders?.filter(o => o.status === 'installment_completed').length || 0,
  }

  return {
    success: true,
    stats: {
      totalRevenue,
      totalOrders,
      averageTicket,
      salesByDay,
      topProducts,
      ordersByStatus,
      period,
    }
  }
}

export async function exportToCSV(period: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!company) return { error: 'Empresa no encontrada' }

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      customer_name,
      customer_phone,
      total_usd,
      status,
      created_at,
      order_items (
        product_name,
        quantity,
        price_usd
      )
    `)
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  if (!orders) return { error: 'Error al obtener datos' }

  // Convertir a CSV
  const headers = ['Fecha', 'Pedido ID', 'Cliente', 'Teléfono', 'Productos', 'Total USD', 'Estado']
  const rows = orders.map(order => [
    new Date(order.created_at).toLocaleDateString('es-VE'),
    order.id.slice(0, 8).toUpperCase(),
    order.customer_name,
    order.customer_phone,
    order.order_items.map((item: any) => `${item.quantity}x ${item.product_name}`).join(', '),
    order.total_usd.toFixed(2),
    order.status
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return { success: true, csv: csvContent }
}