'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Save, ArrowLeft, Smartphone, Banknote, CreditCard, Copy, CheckCircle, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function PaymentsPage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exchangeRate, setExchangeRate] = useState('36.50')
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
   const [newMethod, setNewMethod] = useState<any>({
    type: 'pago_movil',
    details: { banco: '', telefono: '', cedula: '' }
  })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: company } = await supabase
      .from('companies')
      .select('id, exchange_rate')
      .eq('owner_id', user.id)
      .single()

    if (company) {
      setCompanyId(company.id)
      setExchangeRate(company.exchange_rate?.toString() || '36.50')

      const { data: methods } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)

      if (methods) setPaymentMethods(methods)
    }
    setLoading(false)
  }

  async function saveExchangeRate() {
    if (!companyId) return
    const supabase = createClient()
    await supabase
      .from('companies')
      .update({ exchange_rate: parseFloat(exchangeRate) })
      .eq('id', companyId)
    alert('Tasa actualizada')
  }

  async function addPaymentMethod() {
    if (!companyId) return
    const supabase = createClient()

    const { error } = await supabase
      .from('payment_methods')
      .insert({
        company_id: companyId,
        type: newMethod.type,
        details: newMethod.details,
        is_active: true,
      })

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setNewMethod({ type: 'pago_movil', details: { banco: '', telefono: '', cedula: '' } })
      loadData()
    }
  }

  async function deleteMethod(id: string) {
    if (!confirm('¿Eliminar este método de pago?')) return
    const supabase = createClient()
    await supabase
      .from('payment_methods')
      .update({ is_active: false })
      .eq('id', id)
    loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  // Títulos LIMPIOS (sin los espacios/emojis pegados que había antes)
  const methodTitle: any = {
    pago_movil: 'Pago Móvil',
    binance: 'Binance Pay',
    zelle: 'Zelle',
    paypal: 'PayPal',
    cash: 'Efectivo',
  }

  // Resumen corto que va bajo el título (los datos completos van al expandir)
  function methodSummary(m: any): string {
    if (m.type === 'pago_movil') return `${m.details?.banco || ''} - ${m.details?.telefono || ''}`.replace(/^ - $/, '')
    if (m.type === 'binance') return `ID: ${m.details?.binance_id || ''}`
    if (m.type === 'zelle' || m.type === 'paypal') return m.details?.email || ''
    if (m.type === 'cash') return 'Pago en efectivo al recibir'
    return ''
  }

  function MethodIcon({ type }: { type: string }) {
    if (type === 'pago_movil') return <Smartphone className="w-5 h-5" />
    if (type === 'binance') return <span className="text-lg leading-none">🟡</span>
    if (type === 'zelle') return <span className="text-lg leading-none">💵</span>
    if (type === 'paypal') return <span className="text-lg leading-none">🅿️</span>
    if (type === 'cash') return <Banknote className="w-5 h-5" />
    return <CreditCard className="w-5 h-5" />
  }

  // Copia los datos del método expandido (con fallback para móviles viejos)
  async function copyMethodData(m: any) {
    let text = `📋 ${methodTitle[m.type] || m.type}\n\n`
    if (m.type === 'pago_movil') {
      text += `Banco: ${m.details?.banco || ''}\nTeléfono: ${m.details?.telefono || ''}\nCédula: ${m.details?.cedula || ''}\n`
    } else if (m.type === 'binance') {
      text += `Binance Pay ID: ${m.details?.binance_id || ''}\n`
    } else if (m.type === 'zelle' || m.type === 'paypal') {
      text += `Email: ${m.details?.email || ''}\n`
    } else if (m.type === 'cash') {
      text += `Pago en efectivo al recibir\n`
    }
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-999999px'
      document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
    }
    setCopiedId(m.id)
    setTimeout(() => setCopiedId((cur) => (cur === m.id ? null : cur)), 1800)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Métodos de Pago</h1>
            <p className="text-sm text-gray-600">Configura cómo recibirás los pagos</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Tasa de Cambio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">💱 Tasa de Cambio del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Los precios de tus productos están en USD. Esta tasa se usará para mostrar el equivalente en Bolívares a tus clientes.
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>1 USD = ? Bs</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                />
              </div>
              <Button onClick={saveExchangeRate} className="mt-6">
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Métodos Actuales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Métodos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethods.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No tienes métodos de pago configurados
              </p>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map(method => {
                  const open = expandedId === method.id
                  return (
                  <div
                    key={method.id}
                    className={`rounded-xl border-2 transition-all ${open ? 'border-orange-400 bg-orange-50/40 shadow-sm' : 'border-gray-200 bg-gray-50 hover:border-orange-300 hover:shadow-sm'}`}
                  >
                    <div className="flex items-center justify-between gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(open ? null : method.id)}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                      >
                        <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${open ? 'bg-orange-500 text-white' : 'bg-white text-orange-500 border border-gray-200'} transition-colors`}>
                          <MethodIcon type={method.type} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold text-gray-900 text-base leading-tight">
                            {methodTitle[method.type] || method.type}
                          </span>
                          <span className="block text-sm text-gray-500 truncate">{methodSummary(method)}</span>
                        </span>
                        <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-orange-500' : ''}`} />
                      </button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); deleteMethod(method.id) }}
                        className="text-red-600 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Panel de datos: se despliega suave al tocar la tarjeta */}
                    <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden">
                        <div className="px-3 pb-3 space-y-2">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-bold uppercase tracking-wide text-orange-600">Datos del método</p>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); copyMethodData(method) }}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors ${copiedId === method.id ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                            >
                              {copiedId === method.id ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedId === method.id ? 'Copiado' : 'Copiar'}
                            </button>
                          </div>
                          {method.type === 'pago_movil' && (
                            <>
                              <div className="flex justify-between p-2 bg-white rounded-lg border border-gray-100"><span className="text-sm text-gray-600">Banco</span><span className="text-sm font-semibold text-gray-900 break-all text-right">{method.details?.banco}</span></div>
                              <div className="flex justify-between p-2 bg-white rounded-lg border border-gray-100"><span className="text-sm text-gray-600">Teléfono</span><span className="text-sm font-semibold text-gray-900 break-all text-right">{method.details?.telefono}</span></div>
                              <div className="flex justify-between p-2 bg-white rounded-lg border border-gray-100"><span className="text-sm text-gray-600">Cédula / RIF</span><span className="text-sm font-semibold text-gray-900 break-all text-right">{method.details?.cedula}</span></div>
                            </>
                          )}
                          {method.type === 'binance' && (
                            <div className="flex justify-between p-2 bg-white rounded-lg border border-gray-100"><span className="text-sm text-gray-600">Binance Pay ID</span><span className="text-sm font-semibold text-gray-900 break-all text-right">{method.details?.binance_id}</span></div>
                          )}
                          {(method.type === 'zelle' || method.type === 'paypal') && (
                            <div className="flex justify-between p-2 bg-white rounded-lg border border-gray-100"><span className="text-sm text-gray-600">Email</span><span className="text-sm font-semibold text-gray-900 break-all text-right">{method.details?.email}</span></div>
                          )}
                          {method.type === 'cash' && (
                            <div className="p-2 bg-white rounded-lg border border-gray-100 text-sm text-gray-700">💰 El cliente paga en efectivo al recibir el pedido.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agregar Nuevo Método */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agregar Método de Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tipo de Método</Label>
              <select
                value={newMethod.type}
                onChange={(e) => {
                  setNewMethod({ type: e.target.value, details: {} as any })
                }}
                className="w-full px-3 py-2 border rounded-lg mt-1"
              >
                
                <option value="pago_movil">📱 Pago Móvil</option>
                <option value="binance">🟡 Binance Pay</option>
                <option value="zelle">💵 Zelle</option>
                <option value="paypal">🅿️ PayPal</option>
                <option value="cash">💰 Efectivo</option>
              </select>
            </div>

            {newMethod.type === 'pago_movil' && (
              <>
                <div>
                  <Label>Banco</Label>
                  <Input
                    placeholder="Ej: Mercantil, Banesco, BDV"
                    value={(newMethod.details as any).banco || ''}
                    onChange={(e) => setNewMethod({
                      ...newMethod,
                      details: { ...newMethod.details, banco: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    placeholder="0412-1234567"
                    value={(newMethod.details as any).telefono || ''}
                    onChange={(e) => setNewMethod({
                      ...newMethod,
                      details: { ...newMethod.details, telefono: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Cédula / RIF</Label>
                  <Input
                    placeholder="V-12345678"
                    value={(newMethod.details as any).cedula || ''}
                    onChange={(e) => setNewMethod({
                      ...newMethod,
                      details: { ...newMethod.details, cedula: e.target.value }
                    })}
                  />
                </div>
              </>
            )}

            {newMethod.type === 'binance' && (
              <div>
                <Label>Binance Pay ID</Label>
                <Input
                  placeholder="Tu ID de Binance Pay"
                  value={(newMethod.details as any).binance_id || ''}
                  onChange={(e) => setNewMethod({
                    ...newMethod,
                    details: { ...newMethod.details, binance_id: e.target.value }
                  })}
                />
              </div>
            )}

            {(newMethod.type === 'zelle' || newMethod.type === 'paypal') && (
              <div>
                <Label>Correo Electrónico</Label>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={(newMethod.details as any).email || ''}
                  onChange={(e) => setNewMethod({
                    ...newMethod,
                    details: { ...newMethod.details, email: e.target.value }
                  })}
                />
              </div>
            )}

            <Button onClick={addPaymentMethod} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Método
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}