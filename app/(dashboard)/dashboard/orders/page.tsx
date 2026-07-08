'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrders, getOrderStats, updateOrderStatus } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Search, Eye, CheckCircle, XCircle, Clock, Package, Truck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [company, setCompany] = useState<any>(null)

  useEffect(() => {
    loadCompany()
  }, [])

  useEffect(() => {
    loadData()
  }, [filterStatus])

  async function loadCompany() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: companyData } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (companyData) {
      setCompany(companyData)
    }
  }

  // 🔔 SUSCRIPCIÓN EN TIEMPO REAL - Auto-actualiza la lista de pedidos
  useEffect(() => {
    if (!company) return

    const supabase = createClient()

    const channel = supabase
      .channel(`orders-list-${company.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          // Recargar pedidos cuando haya cambios (INSERT, UPDATE, DELETE)
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [company])

  async function loadData() {
    setLoading(true)
    
    const [ordersResult, statsResult] = await Promise.all([
      getOrders({ status: filterStatus, search: searchTerm }),
      getOrderStats()
    ])

    if (ordersResult.data) setOrders(ordersResult.data)
    if (statsResult.stats) setStats(statsResult.stats)
    setLoading(false)
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    const result = await updateOrderStatus(orderId, newStatus)
    if (result.error) {
      alert(result.error)
    } else {
      loadData()
    }
  }

  function getStatusBadge(status: string) {
    const statusConfig: any = {
      pending_payment: { label: 'Pendiente Pago', color: 'bg-gray-100 text-gray-800' },
      payment_review: { label: 'Pago en Revisión', color: 'bg-yellow-100 text-yellow-800' },
      payment_approved: { label: 'Pago Aprobado', color: 'bg-green-100 text-green-800' },
      payment_rejected: { label: 'Pago Rechazado', color: 'bg-red-100 text-red-800' },
      in_preparation: { label: 'En Preparación', color: 'bg-blue-100 text-blue-800' },
      ready: { label: 'Listo', color: 'bg-purple-100 text-purple-800' },
      delivered: { label: 'Entregado', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
    }

    const config = statusConfig[status] || statusConfig.pending_payment
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  function getDeliveryIcon(type: string) {
    if (type === 'delivery') return <Truck className="w-4 h-4" />
    if (type === 'pickup') return <Package className="w-4 h-4" />
    return <Clock className="w-4 h-4" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
        <p className="text-gray-600">Gestiona todos los pedidos de tu negocio</p>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">En Revisión</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.review || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">En Proceso</p>
            <p className="text-2xl font-bold text-blue-600">{stats.in_preparation || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Listos</p>
            <p className="text-2xl font-bold text-purple-600">{stats.ready || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Entregados</p>
            <p className="text-2xl font-bold text-green-600">{stats.delivered || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por cliente, teléfono o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Todos los estados</option>
              <option value="pending_payment">Pendiente de Pago</option>
              <option value="payment_review">Pago en Revisión</option>
              <option value="payment_approved">Pago Aprobado</option>
              <option value="in_preparation">En Preparación</option>
              <option value="ready">Listo</option>
              <option value="delivered">Entregado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pedidos */}
      {orders.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay pedidos
          </h3>
          <p className="text-gray-600">
            {filterStatus !== 'all' 
              ? "No hay pedidos con este filtro" 
              : "Aún no has recibido pedidos"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-gray-500">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <h3 className="font-semibold text-gray-900">{order.customer_name}</h3>
                    <p className="text-sm text-gray-600">{order.customer_phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-600">
                      ${order.total_usd.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('es-VE')}
                    </p>
                  </div>
                </div>

                {/* Resumen del Pedido */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    {getDeliveryIcon(order.delivery_type)}
                    <span className="capitalize">
                      {order.delivery_type === 'delivery' && 'Delivery'}
                      {order.delivery_type === 'pickup' && 'Retiro en local'}
                      {order.delivery_type === 'table' && `Mesa ${order.table_number}`}
                      {order.delivery_type === 'installment' && '💳 Apartado'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {order.order_items?.length || 0} producto(s)
                  </p>
                </div>

                {/* Acciones Rápidas */}
                <div className="flex gap-2 flex-wrap">
                  <Link href={`/dashboard/orders/${order.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalle
                    </Button>
                  </Link>

                  {order.status === 'payment_review' && (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        onClick={() => handleStatusChange(order.id, 'payment_approved')}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-red-600"
                        onClick={() => handleStatusChange(order.id, 'payment_rejected')}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Rechazar
                      </Button>
                    </>
                  )}

                  {order.status === 'payment_approved' && (
                    <Button
                      size="sm"
                      className="flex-1 bg-blue-500 hover:bg-blue-600"
                      onClick={() => handleStatusChange(order.id, 'in_preparation')}
                    >
                      Iniciar Preparación
                    </Button>
                  )}

                  {order.status === 'in_preparation' && (
                    <Button
                      size="sm"
                      className="flex-1 bg-purple-500 hover:bg-purple-600"
                      onClick={() => handleStatusChange(order.id, 'ready')}
                    >
                      Marcar Listo
                    </Button>
                  )}

                  {order.status === 'ready' && (
                    <Button
                      size="sm"
                      className="flex-1 bg-green-500 hover:bg-green-600"
                      onClick={() => handleStatusChange(order.id, 'delivered')}
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      Marcar Entregado
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}