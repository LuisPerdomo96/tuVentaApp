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
  Upload, 
  X, 
  Loader2, 
  DollarSign,
  Home,
  ShoppingBag,
  CreditCard,
  Smartphone,
  Wallet,
  Banknote,
  CheckCircle
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { createOrder, uploadOrderScreenshot } from '../actions'

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [company, setCompany] = useState<any>(null)
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<any>(null)

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    deliveryType: 'delivery',
    tableNumber: '',
    notes: '',
    paymentMethod: '',
    paymentReference: '',
  })

  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    const savedCart = localStorage.getItem(`cart_${slug}`)
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (e) {
        console.error('Error loading cart:', e)
      }
    }
  }, [slug])

  async function loadData() {
    const supabase = createClient()

    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('slug', slug)
      .single()

    if (companyData) {
      setCompany(companyData)

      const { data: methods } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('company_id', companyData.id)
        .eq('is_active', true)

      if (methods) setPaymentMethods(methods)
    }
    setLoading(false)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    const form = new FormData()
    form.append('image', file)

    const result = await uploadOrderScreenshot(form)
    setUploadingImage(false)

    if (result.error) {
      alert(result.error)
    } else if (result.url) {
      setScreenshotUrl(result.url)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const isInstallment = formData.deliveryType === 'installment'
    const initialPaymentPercent = company?.min_initial_payment_percent || 50
    const initialPayment = isInstallment
      ? cartTotal * initialPaymentPercent / 100
      : cartTotal

    const form = new FormData()
    form.append('slug', slug)
    form.append('customerName', formData.customerName)
    form.append('customerPhone', formData.customerPhone)
    form.append('customerAddress', formData.customerAddress)
    form.append('deliveryType', formData.deliveryType)
    form.append('tableNumber', formData.tableNumber)
    form.append('notes', formData.notes)
    form.append('paymentMethod', formData.paymentMethod)
    form.append('paymentReference', formData.paymentReference)
    form.append('paymentScreenshotUrl', screenshotUrl || '')
    form.append('totalUsd', cartTotal.toString())
    form.append('paymentType', isInstallment ? 'installment' : 'full')
    form.append('initialPayment', initialPayment.toString())
    form.append('items', JSON.stringify(cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price_usd,
      notes: item.notes || '',
    }))))

    const result = await createOrder(form)
    setSubmitting(false)

    if (result.error) {
      alert(result.error)
    } else {
      localStorage.removeItem(`cart_${slug}`)
      router.push(`/${slug}/confirmation?orderId=${result.orderId}&whatsapp=${result.whatsappNumber}`)
    }
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price_usd * item.quantity), 0)
  const totalBs = company ? (cartTotal * parseFloat(company.exchange_rate || 1)).toFixed(2) : '0.00'
  
  const isInstallment = formData.deliveryType === 'installment'
  const initialPaymentPercent = Number(company?.min_initial_payment_percent) || 50
  const initialPaymentAmount = isInstallment 
    ? (cartTotal * initialPaymentPercent / 100).toFixed(2) 
    : cartTotal.toFixed(2)
  const remainingAmount = isInstallment
    ? (cartTotal - parseFloat(initialPaymentAmount)).toFixed(2)
    : '0.00'

  function getDeliveryIcon(type: string) {
    switch (type) {
      case 'delivery': return <Home className="w-6 h-6" />
      case 'pickup': return <ShoppingBag className="w-6 h-6" />
      case 'table': return <span className="text-2xl">🍽️</span>
      case 'installment': return <span className="text-2xl">💳</span>
      default: return <Home className="w-6 h-6" />
    }
  }

  function getDeliveryLabel(type: string) {
    switch (type) {
      case 'delivery': return 'Delivery'
      case 'pickup': return 'Retiro'
      case 'table': return 'Mesa'
      case 'installment': return 'Apartado'
      default: return 'Delivery'
    }
  }

  function getPaymentIcon(type: string) {
    switch (type) {
      case 'pago_movil': return <Smartphone className="w-5 h-5" />
      case 'binance': return <span className="text-xl"></span>
      case 'zelle': return <span className="text-xl">💵</span>
      case 'paypal': return <span className="text-xl">🅿️</span>
      case 'cash': return <Banknote className="w-5 h-5" />
      default: return <CreditCard className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-gray-50">
        <div className="text-center max-w-md">
          <ShoppingBag className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tu carrito está vacío</h1>
          <p className="text-gray-600 mb-6">Agrega productos antes de continuar</p>
          <Button onClick={() => router.push(`/${slug}`)} className="bg-orange-500 hover:bg-orange-600">
            Volver al Catálogo
          </Button>
        </div>
      </div>
    )
  }

  const primaryColor = company?.primary_color || '#F97316'
  const bgColor = company?.background_color || '#FDF8F5'

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: bgColor }}>
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Finalizar Pedido</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        
        {/* Resumen del Pedido */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-white border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" style={{ color: primaryColor }} />
              Tu Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between items-center py-3 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{item.product.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.quantity}x ${item.product.price_usd.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-bold text-lg" style={{ color: primaryColor }}>
                    ${(item.product.price_usd * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
              <div className="flex justify-between items-center pt-4 border-t-2" style={{ borderColor: primaryColor }}>
                <p className="text-lg font-bold">Total USD</p>
                <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                  ${cartTotal.toFixed(2)}
                </p>
              </div>
              {company && (
                <div className="flex justify-between items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <p>Equivalente en Bs (tasa {company.exchange_rate})</p>
                  <p className="font-bold">Bs. {totalBs}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tipo de Entrega */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-600" />
              Tipo de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {company?.delivery_enabled !== false && (
                <label className="relative cursor-pointer group">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="delivery"
                    checked={formData.deliveryType === 'delivery'}
                    onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                    className="peer sr-only"
                  />
                  <div className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-xl peer-checked:border-white peer-checked:shadow-lg transition-all hover:shadow-md" style={{ backgroundColor: formData.deliveryType === 'delivery' ? primaryColor : 'white' }}>
                    <div className={`mb-2 ${formData.deliveryType === 'delivery' ? 'text-white' : 'text-gray-600'}`}>
                      {getDeliveryIcon('delivery')}
                    </div>
                    <span className={`text-sm font-medium ${formData.deliveryType === 'delivery' ? 'text-white' : 'text-gray-700'}`}>
                      {getDeliveryLabel('delivery')}
                    </span>
                  </div>
                </label>
              )}

              {company?.pickup_enabled !== false && (
                <label className="relative cursor-pointer group">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="pickup"
                    checked={formData.deliveryType === 'pickup'}
                    onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                    className="peer sr-only"
                  />
                  <div className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-xl peer-checked:border-white peer-checked:shadow-lg transition-all hover:shadow-md" style={{ backgroundColor: formData.deliveryType === 'pickup' ? primaryColor : 'white' }}>
                    <div className={`mb-2 ${formData.deliveryType === 'pickup' ? 'text-white' : 'text-gray-600'}`}>
                      {getDeliveryIcon('pickup')}
                    </div>
                    <span className={`text-sm font-medium ${formData.deliveryType === 'pickup' ? 'text-white' : 'text-gray-700'}`}>
                      {getDeliveryLabel('pickup')}
                    </span>
                  </div>
                </label>
              )}

              {company?.table_enabled && (
                <label className="relative cursor-pointer group">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="table"
                    checked={formData.deliveryType === 'table'}
                    onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                    className="peer sr-only"
                  />
                  <div className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-xl peer-checked:border-white peer-checked:shadow-lg transition-all hover:shadow-md" style={{ backgroundColor: formData.deliveryType === 'table' ? primaryColor : 'white' }}>
                    <div className="mb-2 text-xl">{formData.deliveryType === 'table' ? '🍽️' : '🍽️'}</div>
                    <span className={`text-sm font-medium ${formData.deliveryType === 'table' ? 'text-white' : 'text-gray-700'}`}>
                      {getDeliveryLabel('table')}
                    </span>
                  </div>
                </label>
              )}

              {company?.installment_enabled && (
                <label className="relative cursor-pointer group">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="installment"
                    checked={formData.deliveryType === 'installment'}
                    onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                    className="peer sr-only"
                  />
                  <div className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-xl peer-checked:border-white peer-checked:shadow-lg transition-all hover:shadow-md" style={{ backgroundColor: formData.deliveryType === 'installment' ? primaryColor : 'white' }}>
                    <div className="mb-2 text-xl">{formData.deliveryType === 'installment' ? '' : '💳'}</div>
                    <span className={`text-sm font-medium ${formData.deliveryType === 'installment' ? 'text-white' : 'text-gray-700'}`}>
                      {getDeliveryLabel('installment')}
                    </span>
                  </div>
                </label>
              )}
            </div>

            {formData.deliveryType === 'delivery' && (
              <div className="mt-5">
                <Label className="font-semibold">Dirección de Entrega *</Label>
                <textarea
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  placeholder="Calle, número, punto de referencia..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl mt-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                />
              </div>
            )}

            {formData.deliveryType === 'table' && (
              <div className="mt-5">
                <Label className="font-semibold">Número de Mesa *</Label>
                <Input
                  type="number"
                  value={formData.tableNumber}
                  onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                  placeholder="Ej: 5"
                  className="mt-2"
                  required
                />
              </div>
            )}

            {formData.deliveryType === 'installment' && (
              <div className="mt-5 p-5 rounded-xl border-2" style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }}>
                <p className="font-bold text-lg mb-4" style={{ color: primaryColor }}>📋 Detalle del Apartado</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                    <span>Total del pedido:</span>
                    <span className="font-bold">${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                    <span>Pago inicial ({initialPaymentPercent}%):</span>
                    <span className="font-bold" style={{ color: primaryColor }}>${initialPaymentAmount}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white rounded-lg border-t-2 border-red-300">
                    <span>Saldo pendiente:</span>
                    <span className="font-bold text-red-600">${remainingAmount}</span>
                  </div>
                </div>
                <p className="text-xs mt-4 p-3 bg-white rounded-lg" style={{ color: primaryColor }}>
                  ️ El producto se entrega cuando completes el pago total.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Datos del Cliente */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-green-50 to-white border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Tus Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label className="font-semibold">Nombre Completo *</Label>
              <Input
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Juan Pérez"
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label className="font-semibold">Teléfono / WhatsApp *</Label>
              <Input
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="+58 412 1234567"
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label className="font-semibold">Notas / Observaciones</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ej: Sin cebolla, bien cocido..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl mt-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Método de Pago */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Método de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {paymentMethods.length === 0 ? (
              <p className="text-gray-500 text-center py-6">
                El negocio no tiene métodos de pago configurados
              </p>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map(method => (
                  <label key={method.id} className="block cursor-pointer group">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.type}
                      checked={formData.paymentMethod === method.type}
                      onChange={(e) => {
                        setFormData({ ...formData, paymentMethod: e.target.value })
                        setSelectedMethod(method)
                      }}
                      className="peer sr-only"
                    />
                    <div className={`p-4 border-2 rounded-xl transition-all hover:shadow-md ${formData.paymentMethod === method.type ? 'border-white shadow-lg' : 'border-gray-200'}`} style={{ backgroundColor: formData.paymentMethod === method.type ? `${primaryColor}10` : 'white' }}>
                      <div className="flex items-center gap-3">
                        <div style={{ color: primaryColor }}>
                          {getPaymentIcon(method.type)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{method.name}</p>
                          <p className="text-sm text-gray-600">
                            {method.type === 'pago_movil' && `${method.details.banco} - ${method.details.telefono}`}
                            {method.type === 'binance' && `ID: ${method.details.binance_id}`}
                            {method.type === 'zelle' && method.details.email}
                            {method.type === 'paypal' && method.details.email}
                            {method.type === 'cash' && 'Pagas al recibir'}
                          </p>
                        </div>
                        {formData.paymentMethod === method.type && (
                          <CheckCircle className="w-6 h-6" style={{ color: primaryColor }} />
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {selectedMethod && (
              <div className="mt-5 p-5 rounded-xl border-2" style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }}>
                <p className="font-bold mb-3" style={{ color: primaryColor }}>📋 Datos para Transferir:</p>
                <div className="text-sm space-y-2">
                  {selectedMethod.type === 'pago_movil' && (
                    <>
                      <div className="flex justify-between p-2 bg-white rounded"><span>Banco:</span><span className="font-semibold">{selectedMethod.details.banco}</span></div>
                      <div className="flex justify-between p-2 bg-white rounded"><span>Teléfono:</span><span className="font-semibold">{selectedMethod.details.telefono}</span></div>
                      <div className="flex justify-between p-2 bg-white rounded"><span>Cédula:</span><span className="font-semibold">{selectedMethod.details.cedula}</span></div>
                      <div className="flex justify-between p-2 bg-white rounded border-t-2" style={{ borderColor: primaryColor }}><span>Monto a pagar:</span><span className="font-bold" style={{ color: primaryColor }}>Bs. {isInstallment ? (parseFloat(initialPaymentAmount) * parseFloat(company.exchange_rate || 1)).toFixed(2) : totalBs}</span></div>
                    </>
                  )}
                  {selectedMethod.type === 'binance' && (
                    <>
                      <div className="flex justify-between p-2 bg-white rounded"><span>Binance Pay ID:</span><span className="font-semibold">{selectedMethod.details.binance_id}</span></div>
                      <div className="flex justify-between p-2 bg-white rounded border-t-2" style={{ borderColor: primaryColor }}><span>Monto a pagar:</span><span className="font-bold" style={{ color: primaryColor }}>${initialPaymentAmount} USDT</span></div>
                    </>
                  )}
                  {(selectedMethod.type === 'zelle' || selectedMethod.type === 'paypal') && (
                    <>
                      <div className="flex justify-between p-2 bg-white rounded"><span>Email:</span><span className="font-semibold">{selectedMethod.details.email}</span></div>
                      <div className="flex justify-between p-2 bg-white rounded border-t-2" style={{ borderColor: primaryColor }}><span>Monto a pagar:</span><span className="font-bold" style={{ color: primaryColor }}>${initialPaymentAmount}</span></div>
                    </>
                  )}
                </div>
              </div>
            )}

            {formData.paymentMethod && formData.paymentMethod !== 'cash' && (
              <div className="mt-5 space-y-4">
                <div>
                  <Label className="font-semibold">Número de Referencia *</Label>
                  <Input
                    value={formData.paymentReference}
                    onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                    placeholder="Últimos 6-8 dígitos"
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label className="font-semibold">Captura de Pago</Label>
                  {screenshotUrl ? (
                    <div className="relative mt-2">
                      <img src={screenshotUrl} alt="Captura" className="w-full h-48 object-cover rounded-xl" />
                      <button
                        type="button"
                        onClick={() => setScreenshotUrl(null)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <label className="mt-2 flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-500 transition-colors bg-gray-50">
                      <Upload className="w-10 h-10 text-gray-400 mb-3" />
                      <span className="text-sm text-gray-600 font-medium">Subir captura de pago</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                  )}
                  {uploadingImage && <p className="text-sm text-gray-600 mt-2">Subiendo...</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botón de Envío */}
        <Button
          type="submit"
          className="w-full h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-shadow"
          style={{ backgroundColor: primaryColor }}
          disabled={submitting || uploadingImage}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Confirmar Pedido {isInstallment && `(Pagar $${initialPaymentAmount})`}
            </>
          )}
        </Button>

        <p className="text-xs text-center text-gray-500">
          Al confirmar, se abrirá WhatsApp con el resumen de tu pedido
        </p>
      </form>
    </div>
  )
}