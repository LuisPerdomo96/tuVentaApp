'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateOrderStatus } from '../actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Package, 
  Truck, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Loader2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  CreditCard
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadOrderDetail()
  }, [orderId])

  useEffect(() => {
    if (!orderId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`order-detail-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        () => {
          loadOrderDetail()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId])

  async function loadOrderDetail() {
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
      .eq('id', orderId)
      .single()

    if (orderData) {
      setOrder(orderData)
    }
    setLoading(false)
  }

  async function handleStatusChange(newStatus: string) {
    if (!confirm(`¿Estás seguro de cambiar el estado a "${newStatus}"?`)) return
    
    setUpdating(true)
    const result = await updateOrderStatus(orderId, newStatus)
    setUpdating(false)
    
    if (result.error) {
      alert(result.error)
    } else {
      loadOrderDetail()
    }
  }

  function getStatusBadge(status: string, paymentType?: string, remainingBalance?: number) {
    if (paymentType === 'installment' && remainingBalance && remainingBalance > 0) {
      return (
        <Badge className="bg-purple-100 text-purple-800 border border-purple-300 px-3 py-1">
          💳 Apartado - Saldo Pendiente
        </Badge>
      )
    }

    if (paymentType === 'installment' && remainingBalance === 0) {
      return (
        <Badge className="bg-green-100 text-green-800 border border-green-300 px-3 py-1">
          ✅ Apartado Completado
        </Badge>
      )
    }

    const config: any = {
      pending_payment: { label: '⏳ Pendiente de Pago', color: 'bg-gray-100 text-gray-800 border-gray-300' },
      payment_review: { label: '🔍 Pago en Revisión', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      payment_approved: { label: '✅ Pago Aprobado', color: 'bg-green-100 text-green-800 border-green-300' },
      payment_rejected: { label: '❌ Pago Rechazado', color: 'bg-red-100 text-red-800 border-red-300' },
      in_preparation: { label: '🔧 En Preparación', color: 'bg-blue-100 text-blue-800 border-blue-300' },
      ready: { label: '📦 Listo', color: 'bg-purple-100 text-purple-800 border-purple-300' },
      delivered: { label: '🚚 Entregado', color: 'bg-green-100 text-green-800 border-green-300' },
      cancelled: { label: '❌ Cancelado', color: 'bg-red-100 text-red-800 border-red-300' },
      installment_active: { label: '💳 Apartado Activo', color: 'bg-purple-100 text-purple-800 border-purple-300' },
      installment_completed: { label: '✅ Apartado Completado', color: 'bg-green-100 text-green-800 border-green-300' },
    }
    const c = config[status] || config.pending_payment
    return <Badge className={`${c.color} px-3 py-1`}>{c.label}</Badge>
  }

  function getDeliveryText() {
    if (!order) return ''
    if (order.delivery_type === 'delivery') return '🏠 Delivery a Domicilio'
    if (order.delivery_type === 'pickup') return '🏪 Retiro en Local'
    if (order.delivery_type === 'table') return `🍽️ Mesa ${order.table_number || 'N/A'}`
    if (order.delivery_type === 'installment') return '💳 Apartado (Pago por cuotas)'
    return order.delivery_type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Pedido no encontrado</h1>
          <Button onClick={() => router.push('/dashboard/orders')}>Volver</Button>
        </div>
      </div>
    )
  }

  // Timeline con todos los estados
  const allStatuses = [
    { status: 'pending_payment', label: 'Pendiente', icon: Clock },
    { status: 'payment_approved', label: 'Aprobado', icon: CheckCircle2 },
    { status: 'in_preparation', label: 'En Proceso', icon: Package },
    { status: 'ready', label: 'Listo', icon: CheckCircle },
    { status: 'delivered', label: 'Entregado', icon: Truck },
  ]

  const currentIndex = allStatuses.findIndex(s => s.status === order.status)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/orders">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Pedido #{order.id.slice(0, 8).toUpperCase()}
              </h1>
              <p className="text-sm text-gray-600">
                {new Date(order.created_at).toLocaleString('es-VE')}
              </p>
            </div>
          </div>
          {getStatusBadge(order.status, order.payment_type, order.pending_amount || order.remaining_balance)}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        
        {/* Línea de Tiempo con Dropdown */}
        <Card className="bg-gradient-to-r from-gray-50 to-white shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                📊 Progreso del Pedido
              </span>
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updating}
                className="px-4 py-2 border-2 rounded-lg text-sm font-semibold bg-white disabled:opacity-50 cursor-pointer hover:border-orange-400 transition-colors"
              >
                <option value="pending_payment">⏳ Pendiente de Pago</option>
                <option value="payment_review">🔍 En Revisión</option>
                <option value="payment_approved">✅ Pago Aprobado</option>
                <option value="installment_active">💳 Apartado Activo</option>
                <option value="in_preparation">🔧 En Preparación</option>
                <option value="ready">📦 Listo</option>
                <option value="delivered">🚚 Entregado</option>
                <option value="installment_completed">✅ Apartado Completado</option>
                <option value="cancelled">❌ Cancelado</option>
              </select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              {allStatuses.map((step, idx) => {
                const StepIcon = step.icon
                const isCompleted = idx <= currentIndex && currentIndex !== -1
                
                return (
                  <div key={step.status} className="flex items-center flex-1 min-w-0">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-3 shrink-0 transition-all ${
                      isCompleted 
                        ? 'bg-green-500 border-green-500 text-white scale-110 shadow-lg' 
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}>
                      <StepIcon className="w-6 h-6" />
                    </div>
                    <span className={`ml-2 text-sm font-semibold whitespace-nowrap ${
                      isCompleted ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </span>
                    {idx < allStatuses.length - 1 && (
                      <div className={`flex-1 h-2 mx-2 rounded-full ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Estado actual destacado */}
            <div className="mt-6 p-4 bg-white rounded-lg border-2 shadow-md" style={{ 
              borderColor: order.status === 'delivered' ? '#22c55e' : 
                         order.status === 'cancelled' ? '#ef4444' : 
                         order.status.includes('installment') ? '#a855f7' : '#f97316'
            }}>
              <p className="text-sm text-gray-600 mb-1">Estado actual:</p>
              <div className="flex items-center gap-2">
                {getStatusBadge(order.status, order.payment_type, order.pending_amount || order.remaining_balance)}
                {order.payment_type === 'installment' && (
                  <span className="text-sm text-gray-600 ml-2">
                    ({((order.paid_amount || 0) / order.total_usd * 100).toFixed(0)}% pagado)
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acciones Rápidas */}
        {order.status === 'payment_review' && (
          <Card className="border-l-4 border-l-yellow-500 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-900">Pago Pendiente de Aprobación</p>
                    <p className="text-sm text-yellow-700">
                      Verifica el pago y aprueba o rechaza el pedido
                    </p>
                    {order.payment_reference && (
                      <p className="text-sm text-yellow-700 mt-1">
                        <strong>Referencia:</strong> {order.payment_reference}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleStatusChange('payment_approved')}
                    disabled={updating}
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {updating ? 'Procesando...' : '✅ Aprobar Pago'}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => handleStatusChange('payment_rejected')}
                    disabled={updating}
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Rechazar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Apartado */}
        {order.payment_type === 'installment' && (
          <InstallmentSection orderId={order.id} order={order} onStatusChange={loadOrderDetail} />
        )}

        {/* Productos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-5 h-5" />
              Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.order_items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity}x ${item.price_usd.toFixed(2)}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-gray-500 italic">Nota: {item.notes}</p>
                    )}
                  </div>
                  <p className="font-semibold">
                    ${(item.quantity * item.price_usd).toFixed(2)}
                  </p>
                </div>
              ))}
              <div className="border-t-2 border-orange-500 pt-3 flex justify-between items-center">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold text-orange-600">
                  ${order.total_usd.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información de Pago (solo pagos NO‑apartado; en apartados el inicial ya está en el historial) */}
        {order.payment_reference && order.payment_type !== 'installment' && (
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Información de Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-600">Referencia:</span>
                <span className="font-mono font-bold text-lg">{order.payment_reference}</span>
              </div>
              {order.payment_screenshot_url && (
                <div>
                  <p className="text-sm text-gray-600 mb-2 font-medium">📸 Captura de Pago:</p>
                  <a 
                    href={order.payment_screenshot_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img 
                      src={order.payment_screenshot_url} 
                      alt="Captura de pago" 
                      className="w-full h-auto max-h-96 object-contain border-2 border-gray-200 rounded-lg"
                    />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tipo de Entrega */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Tipo de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {order.delivery_type === 'delivery' && <Truck className="w-6 h-6 text-blue-500" />}
              {order.delivery_type === 'pickup' && <Package className="w-6 h-6 text-green-500" />}
              {order.delivery_type === 'table' && <Clock className="w-6 h-6 text-purple-500" />}
              {order.delivery_type === 'installment' && <CreditCard className="w-6 h-6 text-orange-500" />}
              <div>
                <p className="font-medium">{getDeliveryText()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información del Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Nombre</p>
                <p className="font-medium">{order.customer_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="font-medium">{order.customer_phone}</p>
              </div>
            </div>
            {order.customer_address && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Dirección</p>
                  <p className="font-medium">{order.customer_address}</p>
                </div>
              </div>
            )}
            {order.notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>📝 Notas del Cliente:</strong> {order.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botón Volver */}
        <Link href="/dashboard/orders">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Pedidos
          </Button>
        </Link>
      </main>
    </div>
  )
}

// Componente de Apartado (igual que antes)
function InstallmentSection({ orderId, order, onStatusChange }: any) {
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [method, setMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [installments, setInstallments] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  useEffect(() => {
    loadInstallments()
  }, [orderId])

  async function loadInstallments() {
    const { getInstallmentHistory } = await import('./actions')
    const result = await getInstallmentHistory(orderId)
    if (result.success) setInstallments(result.data)
  }

  async function handleRegisterPayment(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    const { registerInstallmentPayment } = await import('./actions')
    const result = await registerInstallmentPayment(
      orderId,
      parseFloat(amount),
      reference,
      method,
      notes
    )
    
    setLoading(false)
    
    if (result.error) {
      alert(result.error)
    } else {
      setAmount('')
      setReference('')
      setMethod('')
      setNotes('')
      setShowForm(false)
      loadInstallments()
      onStatusChange()
      
      if (result.isFullyPaid) {
        alert('✅ ¡Pago completado! El pedido ha sido aprobado automáticamente.')
      } else {
        alert(`✅ Pago registrado. Saldo restante: $${(result.newRemainingBalance || 0).toFixed(2)}`)
      }
    }
  }

const approvedPayments = installments.filter((p: any) => (p.status || 'approved') === 'approved')
  const sumPayments = approvedPayments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0)
  const inReviewAmount = installments.filter((p: any) => p.status === 'pending').reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0)
  const rejectedAmount = installments.filter((p: any) => p.status === 'rejected').reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0)
  const paidAmount = Math.min(order.total_usd, (order.initial_payment || 0) + sumPayments)
  const pendingAmount = Math.max(0, order.total_usd - ((order.initial_payment || 0) + sumPayments))
  const percentPaid = order.total_usd > 0 ? (paidAmount / order.total_usd) * 100 : 0

  async function handleApprove(paymentId: string) {
    if (!confirm('¿Aprobar este pago y acreditarlo al pedido?')) return
    setReviewingId(paymentId)
    const { approvePayment } = await import('./actions')
    const result = await approvePayment(paymentId)
    setReviewingId(null)
    if (result.error) { alert('❌ ' + result.error); return }
    loadInstallments(); onStatusChange()
  }

  async function handleReject(paymentId: string) {
    if (!confirm('¿Rechazar este pago? NO se acreditará al pedido.')) return
    setReviewingId(paymentId)
    const { rejectPayment } = await import('./actions')
    const result = await rejectPayment(paymentId)
    setReviewingId(null)
    if (result.error) { alert('❌ ' + result.error); return }
    loadInstallments(); onStatusChange()
  }

  // Timeline VISUAL unificado: pago inicial (del pedido) + abonos (order_payments),
  // ordenados por fecha. SOLO presentación: no toca datos ni el motor de cobro.
  const initialRow = (order.initial_payment || 0) > 0
    ? [{
        id: 'initial',
        amount: order.initial_payment,
        created_at: order.created_at,
        payment_reference: order.payment_reference || null,
        payment_screenshot_url: order.payment_screenshot_url || null,
        payment_method: null,
        notes: null,
        isInitial: true,
      }]
    : []
  const abonoRows = installments.map((p: any) => ({ ...p, isInitial: false }))
  const paymentTimeline = [...initialRow, ...abonoRows].sort(
    (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          💳 Sistema de Apartado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {(inReviewAmount > 0 || rejectedAmount > 0) && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {inReviewAmount > 0 && (
              <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 font-semibold">⏳ ${inReviewAmount.toFixed(2)} en revisión (no acreditado)</span>
            )}
            {rejectedAmount > 0 && (
              <span className="px-2 py-1 rounded bg-red-100 text-red-800 font-semibold">❌ ${rejectedAmount.toFixed(2)} rechazado</span>
            )}
          </div>
        )}

        {paymentTimeline.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Historial de Pagos:</h4>
            <div className="space-y-2">
                            {paymentTimeline.map((row: any) => (
                <div
                  key={row.id}
                  className={`p-2 rounded text-sm border ${
                    row.isInitial ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        ${Number(row.amount).toFixed(2)}
                        {row.isInitial && (
                          <span className="ml-2 text-xs font-semibold text-green-700">💵 Pago inicial</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(row.created_at).toLocaleDateString('es-VE')}
                        {row.payment_method && ` • ${row.payment_method}`}
                        {row.payment_reference && ` • Ref: ${row.payment_reference}`}
                      </p>
                    </div>
                    {row.notes && (
                      <p className="text-xs text-gray-500 italic">{row.notes}</p>
                    )}
                  </div>
                  {row.payment_screenshot_url && (
                    <a
                      href={row.payment_screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      📸 Ver comprobante
                    </a>
                  )}
                  {!row.isInitial && row.status === 'pending' && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">⏳ En revisión</span>
                      <button type="button" disabled={reviewingId === row.id} onClick={() => handleApprove(row.id)} className="text-xs px-2 py-1 rounded bg-green-600 text-white disabled:opacity-50">✅ Aprobar</button>
                      <button type="button" disabled={reviewingId === row.id} onClick={() => handleReject(row.id)} className="text-xs px-2 py-1 rounded bg-red-600 text-white disabled:opacity-50">❌ Rechazar</button>
                    </div>
                  )}
                  {!row.isInitial && row.status === 'rejected' && (
                    <div className="mt-2"><span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded">❌ Rechazado (no acreditado)</span></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingAmount > 0 && (
          <>
            <Button
              onClick={() => setShowForm(!showForm)}
              variant="outline"
              className="w-full"
            >
              {showForm ? 'Cancelar' : '+ Registrar Pago Parcial'}
            </Button>

            {showForm && (
              <form onSubmit={handleRegisterPayment} className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div>
                  <label className="text-sm font-medium">Monto a pagar *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={pendingAmount}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo: ${pendingAmount.toFixed(2)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Referencia</label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg mt-1"
                      placeholder="Últimos dígitos"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Método</label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg mt-1"
                    >
                      <option value="">Seleccionar</option>
                      <option value="pago_movil">Pago Móvil</option>
                      <option value="binance">Binance</option>
                      <option value="zelle">Zelle</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Notas (opcional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                    rows={2}
                    placeholder="Observaciones..."
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? 'Procesando...' : '✓ Registrar Pago'}
                </Button>
              </form>
            )}
          </>
        )}

        {pendingAmount <= 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-800 font-semibold">✅ Pago Completado</p>
            <p className="text-sm text-green-700">El producto puede ser entregado</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}