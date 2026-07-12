'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function PaymentsPage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exchangeRate, setExchangeRate] = useState('36.50')
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [newMethod, setNewMethod] = useState({
    type: 'pago_movil',
    details: { banco: '', telefono: '', cedula: '' }
  })

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

  const methodLabels: any = {
    pago_movil: ' Pago Móvil',
    binance: ' Binance Pay',
    zelle: ' Zelle',
    paypal: '️ PayPal',
    cash: '💰 Efectivo'
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
                {paymentMethods.map(method => (
                  <div key={method.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{methodLabels[method.type]}</p>
                      <p className="text-sm text-gray-600">
                        {method.type === 'pago_movil' && `${method.details.banco} - ${method.details.telefono}`}
                        {method.type === 'binance' && `ID: ${method.details.binance_id}`}
                        {method.type === 'zelle' && method.details.email}
                        {method.type === 'paypal' && method.details.email}
                        {method.type === 'cash' && 'Pago en efectivo al recibir'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMethod(method.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
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
                <option value="binance">🪙 Binance Pay</option>
                <option value="zelle"> Zelle</option>
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