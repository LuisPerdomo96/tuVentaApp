'use client'

import { useEffect, useState } from 'react'
import { getCustomerHistory } from '../actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Phone, 
  ShoppingBag, 
  DollarSign, 
  Loader2,
  Package,
  Calendar
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const phone = decodeURIComponent(params.phone as string)

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])
  const [customer, setCustomer] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [phone])

  async function loadData() {
    const result = await getCustomerHistory(phone)
    if (result.success && result.data && result.data.length > 0) {
      setOrders(result.data)
      
      const totalSpent = result.data.reduce((sum: number, o: any) => sum + o.total_usd, 0)
      setCustomer({
        name: result.data[0].customer_name,
        phone: phone,
        totalSpent,
        totalOrders: result.data.length,
      })
    }
    setLoading(false)
  }

  function getStatusBadge(status: string) {
    const config: any = {
      pending_payment: { label: 'Pendiente', color: 'bg-gray-100 text-gray-800' },
      payment_review: { label: 'En Revisión', color: 'bg-yellow-100 text-yellow-800' },
      payment_approved: { label: 'Aprobado', color: 'bg-green-100 text-green-800' },
      payment_rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-800' },
      in_preparation: { label: 'En Preparación', color: 'bg-blue-100 text-blue-800' },
      ready: { label: 'Listo', color: 'bg-purple-100 text-purple-800' },
      delivered: { label: 'Entregado', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
    }
    const c = config[status] || config.pending_payment
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.color}`}>{c.label}</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Cliente no encontrado</h1>
          <Button onClick={() => router.push('/dashboard/customers')}>Volver</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard/customers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <Phone className="w-3 h-3" />
              {customer.phone}
            </p>
          </div>
          <a 
            href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="bg-green-500 hover:bg-green-600">
              <Phone className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* Stats del Cliente */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Pedidos</p>
                  <p className="text-2xl font-bold">{customer.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Gastado</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${customer.totalSpent.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Ticket Promedio</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ${(customer.totalSpent / customer.totalOrders).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historial de Pedidos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Historial de Pedidos ({orders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-mono text-sm text-gray-500">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleString('es-VE')}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(order.status)}
                      <p className="text-lg font-bold text-orange-600 mt-1">
                        ${order.total_usd.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Productos */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-2 font-medium">Productos:</p>
                    <div className="space-y-1">
                      {order.order_items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.product_name}</span>
                          <span className="font-medium">
                            ${(item.quantity * item.price_usd).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tipo de entrega */}
                  <div className="mt-2 text-xs text-gray-500">
                    📦 {order.delivery_type === 'delivery' && 'Delivery'}
                    {order.delivery_type === 'pickup' && 'Retiro en local'}
                    {order.delivery_type === 'table' && `Mesa ${order.table_number}`}
                  </div>

                  {/* Ver detalle */}
                  <div className="mt-3">
                    <Link href={`/dashboard/orders/${order.id}`}>
                      <Button variant="outline" size="sm">
                        Ver detalle del pedido →
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}