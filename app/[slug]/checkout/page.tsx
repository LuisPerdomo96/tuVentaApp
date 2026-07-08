'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Upload, X, Loader2, DollarSign } from 'lucide-react'
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

    // ✅ CORRECCIÓN: Calcular pago inicial basado en deliveryType
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
  
  // ✅ CORRECCIÓN: Usar deliveryType en lugar de paymentType
  const isInstallment = formData.deliveryType === 'installment'
  const initialPaymentPercent = Number(company?.min_initial_payment_percent) || 50
  const initialPaymentAmount = isInstallment 
    ? (cartTotal * initialPaymentPercent / 100).toFixed(2) 
    : cartTotal.toFixed(2)
  const remainingAmount = isInstallment
    ? (cartTotal - parseFloat(initialPaymentAmount)).toFixed(2)
    : '0.00'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Tu carrito está vacío</h1>
          <p className="text-gray-600 mb-4">Agrega productos antes de continuar</p>
          <Button onClick={() => router.push(`/${slug}`)}>
            Volver al Catálogo
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Finalizar Pedido</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Resumen del Carrito */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📋 Tu Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity}x ${item.product.price_usd.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    ${(item.product.price_usd * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 border-t-2 border-orange-500">
                <p className="text-lg font-bold">Total USD</p>
                <p className="text-xl font-bold text-orange-600">
                  ${cartTotal.toFixed(2)}
                </p>
              </div>
              {company && (
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <p>Equivalente en Bs (tasa {company.exchange_rate})</p>
                  <p className="font-semibold">Bs. {totalBs}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tipo de Entrega */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🚚 Tipo de Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {company?.delivery_enabled !== false && (
                <label className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="delivery"
                    checked={formData.deliveryType === 'delivery'}
                    onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                    className="peer sr-only"
                  />
                  <div className="flex flex-col items-center p-3 border-2 border-gray-200 rounded-lg peer-checked:border-orange-500 peer-checked:bg-orange-50 transition-all">
                    <span className="text-2xl mb-1">🏠</span>
                    <span className="text-xs font-medium text-center">Delivery</span>
                  </div>
                </label>
              )}

              {company?.pickup_enabled !== false && (
                <label className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="pickup"
                    checked={formData.deliveryType === 'pickup'}
                    onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                    className="peer sr-only"
                  />
                  <div className="flex flex-col items-center p-3 border-2 border-gray-200 rounded-lg peer-checked:border-orange-500 peer-checked:bg-orange-50 transition-all">
                    <span className="text-2xl mb-1">🏪</span>
                    <span className="text-xs font-medium text-center">Retiro</span>
                  </div>
                </label>
              )}

              {company?.table_enabled && (
                <label className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="table"
                    checked={formData.deliveryType === 'table'}
                    onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                    className="peer sr-only"
                  />
                  <div className="flex flex-col items-center p-3 border-2 border-gray-200 rounded-lg peer-checked:border-orange-500 peer-checked:bg-orange-50 transition-all">
                    <span className="text-2xl mb-1">️🍽️</span>
                    <span className="text-xs font-medium text-center">Mesa</span>
                  </div>
                </label>
              )}

              {company?.installment_enabled && (
                <label className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="installment"
                    checked={formData.deliveryType === 'installment'}
                    onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                    className="peer sr-only"
                  />
                  <div className="flex flex-col items-center p-3 border-2 border-gray-200 rounded-lg peer-checked:border-orange-500 peer-checked:bg-orange-50 transition-all">
                    <span className="text-2xl mb-1">💳</span>
                    <span className="text-xs font-medium text-center">Apartado</span>
                  </div>
                </label>
              )}
            </div>

            {formData.deliveryType === 'delivery' && (
              <div className="mt-4">
                <Label>Dirección de Entrega *</Label>
                <textarea
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  placeholder="Calle, número, punto de referencia..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                  required
                />
              </div>
            )}

            {formData.deliveryType === 'table' && (
              <div className="mt-4">
                <Label>Número de Mesa *</Label>
                <Input
                  type="number"
                  value={formData.tableNumber}
                  onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                  placeholder="Ej: 5"
                  required
                />
              </div>
            )}

            {formData.deliveryType === 'installment' && (
            <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="font-semibold text-orange-900 mb-3">📋 Detalle del Apartado</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total del pedido:</span>
                  <span className="font-bold">${cartTotal.toFixed(2)} / Bs. {(cartTotal * parseFloat(company?.exchange_rate || 1)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pago inicial ({initialPaymentPercent}%):</span>
                  <span className="font-bold text-orange-600">${initialPaymentAmount} / Bs. {(parseFloat(initialPaymentAmount) * parseFloat(company?.exchange_rate || 1)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-orange-200 pt-2">
                  <span>Saldo pendiente:</span>
                  <span className="font-bold text-red-600">${remainingAmount}</span>
                </div>
              </div>
              <p className="text-xs text-orange-700 mt-3">⚠️ El producto se entrega cuando completes el pago total.</p>
            </div>
          )}
          </CardContent>
        </Card>

        {/* Datos del Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">👤 Tus Datos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nombre Completo *</Label>
              <Input
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Juan Pérez"
                required
              />
            </div>
            <div>
              <Label>Teléfono / WhatsApp *</Label>
              <Input
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="+58 412 1234567"
                required
              />
            </div>
            <div>
              <Label>Notas / Observaciones (opcional)</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ej: Sin cebolla, bien cocido..."
                rows={2}
                className="w-full px-3 py-2 border rounded-lg mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Método de Pago */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">💳 Método de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethods.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                El negocio no tiene métodos de pago configurados
              </p>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map(method => (
                  <label key={method.id} className="block cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.type}
                      checked={formData.paymentMethod === method.type}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="peer sr-only"
                    />
                    <div className="p-3 border-2 border-gray-200 rounded-lg peer-checked:border-orange-500 peer-checked:bg-orange-50">
                      <p className="font-medium">
                        {method.type === 'pago_movil' && '📱 Pago Móvil'}
                        {method.type === 'binance' && '🪙 Binance Pay'}
                        {method.type === 'zelle' && '💵 Zelle'}
                        {method.type === 'paypal' && '🅿️ PayPal'}
                        {method.type === 'cash' && '💰 Efectivo'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {method.type === 'pago_movil' && `${method.details.banco} - ${method.details.telefono}`}
                        {method.type === 'binance' && `ID: ${method.details.binance_id}`}
                        {method.type === 'zelle' && method.details.email}
                        {method.type === 'paypal' && method.details.email}
                        {method.type === 'cash' && 'Pagas al recibir'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {formData.paymentMethod && (
              <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="font-semibold text-orange-900 mb-2">📋 Datos para Transferir:</p>
                {paymentMethods.filter(m => m.type === formData.paymentMethod).map(method => (
                  <div key={method.id} className="text-sm space-y-1">
                    {method.type === 'pago_movil' && (
                      <>
                        <p><strong>Banco:</strong> {method.details.banco}</p>
                        <p><strong>Teléfono:</strong> {method.details.telefono}</p>
                        <p><strong>Cédula:</strong> {method.details.cedula}</p>
                        <p><strong>Monto a pagar AHORA:</strong> Bs. {isInstallment ? (parseFloat(initialPaymentAmount) * parseFloat(company.exchange_rate || 1)).toFixed(2) : totalBs}</p>
                      </>
                    )}
                    {method.type === 'binance' && (
                      <>
                        <p><strong>Binance Pay ID:</strong> {method.details.binance_id}</p>
                        <p><strong>Monto a pagar AHORA:</strong> ${initialPaymentAmount} USDT</p>
                      </>
                    )}
                    {(method.type === 'zelle' || method.type === 'paypal') && (
                      <>
                        <p><strong>Email:</strong> {method.details.email}</p>
                        <p><strong>Monto a pagar AHORA:</strong> ${initialPaymentAmount}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {formData.paymentMethod && formData.paymentMethod !== 'cash' && (
              <div className="mt-4 space-y-3">
                <div>
                  <Label>Número de Referencia *</Label>
                  <Input
                    value={formData.paymentReference}
                    onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                    placeholder="Últimos 6-8 dígitos"
                    required
                  />
                </div>
                <div>
                  <Label>Captura de Pago (opcional pero recomendado)</Label>
                  {screenshotUrl ? (
                    <div className="relative mt-2">
                      <img src={screenshotUrl} alt="Captura" className="w-full h-40 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => setScreenshotUrl(null)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="mt-2 flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-500">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">Subir captura</span>
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
          className="w-full h-12 text-base font-medium bg-orange-500 hover:bg-orange-600"
          disabled={submitting || uploadingImage}
        >
          {submitting ? 'Procesando...' : `✓ Confirmar Pedido${isInstallment ? ` (Pagar $${initialPaymentAmount})` : ''}`}
        </Button>

        <p className="text-xs text-center text-gray-500">
          Al confirmar, se abrirá WhatsApp con el resumen de tu pedido
        </p>
      </form>
    </div>
  )
}