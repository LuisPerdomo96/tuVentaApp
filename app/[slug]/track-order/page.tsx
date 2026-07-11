'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Package, 
  Clock, 
  Truck, 
  CheckCircle, 
  Search,
  ShoppingBag,
  Calendar,
  User,
  Phone,
  DollarSign,
  Home,
  MessageCircle,
  Copy,
  Loader2
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Order {
  id: string
  order_number: string
  status: string
  created_at: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_address?: string
  delivery_type: string
  table_number?: string
  total_usd: number
  payment_reference?: string
  payment_type?: string
  items: any[]
}

export default function TrackOrderPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [orderId, setOrderId] = useState('')
  const [order, setOrder] = useState<Order | null>(null)
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const statusSteps = [
    { id: 'pending_payment', label: 'Recibido', icon: Clock, color: 'bg-yellow-500' },
    { id: 'payment_approved', label: 'Aprobado', icon: CheckCircle, color: 'bg-blue-500' },
    { id: 'in_preparation', label: 'En Proceso', icon: Package, color: 'bg-purple-500' },
    { id: 'ready', label: 'Listo', icon: CheckCircle, color: 'bg-green-500' },
    { id: 'delivered', label: 'Entregado', icon: Truck, color: 'bg-green-600' },
  ]

  useEffect(() => {
  loadCompany()
  
  // Si viene un ID en la URL, buscar automáticamente
  const urlParams = new URLSearchParams(window.location.search)
  const id = urlParams.get('id')
  
  if (id) {
    const cleanId = id.replace('#', '').replace(/-/g, '').trim()
    setOrderId(cleanId)
    
    // Esperar un poco para que el estado se actualice
    setTimeout(() => {
      searchOrder(cleanId)
    }, 100)
  }
}, [slug])
  async function loadCompany() {
    const supabase = createClient()
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('slug', slug)
      .single()
    
    if (data) setCompany(data)
  }

  async function searchOrder(id?: string) {
  const searchId = id || orderId
  
  if (!searchId.trim()) {
    alert('Ingresa un número de pedido')
    return
  }
  
  setLoading(true)
  setSearched(true)
  const supabase = createClient()

  // Limpiar el ID
  const cleanId = searchId
    .replace('#', '')
    .replace(/-/g, '')
    .replace(/\s/g, '')
    .trim()
    .toUpperCase()

  console.log(' Buscando pedido con ID limpio:', cleanId)

  // Traer los últimos 100 pedidos y filtrar del lado del cliente
  const { data: allOrders, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        product_name,
        quantity,
        price_usd,
        notes
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('❌ Error al traer pedidos:', error)
    setOrder(null)
    setLoading(false)
    return
  }

  // Filtrar del lado del cliente
  const foundOrder = allOrders?.find(order => {
    const orderIdClean = order.id
      .replace(/-/g, '')
      .toUpperCase()
    
    // Buscar si el ID limpio contiene los caracteres buscados
    return orderIdClean.includes(cleanId) || 
           order.id.toUpperCase().includes(cleanId)
  })

  console.log('📦 Pedido encontrado:', foundOrder)

  if (foundOrder) {
    setOrder({
      ...foundOrder,
      items: foundOrder.order_items || []
    })
  } else {
    setOrder(null)
  }

  setLoading(false)
}

  function getStatusColor(status: string) {
    const colors: any = {
      pending_payment: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      payment_approved: 'bg-blue-100 text-blue-800 border-blue-300',
      in_preparation: 'bg-purple-100 text-purple-800 border-purple-300',
      ready: 'bg-green-100 text-green-800 border-green-300',
      delivered: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  function getStatusLabel(status: string) {
    const labels: any = {
      pending_payment: 'Pendiente de Pago',
      payment_approved: 'Pago Aprobado',
      in_preparation: 'En Preparación',
      ready: 'Listo para Entregar',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    }
    return labels[status] || status
  }

  function generateWhatsAppMessage() {
    if (!order || !company) return ''
    
    const message = `Hola ${company.name}, quiero consultar sobre mi pedido #${order.id.slice(0, 8).toUpperCase()}. ¿Me pueden dar información?`
    return encodeURIComponent(message)
  }

  function getWhatsAppLink() {
    const whatsappNumber = company?.whatsapp_number
    if (!whatsappNumber) return '#'
    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '')
    return `https://wa.me/${cleanNumber}?text=${generateWhatsAppMessage()}`
  }

  async function copyOrderInfo() {
    if (!order) return
    
    const text = `Pedido #${order.id.slice(0, 8).toUpperCase()}
Estado: ${getStatusLabel(order.status)}
Fecha: ${new Date(order.created_at).toLocaleDateString('es-VE')}
Total: $${order.total_usd.toFixed(2)}
Cliente: ${order.customer_name}
Teléfono: ${order.customer_phone}`

    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Error al copiar:', err)
    }
  }

  const currentStatusIndex = statusSteps.findIndex(s => s.id === order?.status)
  const primaryColor = company?.primary_color || '#F97316'
  const bgColor = company?.background_color || '#FDF8F5'

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: bgColor }}>
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/${slug}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver al catálogo
            </Button>
          </Link>
        </div>

        {/* Buscador */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
            <CardTitle className="text-xl flex items-center gap-2">
              <Search className="w-6 h-6" style={{ color: primaryColor }} />
              Seguimiento de Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-600 mb-4">Ingresa el número de tu pedido para ver su estado</p>
            
            <div className="flex gap-2">
              <Input
                      placeholder="Ej: 0C538E4F (los primeros 8 caracteres)"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchOrder()}
                  className="flex-1"
                />
              <Button 
                onClick={() => searchOrder()} 
                disabled={loading}
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        {order && (
          <div className="space-y-6">
            {/* Estado Actual */}
            <Card className="border-2 shadow-lg" style={{ borderColor: `${primaryColor}30` }}>
              <CardHeader className={`border-b ${getStatusColor(order.status).split(' ')[0]}`}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-6 h-6" style={{ color: primaryColor }} />
                    Pedido #{order.id.slice(0, 8).toUpperCase()}
                  </CardTitle>
                  <Badge className={`text-sm px-3 py-1 ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Timeline */}
                <div className="relative mb-8">
                  <div className="flex items-center justify-between">
                    {statusSteps.map((step, idx) => {
                      const StepIcon = step.icon
                      const isCompleted = idx <= currentStatusIndex
                      const isCurrent = idx === currentStatusIndex

                      return (
                        <div key={step.id} className="flex flex-col items-center flex-1 relative z-10">
                          <div 
                            className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 transition-all ${
                              isCompleted 
                                ? 'text-white shadow-lg scale-110' 
                                : 'bg-gray-200 text-gray-400'
                            } ${isCurrent ? 'ring-4 ring-offset-2' : ''}`}
                            style={isCompleted ? { backgroundColor: primaryColor } : {}}
                          >
                            <StepIcon className="w-7 h-7" />
                          </div>
                          <p className={`text-xs font-medium text-center ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                          {idx < statusSteps.length - 1 && (
                            <div 
                              className="absolute top-7 left-1/2 w-full h-1 -ml-7"
                              style={{ 
                                backgroundColor: idx < currentStatusIndex ? primaryColor : '#E5E7EB',
                                width: 'calc(100% - 3.5rem)',
                                marginLeft: '1.75rem'
                              }}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Fecha y Hora */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-4">
                  <Calendar className="w-5 h-5" style={{ color: primaryColor }} />
                  <div>
                    <p className="text-sm text-gray-600">Fecha del pedido</p>
                    <p className="font-semibold">
                      {new Date(order.created_at).toLocaleDateString('es-VE', { 
                        day: '2-digit', 
                        month: 'long', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="grid grid-cols-2 gap-3">
                  <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full gap-2" style={{ backgroundColor: '#25D366' }}>
                      <MessageCircle className="w-4 h-4" />
                      Consultar por WhatsApp
                    </Button>
                  </a>
                  <Button variant="outline" onClick={copyOrderInfo} className="gap-2">
                    {copySuccess ? <><CheckCircle className="w-4 h-4 text-green-600" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar Info</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Productos */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-white border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" style={{ color: primaryColor }} />
                  Productos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold">{item.quantity}x {item.product_name}</p>
                        {item.notes && <p className="text-xs text-gray-500 italic">{item.notes}</p>}
                      </div>
                      <p className="font-bold" style={{ color: primaryColor }}>
                        ${(item.price_usd * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t-2 flex items-center justify-between" style={{ borderColor: primaryColor }}>
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                    ${order.total_usd.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Información del Cliente */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-white border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-5 h-5 text-green-600" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Nombre</p>
                    <p className="font-semibold">{order.customer_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Teléfono</p>
                    <p className="font-semibold">{order.customer_phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tipo de Entrega */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="w-5 h-5 text-purple-600" />
                  Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {order.delivery_type === 'delivery' && <Home className="w-6 h-6 text-blue-500" />}
                  {order.delivery_type === 'pickup' && <ShoppingBag className="w-6 h-6 text-green-500" />}
                  {order.delivery_type === 'table' && <span className="text-2xl">🍽️</span>}
                  {order.delivery_type === 'installment' && <span className="text-2xl"></span>}
                  <div>
                    <p className="text-sm text-gray-600">Tipo</p>
                    <p className="font-semibold capitalize">
                      {order.delivery_type === 'delivery' && '🏠 Delivery a Domicilio'}
                      {order.delivery_type === 'pickup' && '🏪 Retiro en Local'}
                      {order.delivery_type === 'table' && `️ Mesa ${order.table_number}`}
                      {order.delivery_type === 'installment' && '💳 Apartado'}
                    </p>
                  </div>
                </div>
                {order.customer_address && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Dirección:</p>
                    <p className="font-medium">{order.customer_address}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Información de Pago */}
            {order.payment_reference && (
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-yellow-50 to-white border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-yellow-600" />
                    Pago
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Referencia:</span>
                    <span className="font-mono font-bold">{order.payment_reference}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Sin resultados */}
        {searched && !order && !loading && (
          <Card className="shadow-lg border-0">
            <CardContent className="p-12 text-center">
              <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Pedido no encontrado</h3>
              <p className="text-gray-600 mb-4">No se encontró ningún pedido con ese número</p>
              <p className="text-sm text-gray-500">
                Verifica que el número sea correcto o contacta al negocio
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}