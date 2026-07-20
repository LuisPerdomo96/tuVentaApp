'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  MessageCircle, 
  Loader2, 
  Home, 
  Package, 
  Clock,
  Copy,
  Share2,
  Truck,
  CreditCard,
  User,
  Phone,
  MapPin,
  Calendar,
  ArrowRight,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  
  const slug = params.slug as string
  const [orderId, setOrderId] = useState<string | null>(null)
  const [order, setOrder] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const id = urlParams.get('orderId')
    if (!id) {
      router.push(`/${slug}`)
      return
    }
    setOrderId(id)
    loadOrderDetails(id)
  }, [slug])

  async function loadOrderDetails(id: string) {
    const supabase = createClient()

    const { data: orderData } = await supabase
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
      .eq('id', id)
      .single()

    if (orderData) {
      setOrder(orderData)

      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', orderData.company_id)
        .single()
      
      if (companyData) setCompany(companyData)
    }
    setLoading(false)
  }

  function generateWhatsAppMessage() {
    if (!order || !company) return ''

    const deliveryTypeText = 
      order.delivery_type === 'delivery' ? '🏠 Delivery' :
      order.delivery_type === 'pickup' ? '🏪 Retiro' : 
      order.delivery_type === 'table' ? `🍽️ Mesa ${order.table_number}` :
      '💳 Apartado'

    const totalBs = (order.total_usd * parseFloat(company.exchange_rate || 1)).toFixed(2)

    const itemsText = order.order_items
      .map((item: any) => `• ${item.quantity}x ${item.product_name} - $${(item.quantity * item.price_usd).toFixed(2)}`)
      .join('\n')

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const trackingUrl = `${origin}/${company.slug}/track-order?id=${order.id}`

    const message = `*🆕 NUEVO PEDIDO - ${company.name}*

*Pedido #${order.id.slice(0, 8).toUpperCase()}*

👤 *Cliente:* ${order.customer_name}
📱 *Teléfono:* ${order.customer_phone}
📍 *Entrega:* ${deliveryTypeText}${order.customer_address ? `\n🗺️ *Dirección:* ${order.customer_address}` : ''}

📦 *PRODUCTOS:*
${itemsText}

💰 *TOTAL:*
🇺🇸 USD: *$${order.total_usd.toFixed(2)}*
🇻🇪 Bs: *Bs. ${totalBs}*

💳 *PAGO:* ${order.payment_reference ? '✅ Enviado' : '⏳ Pendiente'}
🔢 *Referencia:* ${order.payment_reference || 'N/A'}

📋 *Notas:* ${order.notes || 'Sin notas'}

🔗 *Rastrear:* ${trackingUrl}

¡Gracias por tu compra! 🙏`

    return encodeURIComponent(message)
  }

  function getWhatsAppLink() {
    const whatsappNumber = company?.whatsapp_number
    if (!whatsappNumber) return '#'
    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '')
    return `https://wa.me/${cleanNumber}?text=${generateWhatsAppMessage()}`
  }

  async function copyOrderDetails() {
    const message = decodeURIComponent(generateWhatsAppMessage())
    
    try {
      await navigator.clipboard.writeText(message)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      // Fallback para móviles
      const textArea = document.createElement('textarea')
      textArea.value = message
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      } catch (e) {
        alert('❌ No se pudo copiar. Intenta manualmente.')
      }
      document.body.removeChild(textArea)
    }
  }

  function getStatusColor(status: string) {
    const colors: any = {
      pending_payment: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      payment_review: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      payment_approved: 'bg-blue-100 text-blue-800 border-blue-300',
      in_preparation: 'bg-purple-100 text-purple-800 border-purple-300',
      ready: 'bg-green-100 text-green-800 border-green-300',
      delivered: 'bg-green-100 text-green-800 border-green-300',
      installment_active: 'bg-orange-100 text-orange-800 border-orange-300',
      installment_completed: 'bg-green-100 text-green-800 border-green-300',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  function getStatusLabel(status: string) {
    const labels: any = {
      pending_payment: 'Pago Pendiente',
      payment_review: 'Pago en Revisión',
      payment_approved: 'Pago Aprobado',
      in_preparation: 'En Preparación',
      ready: 'Listo para Entregar',
      delivered: 'Entregado',
      installment_active: 'Apartado Activo',
      installment_completed: 'Apartado Completado',
    }
    return labels[status] || status
  }

  const statusSteps = [
    { id: 'pending_payment', label: 'Recibido', icon: Clock },
    { id: 'payment_approved', label: 'Aprobado', icon: CheckCircle },
    { id: 'in_preparation', label: 'En Proceso', icon: Package },
    { id: 'ready', label: 'Listo', icon: CheckCircle },
    { id: 'delivered', label: 'Entregado', icon: Truck },
  ]

  const currentStatusIndex = statusSteps.findIndex(s => s.id === order?.status)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Cargando detalles...</p>
        </div>
      </div>
    )
  }

  if (!order || !company) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedido no encontrado</h1>
          <p className="text-gray-600 mb-6">No pudimos encontrar el pedido que buscas.</p>
          <Button onClick={() => router.push(`/${slug}`)} className="bg-orange-500 hover:bg-orange-600">
            Volver al Catálogo
          </Button>
        </div>
      </div>
    )
  }

  const primaryColor = company.primary_color || '#F97316'
  const bgColor = company.background_color || '#FDF8F5'

  return (
    <div className="min-h-screen py-4 sm:py-8 px-3 sm:px-4" style={{ backgroundColor: bgColor }}>
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        
        {/* ✅ Éxito - Header Principal Responsive */}
        <div className="text-center py-6 sm:py-8">
          <div 
            className="mx-auto w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-xl animate-bounce"
            style={{ backgroundColor: primaryColor }}
          >
            <CheckCircle className="w-9 h-9 sm:w-14 sm:h-14 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            ¡Pedido Confirmado! 🎉
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Tu pedido{' '}
            <span 
              className="font-mono font-bold px-2 py-1 rounded text-xs sm:text-base" 
              style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
            >
              #{order.id.slice(0, 8).toUpperCase()}
            </span>{' '}
            ha sido registrado
          </p>
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full" style={{ backgroundColor: `${primaryColor}10` }}>
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: primaryColor }} />
            <span className="text-xs sm:text-sm font-medium" style={{ color: primaryColor }}>
              {new Date(order.created_at).toLocaleDateString('es-VE', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        {/* ✅ Estado del Pedido - Timeline Compacto para Móvil */}
        <Card className="border-2 shadow-lg" style={{ borderColor: `${primaryColor}30` }}>
          <CardHeader className={`border-b p-3 sm:p-6 ${getStatusColor(order.status).split(' ')[0]}`}>
            <CardTitle className="text-sm sm:text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: primaryColor }} />
                Estado del Pedido
              </span>
              <Badge className={`${getStatusColor(order.status)} text-[10px] sm:text-xs`}>
                {getStatusLabel(order.status)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="relative">
              <div className="flex items-center justify-between">
                {statusSteps.map((step, idx) => {
                  const StepIcon = step.icon
                  const isCompleted = idx <= currentStatusIndex
                  const isCurrent = idx === currentStatusIndex

                  return (
                    <div key={step.id} className="flex flex-col items-center flex-1 relative z-10">
                      <div 
                        className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1 sm:mb-2 transition-all ${
                          isCompleted 
                            ? 'text-white shadow-lg' 
                            : 'bg-gray-200 text-gray-400'
                        } ${isCurrent ? 'ring-2 sm:ring-4 ring-offset-1 sm:ring-offset-2' : ''}`}
                        style={isCompleted ? { backgroundColor: primaryColor } : {}}
                      >
                        <StepIcon className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <p className={`text-[9px] sm:text-xs font-medium text-center ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {idx < statusSteps.length - 1 && (
                        <div 
                          className="absolute top-4 sm:top-6 left-1/2 h-0.5 sm:h-1"
                          style={{ 
                            backgroundColor: idx < currentStatusIndex ? primaryColor : '#E5E7EB',
                            width: 'calc(100% - 2rem)',
                            marginLeft: '1rem'
                          }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ Botones de Acción - WhatsApp Responsive */}
        <div className="space-y-3">
          <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="block">
            <Button 
              className="w-full h-12 sm:h-14 text-sm sm:text-lg gap-2 sm:gap-3 font-semibold shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: '#25D366' }}
            >
              <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              Enviar Pedido por WhatsApp
            </Button>
          </a>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={copyOrderDetails}
              className="gap-1 sm:gap-2 text-xs sm:text-sm h-10 sm:h-12"
            >
              {copySuccess ? (
                <><CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" /> Copiado</>
              ) : (
                <><Copy className="w-3 h-3 sm:w-4 sm:h-4" /> Copiar</>
              )}
            </Button>
            
            <Link href={`/${slug}/track-order?id=${order.id}`}>
              <Button variant="outline" className="w-full gap-1 sm:gap-2 text-xs sm:text-sm h-10 sm:h-12">
                <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
                Rastrear
              </Button>
            </Link>
          </div>
        </div>

        {/* Resumen del Pedido */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-white border-b p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: primaryColor }} />
              Resumen del Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-4">
            {/* Productos */}
            <div className="space-y-2 sm:space-y-3">
              {order.order_items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-start py-2 sm:py-3 border-b last:border-0">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">
                      {item.quantity}x {item.product_name}
                    </p>
                    {item.notes && <p className="text-[10px] sm:text-xs text-gray-500 italic mt-1">{item.notes}</p>}
                  </div>
                  <p className="font-bold text-sm sm:text-lg flex-shrink-0" style={{ color: primaryColor }}>
                    ${(item.quantity * item.price_usd).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="border-t-2 pt-3 sm:pt-4 space-y-2" style={{ borderColor: primaryColor }}>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Subtotal USD</span>
                <span className="font-medium">${order.total_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm text-gray-600 bg-gray-50 p-2 sm:p-3 rounded-lg">
                <span>Equivalente en Bs (tasa {company.exchange_rate})</span>
                <span className="font-bold">Bs. {(order.total_usd * parseFloat(company.exchange_rate || 1)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 sm:pt-3">
                <span className="text-base sm:text-xl font-bold text-gray-900">TOTAL</span>
                <span className="text-xl sm:text-3xl font-bold" style={{ color: primaryColor }}>
                  ${order.total_usd.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información de Pago */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              Información de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600 text-xs sm:text-sm">Método:</span>
              <span className="font-medium capitalize text-xs sm:text-sm">
                {order.payment_reference ? 'Transferencia' : 'Efectivo'}
              </span>
            </div>
            {order.payment_reference && (
              <>
                <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600 text-xs sm:text-sm">Referencia:</span>
                  <span className="font-mono font-bold text-xs sm:text-sm break-all">{order.payment_reference}</span>
                </div>
                {order.payment_screenshot_url && (
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-600 mb-2">Captura de pago:</p>
                    <img 
                      src={order.payment_screenshot_url} 
                      alt="Comprobante" 
                      className="w-full h-32 sm:h-40 object-cover rounded-lg" 
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Información de Entrega */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              Información de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600 text-xs sm:text-sm">Tipo:</span>
              <span className="font-medium flex items-center gap-2 text-xs sm:text-sm">
                {order.delivery_type === 'delivery' && <><Home className="w-3 h-3 sm:w-4 sm:h-4" /> Delivery</>}
                {order.delivery_type === 'pickup' && <>🏪 Retiro</>}
                {order.delivery_type === 'table' && <><span className="text-sm sm:text-lg">🍽️</span> Mesa {order.table_number}</>}
                {order.delivery_type === 'installment' && <><span className="text-sm sm:text-lg">💳</span> Apartado</>}
              </span>
            </div>
            {order.customer_address && (
              <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-gray-600 block mb-1 text-xs sm:text-sm">Dirección:</span>
                    <span className="font-medium text-xs sm:text-sm break-words">{order.customer_address}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Datos del Cliente */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-green-50 to-white border-b p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              Tus Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 space-y-2 sm:space-y-3">
            <div className="flex items-center gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-gray-600">Nombre</p>
                <p className="font-semibold text-sm sm:text-base truncate">{order.customer_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-gray-600">Teléfono</p>
                <p className="font-semibold text-sm sm:text-base">{order.customer_phone}</p>
              </div>
            </div>
            {order.notes && (
              <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                <p className="text-[10px] sm:text-sm text-gray-600 mb-1">Notas:</p>
                <p className="italic text-gray-700 text-xs sm:text-sm">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botón Volver */}
        <Button 
          variant="outline" 
          className="w-full gap-2 h-11 sm:h-12 text-sm sm:text-base"
          onClick={() => router.push(`/${slug}`)}
        >
          <Home className="w-4 h-4 sm:w-5 sm:h-5" />
          Volver al Catálogo
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>

        {/* Footer */}
        <div className="text-center pb-4">
          <p className="text-xs sm:text-sm text-gray-500">
            ¿Tienes dudas? Escríbenos por WhatsApp<br />
            <span className="font-medium" style={{ color: primaryColor }}>
              Te responderemos lo antes posible
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}