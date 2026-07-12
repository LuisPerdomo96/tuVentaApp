'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Loader2,
  CreditCard,
  X,
  AlertCircle,
  Upload,
  Building2,
  Smartphone
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerClientPayment, uploadOrderScreenshot } from '../actions'

interface Order {
  id: string
  status: string
  created_at: string
  customer_name: string
  customer_phone: string
  customer_address?: string
  delivery_type: string
  table_number?: string
  total_usd: number
  payment_type?: string
  initial_payment?: number
  paid_amount?: number
  pending_amount?: number
  remaining_balance?: number
  payment_reference?: string
  items: any[]
}

// ✅ Labels para los métodos de pago
const methodLabels: any = {
  pago_movil: 'Pago Móvil',
  binance: 'Binance Pay',
  zelle: 'Zelle',
  paypal: 'PayPal',
  cash: 'Efectivo',
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  otro: 'Otro'
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
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [selectedMethod, setSelectedMethod] = useState<any>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [uploadingCapture, setUploadingCapture] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: '',
    paymentReference: '',
    paymentScreenshotUrl: '',
    notes: '',
  })
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])

  const statusSteps = [
    { id: 'pending_payment', label: 'Recibido', icon: Clock },
    { id: 'payment_review', label: 'Revisión', icon: Clock },
    { id: 'payment_approved', label: 'Aprobado', icon: CheckCircle },
    { id: 'in_preparation', label: 'En Proceso', icon: Package },
    { id: 'ready', label: 'Listo', icon: CheckCircle },
    { id: 'delivered', label: 'Entregado', icon: Truck },
  ]

  useEffect(() => {
    loadCompany()
    loadPaymentMethods()
    const urlParams = new URLSearchParams(window.location.search)
    const id = urlParams.get('id')
    if (id) {
      const cleanId = id.replace('#', '').replace(/-/g, '').trim()
      setOrderId(cleanId)
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

  async function loadPaymentMethods() {
    try {
      const supabase = createClient()
      
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('slug', slug)
        .single()

      if (companyError || !companyData) {
        console.error('Error buscando empresa:', companyError)
        return
      }

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('company_id', companyData.id)
        .eq('is_active', true)

      if (error) {
        console.error('Error cargando métodos de pago:', error)
        return
      }

      if (data && data.length > 0) {
        setPaymentMethods(data)
      }
    } catch (err) {
      console.error('Error en loadPaymentMethods:', err)
    }
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

    const cleanId = searchId.replace('#', '').replace(/-/g, '').replace(/\s/g, '').trim().toUpperCase()

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
      console.error('❌ Error:', error)
      setOrder(null)
      setLoading(false)
      return
    }

    const foundOrder = allOrders?.find(o => {
      const orderIdClean = o.id.replace(/-/g, '').toUpperCase()
      return orderIdClean.includes(cleanId) || o.id.toUpperCase().includes(cleanId)
    })

    if (foundOrder) {
      setOrder({
        ...foundOrder,
        items: foundOrder.order_items || []
      })
      if (foundOrder.payment_type === 'installment') {
        loadPaymentHistory(foundOrder.id)
      }
    } else {
      setOrder(null)
    }

    setLoading(false)
  }

  async function loadPaymentHistory(orderId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('order_payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })

    if (data) setPaymentHistory(data)
  }

  async function handleCaptureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCapture(true)
    
    const formData = new FormData()
    formData.append('image', file)

    try {
      const result = await uploadOrderScreenshot(formData)
      
      if (result.error) {
        alert('Error al subir: ' + result.error)
      } else if (result.url) {
        setPaymentForm({...paymentForm, paymentScreenshotUrl: result.url})
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al subir la imagen')
    } finally {
      setUploadingCapture(false)
    }
  }

  function getStatusColor(status: string) {
    const colors: any = {
      pending_payment: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      payment_review: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      payment_approved: 'bg-blue-100 text-blue-800 border-blue-300',
      installment_active: 'bg-purple-100 text-purple-800 border-purple-300',
      in_preparation: 'bg-purple-100 text-purple-800 border-purple-300',
      ready: 'bg-green-100 text-green-800 border-green-300',
      delivered: 'bg-green-100 text-green-800 border-green-300',
      installment_completed: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  function getStatusLabel(status: string) {
    const labels: any = {
      pending_payment: 'Pendiente de Pago',
      payment_review: 'Pago en Revisión',
      payment_approved: 'Pago Aprobado',
      installment_active: '💳 Apartado Activo',
      in_preparation: 'En Preparación',
      ready: 'Listo para Entregar',
      delivered: 'Entregado',
      installment_completed: '✅ Apartado Completado',
      cancelled: 'Cancelado',
    }
    return labels[status] || status
  }

  function generateWhatsAppMessage() {
    if (!order || !company) return ''
    const message = `Hola ${company.name}, quiero consultar sobre mi pedido #${order.id.slice(0, 8).toUpperCase()}.`
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
Total: $${order.total_usd.toFixed(2)}`

    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  async function handleRegisterPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return

    setRegistering(true)

    const formData = new FormData()
    formData.append('orderId', order.id)
    formData.append('customerPhone', order.customer_phone)
    formData.append('amount', paymentForm.amount)
    formData.append('paymentMethod', paymentForm.paymentMethod)
    formData.append('paymentReference', paymentForm.paymentReference)
    formData.append('paymentScreenshotUrl', paymentForm.paymentScreenshotUrl)
    formData.append('notes', paymentForm.notes)

    const result = await registerClientPayment(formData)
    setRegistering(false)

    if (result.error) {
      alert('❌ Error: ' + result.error)
    } else {
      if (result.isFullyPaid) {
        alert('✅ ¡Pago completado! Tu apartado ha sido liquidado.')
      } else {
        alert(`✅ Abono registrado. Saldo restante: $${result.newPendingAmount?.toFixed(2)}`)
      }
      
      setShowPaymentModal(false)
      setPaymentForm({
        amount: '',
        paymentMethod: '',
        paymentReference: '',
        paymentScreenshotUrl: '',
        notes: '',
      })
      setSelectedMethod(null)
      
      searchOrder(order.id)
    }
  }

  function getMethodIcon(type: string) {
    switch (type) {
      case 'pago_movil': return '📱'
      case 'zelle': return '💵'
      case 'binance': return '🪙'
      case 'paypal': return '🅿️'
      case 'cash': return '💰'
      case 'efectivo': return '💰'
      case 'tarjeta': return '💳'
      case 'transferencia': return '🏦'
      default: return '💳'
    }
  }

  const currentStatusIndex = statusSteps.findIndex(s => s.id === order?.status)
  const primaryColor = company?.primary_color || '#F97316'
  const bgColor = company?.background_color || '#FDF8F5'

  const isInstallment = order?.payment_type === 'installment'
  const paidAmount = order?.paid_amount || order?.initial_payment || 0
  const pendingAmount = order?.pending_amount || order?.remaining_balance || 0
  const percentPaid = order && order.total_usd > 0 ? (paidAmount / order.total_usd) * 100 : 0

  // ✅ Función para obtener el nombre del método
  function getMethodName(method: any) {
    return method.name || methodLabels[method.type] || method.type
  }

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
            <p className="text-gray-600 mb-4">Ingresa el número de tu pedido</p>
            
            <div className="flex gap-2">
              <Input
                placeholder="Ej: 0C538E4F"
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
                <div className="relative mb-8 overflow-x-auto">
                  <div className="flex items-center justify-between min-w-[600px]">
                    {statusSteps.map((step, idx) => {
                      const StepIcon = step.icon
                      const isCompleted = idx <= currentStatusIndex

                      return (
                        <div key={step.id} className="flex flex-col items-center flex-1 relative z-10">
                          <div 
                            className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                              isCompleted ? 'text-white shadow-lg' : 'bg-gray-200 text-gray-400'
                            }`}
                            style={isCompleted ? { backgroundColor: primaryColor } : {}}
                          >
                            <StepIcon className="w-6 h-6" />
                          </div>
                          <p className={`text-xs font-medium text-center ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Fecha */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-4">
                  <Calendar className="w-5 h-5" style={{ color: primaryColor }} />
                  <div>
                    <p className="text-sm text-gray-600">Fecha del pedido</p>
                    <p className="font-semibold">
                      {new Date(order.created_at).toLocaleDateString('es-VE', { 
                        day: '2-digit', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="grid grid-cols-2 gap-3">
                  <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full gap-2" style={{ backgroundColor: '#25D366' }}>
                      <MessageCircle className="w-4 h-4" />
                      Consultar
                    </Button>
                  </a>
                  <Button variant="outline" onClick={copyOrderInfo} className="gap-2">
                    {copySuccess ? <><CheckCircle className="w-4 h-4 text-green-600" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SECCIÓN DE APARTADO */}
            {isInstallment && (
              <Card className="border-2 border-purple-300 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-6 h-6 text-purple-600" />
                      💳 Sistema de Apartado
                    </span>
                    <Badge className="bg-purple-100 text-purple-800">
                      {Math.min(percentPaid, 100).toFixed(0)}% Pagado
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  
                  {/* Barra de Progreso */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Progreso del pago</span>
                      <span className="font-bold">{Math.min(percentPaid, 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(percentPaid, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Resumen de Pagos */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Total</p>
                      <p className="text-lg font-bold">${order.total_usd.toFixed(2)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Inicial</p>
                      <p className="text-lg font-bold text-green-600">${(order.initial_payment || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Pagado</p>
                      <p className="text-lg font-bold text-blue-600">${paidAmount.toFixed(2)}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Pendiente</p>
                      <p className="text-lg font-bold text-red-600">${pendingAmount.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Historial de Pagos */}
                  {paymentHistory.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Historial de Pagos
                      </h4>
                      <div className="space-y-2">
                        {paymentHistory.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-green-700">+${payment.amount.toFixed(2)}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(payment.created_at).toLocaleDateString('es-VE')}
                                {payment.payment_reference && ` • Ref: ${payment.payment_reference}`}
                              </p>
                            </div>
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              {payment.payment_method === 'pago_movil' && '📱 Pago Móvil'}
                              {payment.payment_method === 'binance' && '🪙 Binance'}
                              {payment.payment_method === 'zelle' && '💵 Zelle'}
                              {payment.payment_method === 'cash' && '💰 Efectivo'}
                              {payment.payment_method === 'otro' && '📦 Otro'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botón de Hacer Abono */}
                  {pendingAmount > 0 ? (
                    <Button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 text-base"
                    >
                      💳 Hacer Abono (${pendingAmount.toFixed(2)} pendiente)
                    </Button>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-green-800 font-semibold">✅ Pago Completado</p>
                      <p className="text-sm text-green-700">Tu apartado está totalmente pagado</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                  Tus Datos
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
          </div>
        )}

        {/* Sin resultados */}
        {searched && !order && !loading && (
          <Card className="shadow-lg border-0">
            <CardContent className="p-12 text-center">
              <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Pedido no encontrado</h3>
              <p className="text-gray-600">Verifica que el número sea correcto</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* MODAL DE ABONO */}
      {showPaymentModal && order && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">💳 Registrar Abono</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowPaymentModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {/* Info del saldo */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Saldo pendiente:</span>
                  <span className="text-2xl font-bold text-red-600">${pendingAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Ya pagado:</span>
                  <span className="text-lg font-bold text-green-600">${paidAmount.toFixed(2)}</span>
                </div>
              </div>

              <form onSubmit={handleRegisterPayment} className="space-y-4">
                <div>
                  <Label>Monto del Abono *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={pendingAmount}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                    placeholder="0.00"
                    required
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo: ${pendingAmount.toFixed(2)}
                  </p>
                </div>

                {/* MÉTODO DE PAGO */}
                <div>
                  <Label>Método de Pago *</Label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => {
                      setPaymentForm({...paymentForm, paymentMethod: e.target.value})
                      const method = paymentMethods.find(m => m.type === e.target.value)
                      
                      if (method) {
                        let details = method.details
                        if (typeof details === 'string') {
                          try {
                            details = JSON.parse(details)
                          } catch (err) {
                            console.error('Error parsing:', err)
                            details = {}
                          }
                        }
                        setSelectedMethod({
                          ...method,
                          details: details
                        })
                      } else {
                        setSelectedMethod(null)
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                    required
                  >
                    <option value="">Seleccionar método...</option>
                    {paymentMethods.map(method => (
                      <option key={method.id} value={method.type}>
                        {getMethodIcon(method.type)} {getMethodName(method)}
                      </option>
                    ))}
                  </select>
                  {paymentMethods.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ El negocio no tiene métodos de pago configurados
                    </p>
                  )}
                </div>

                {/* DATOS DEL MÉTODO - USANDO details */}
                {selectedMethod && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Datos para transferir:
                    </h4>
                    
                    <div className="space-y-2 text-sm">
                      {/* Pago Móvil */}
                      {selectedMethod.type === 'pago_movil' && selectedMethod.details && (
                        <>
                          {selectedMethod.details.banco && (
                            <div className="flex justify-between items-center bg-white p-2 rounded">
                              <span className="text-gray-600 flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Banco:
                              </span>
                              <span className="font-semibold">{selectedMethod.details.banco}</span>
                            </div>
                          )}
                          {selectedMethod.details.telefono && (
                            <div className="flex justify-between items-center bg-white p-2 rounded">
                              <span className="text-gray-600 flex items-center gap-2">
                                <Smartphone className="w-4 h-4" /> Teléfono:
                              </span>
                              <span className="font-semibold font-mono">{selectedMethod.details.telefono}</span>
                            </div>
                          )}
                          {selectedMethod.details.cedula && (
                            <div className="flex justify-between items-center bg-white p-2 rounded">
                              <span className="text-gray-600 flex items-center gap-2">
                                <User className="w-4 h-4" /> Cédula:
                              </span>
                              <span className="font-semibold font-mono">{selectedMethod.details.cedula}</span>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Binance */}
                      {selectedMethod.type === 'binance' && selectedMethod.details?.binance_id && (
                        <div className="flex justify-between items-center bg-white p-2 rounded">
                          <span className="text-gray-600">🪙 Binance Pay ID:</span>
                          <span className="font-semibold font-mono">{selectedMethod.details.binance_id}</span>
                        </div>
                      )}
                      
                      {/* Zelle / PayPal */}
                      {(selectedMethod.type === 'zelle' || selectedMethod.type === 'paypal') && selectedMethod.details?.email && (
                        <div className="flex justify-between items-center bg-white p-2 rounded">
                          <span className="text-gray-600">📧 Email:</span>
                          <span className="font-semibold">{selectedMethod.details.email}</span>
                        </div>
                      )}
                      
                      {/* Efectivo */}
                      {selectedMethod.type === 'cash' && (
                        <div className="bg-white p-3 rounded text-sm">
                          <p className="text-gray-700 flex items-center gap-2">
                            💰 Paga en efectivo al recibir el producto
                          </p>
                        </div>
                      )}
                      
                      {/* Monto a pagar en USD y Bs */}
                      <div className="bg-blue-100 p-3 rounded border border-blue-300 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">Monto a pagar:</span>
                          <div className="text-right">
                            <span className="font-bold text-blue-700 block">
                              ${paymentForm.amount || pendingAmount.toFixed(2)}
                              {selectedMethod.type === 'binance' ? ' USDT' : ''}
                            </span>
                            {company?.exchange_rate && (
                              <span className="text-xs text-blue-600">
                                Bs. {((parseFloat(paymentForm.amount) || pendingAmount) * parseFloat(company.exchange_rate)).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Descripción */}
                    {selectedMethod.description && (
                      <p className="text-xs text-blue-700 italic">
                        ℹ️ {selectedMethod.description}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label>Referencia de Pago</Label>
                  <Input
                    value={paymentForm.paymentReference}
                    onChange={(e) => setPaymentForm({...paymentForm, paymentReference: e.target.value})}
                    placeholder="Últimos 6 dígitos"
                    className="mt-1"
                  />
                </div>

                {/* Upload de Captura */}
                <div>
                  <Label>Captura de Pago</Label>
                  {paymentForm.paymentScreenshotUrl ? (
                    <div className="relative mt-2">
                      <img 
                        src={paymentForm.paymentScreenshotUrl} 
                        alt="Captura" 
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setPaymentForm({...paymentForm, paymentScreenshotUrl: ''})}
                        className="absolute top-2 right-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="mt-2 flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 transition-colors bg-gray-50">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600 font-medium">Subir captura de pago</span>
                      <span className="text-xs text-gray-500 mt-1">JPG, PNG o WEBP (max 5MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCaptureUpload}
                        className="hidden"
                        disabled={uploadingCapture}
                      />
                    </label>
                  )}
                  {uploadingCapture && (
                    <p className="text-sm text-purple-600 mt-2 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Subiendo imagen...
                    </p>
                  )}
                </div>

                <div>
                  <Label>Notas (opcional)</Label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                    placeholder="Observaciones..."
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <p className="text-sm text-yellow-800">
                      <strong>Importante:</strong> El vendedor revisará y confirmará tu abono.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={registering || uploadingCapture}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    {registering ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Registrar Abono
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}