'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, MessageCircle, Loader2, Home, Package, Clock } from 'lucide-react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

export default function ConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const slug = params.slug as string
  const orderId = searchParams.get('orderId')
  const whatsappNumber = searchParams.get('whatsapp')

  const [order, setOrder] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    if (!orderId) {
      router.push(`/${slug}`)
      return
    }
    loadOrderDetails()
  }, [orderId])

  async function loadOrderDetails() {
    const supabase = createClient()

    // Cargar detalles del pedido
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
      .eq('id', orderId)
      .single()

    if (orderData) {
      setOrder(orderData)

      // Cargar datos de la empresa
      const { data: companyData } = await supabase
        .from('companies')
        .select('name, exchange_rate, whatsapp_number, slug')
        .eq('id', orderData.company_id)
        .single()
      
      if (companyData) setCompany(companyData)
    }
    setLoading(false)
  }

  function generateWhatsAppMessage() {
  if (!order || !company) return ''

  const deliveryTypeText = 
    order.delivery_type === 'delivery' ? '🏠 *Delivery*' :
    order.delivery_type === 'pickup' ? '🏪 *Retiro en local*' : `🍽️ *Mesa ${order.table_number || 'N/A'}*`

  const totalBs = (order.total_usd * parseFloat(company.exchange_rate || 1)).toFixed(2)

  const itemsText = order.order_items
    .map((item: any) => `• ${item.quantity}x ${item.product_name} - $${(item.quantity * item.price_usd).toFixed(2)}${item.notes ? ` (${item.notes})` : ''}`)
    .join('\n')

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const trackingUrl = `${origin}/${company.slug}/track/${order.id}`

  const message = ` *NUEVO PEDIDO - ${company.name.toUpperCase()}*

👤 *Cliente:* ${order.customer_name}
📱 *Teléfono:* ${order.customer_phone}
📍 *Entrega:* ${deliveryTypeText}${order.customer_address ? `\n🗺️ *Dirección:* ${order.customer_address}` : ''}

📦 *PRODUCTOS:*
${itemsText}

💰 *TOTAL:*
🇺🇸 USD: *$${order.total_usd.toFixed(2)}*
🇪 Bs: *Bs. ${totalBs}*

💳 *PAGO:* ${order.payment_reference ? '✅ Enviado' : '⏳ Pendiente'}
🔢 *Referencia:* ${order.payment_reference || 'N/A'}
${order.payment_screenshot_url ? `📎 *Captura:* ${order.payment_screenshot_url}` : ''}

 *Notas:* ${order.notes || 'Sin notas'}

🔗 *Rastrear pedido:* ${trackingUrl}

¡Quedo atento a la confirmación! 🙏`

  return encodeURIComponent(message)
}

  function getWhatsAppLink() {
    if (!whatsappNumber) return '#'
    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '')
    return `https://wa.me/${cleanNumber}?text=${generateWhatsAppMessage()}`
  }

  async function copyOrderDetails() {
    const message = generateWhatsAppMessage()
    const decodedMessage = decodeURIComponent(message)
    
    try {
      await navigator.clipboard.writeText(decodedMessage)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Error al copiar:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Cargando detalles del pedido...</p>
        </div>
      </div>
    )
  }

  if (!order) {
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Éxito */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Pedido Recibido! 🎉</h1>
          <p className="text-gray-600">
            Tu pedido <span className="font-mono font-bold text-orange-600">#{order.id.slice(0, 8).toUpperCase()}</span> ha sido registrado
          </p>
        </div>

        {/* Estado del Pedido */}
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="font-semibold text-gray-900">Estado: Pago en Revisión</p>
                <p className="text-sm text-gray-600">Estamos verificando tu pago. Te contactaremos pronto.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instrucciones */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">📱 Próximo Paso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 leading-relaxed">
              Para que tu pedido sea procesado más rápido, <strong>envía el comprobante por WhatsApp</strong> haciendo clic en el botón verde de abajo. 👇
            </p>
          </CardContent>
        </Card>

        {/* Botón WhatsApp - EL MÁS IMPORTANTE */}
        {whatsappNumber && (
          <div className="space-y-3">
            <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer">
              <Button className="w-full h-14 text-base bg-green-500 hover:bg-green-600 text-white gap-3 text-lg font-semibold shadow-lg">
                <MessageCircle className="w-6 h-6" />
                Enviar Pedido por WhatsApp
              </Button>
            </a>
            
            <Button 
              variant="outline" 
              onClick={copyOrderDetails}
              className="w-full"
            >
              {copySuccess ? '✓ Copiado' : '📋 Copiar Detalles del Pedido'}
            </Button>
          </div>
        )}

        {/* Resumen del Pedido */}
        <Card>
          <CardHeader className="pb-3 bg-gray-50">
            <CardTitle className="text-sm text-gray-600">📋 Resumen del Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Productos */}
            <div className="space-y-2">
              {order.order_items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-start py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.quantity}x {item.product_name}</p>
                    {item.notes && <p className="text-xs text-gray-500 italic">{item.notes}</p>}
                  </div>
                  <p className="font-semibold text-sm">${(item.quantity * item.price_usd).toFixed(2)}</p>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="border-t-2 border-orange-500 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal USD</span>
                <span className="font-medium">${order.total_usd.toFixed(2)}</span>
              </div>
              {company && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Equivalente en Bs (tasa {company.exchange_rate})</span>
                  <span className="font-semibold">Bs. {(order.total_usd * parseFloat(company.exchange_rate)).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-bold text-gray-900">TOTAL</span>
                <span className="text-2xl font-bold text-orange-600">${order.total_usd.toFixed(2)}</span>
              </div>
            </div>

            {/* Info de Pago */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Método:</span>
                <span className="font-medium capitalize">{order.payment_reference ? 'Transferencia' : 'Efectivo'}</span>
              </div>
              {order.payment_reference && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Referencia:</span>
                  <span className="font-mono font-medium">{order.payment_reference}</span>
                </div>
              )}
            </div>

            {/* Info de Entrega */}
            <div className="bg-orange-50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Entrega:</span>
                <span className="font-medium capitalize">
                  {order.delivery_type === 'delivery' && '🏠 Delivery'}
                  {order.delivery_type === 'pickup' && '🏪 Retiro'}
                  {order.delivery_type === 'table' && `🍽️ Mesa ${order.table_number}`}
                </span>
              </div>
              {order.customer_address && (
                <div>
                  <span className="text-gray-600 block mb-1">Dirección:</span>
                  <span className="font-medium">{order.customer_address}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Datos del Cliente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">👤 Tus Datos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Nombre:</span>
              <span className="font-medium">{order.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Teléfono:</span>
              <span className="font-medium">{order.customer_phone}</span>
            </div>
            {order.notes && (
              <div>
                <span className="text-gray-600 block mb-1">Notas:</span>
                <span className="italic">{order.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botón Volver */}
        <Button 
          variant="outline" 
          className="w-full gap-2"
          onClick={() => router.push(`/${slug}`)}
        >
          <Home className="w-4 h-4" />
          Volver al Catálogo
        </Button>

        {/* Footer */}
        <p className="text-xs text-center text-gray-500 pb-4">
          ¿Tienes dudas? Escríbenos por WhatsApp<br />
          Te responderemos lo antes posible
        </p>
      </div>
    </div>
  )
}