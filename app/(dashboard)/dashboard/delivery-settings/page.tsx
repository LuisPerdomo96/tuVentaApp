'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Loader2, Clock, Truck, Store, Utensils, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DeliverySettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)
  
  const [enabledTypes, setEnabledTypes] = useState({
    delivery: true,
    pickup: true,
    table: false,
    installment: false,
  })

  const [minInitialPayment, setMinInitialPayment] = useState(50)

  const [hours, setHours] = useState([
    { day: 'Lunes', open: '09:00', close: '21:00', closed: false },
    { day: 'Martes', open: '09:00', close: '21:00', closed: false },
    { day: 'Miércoles', open: '09:00', close: '21:00', closed: false },
    { day: 'Jueves', open: '09:00', close: '21:00', closed: false },
    { day: 'Viernes', open: '09:00', close: '21:00', closed: false },
    { day: 'Sábado', open: '09:00', close: '22:00', closed: false },
    { day: 'Domingo', open: '10:00', close: '20:00', closed: false },
  ])

  const [is247, setIs247] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: company } = await supabase
      .from('companies')
      .select('id, delivery_enabled, pickup_enabled, table_enabled, installment_enabled, min_initial_payment_percent, business_hours, is_open_24_7')
      .eq('owner_id', user.id)
      .single()

    if (company) {
      setCompanyId(company.id)
      setEnabledTypes({
        delivery: company.delivery_enabled ?? true,
        pickup: company.pickup_enabled ?? true,
        table: company.table_enabled ?? false,
        installment: company.installment_enabled ?? false,
      })
      setMinInitialPayment(company.min_initial_payment_percent ?? 50)
      setIs247(company.is_open_24_7 ?? false)
      
      if (company.business_hours) {
        setHours(company.business_hours)
      }
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!companyId) return
    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('companies')
      .update({
        delivery_enabled: enabledTypes.delivery,
        pickup_enabled: enabledTypes.pickup,
        table_enabled: enabledTypes.table,
        installment_enabled: enabledTypes.installment,
        min_initial_payment_percent: minInitialPayment,
        business_hours: hours,
        is_open_24_7: is247,
      })
      .eq('id', companyId)

    setSaving(false)

    if (error) {
      alert('Error al guardar: ' + error.message)
    } else {
      alert('✅ Configuración guardada')
    }
  }

  function updateHour(index: number, field: string, value: any) {
    const newHours = [...hours]
    newHours[index] = { ...newHours[index], [field]: value }
    setHours(newHours)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Configuración de Entrega</h1>
            <p className="text-sm text-gray-600">Define cómo recibirás los pedidos</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </>
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* Tipos de Entrega */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🚚 Tipos de Entrega Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Delivery */}
              <label className={`relative cursor-pointer border-2 rounded-lg p-4 transition-all ${
                enabledTypes.delivery ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
              }`}>
                <input
                  type="checkbox"
                  checked={enabledTypes.delivery}
                  onChange={(e) => setEnabledTypes({...enabledTypes, delivery: e.target.checked})}
                  className="sr-only"
                />
                <div className="flex flex-col items-center gap-2">
                  <Truck className={`w-8 h-8 ${enabledTypes.delivery ? 'text-orange-600' : 'text-gray-400'}`} />
                  <span className="font-medium">Delivery</span>
                  <span className="text-xs text-gray-600 text-center">Entrega a domicilio</span>
                </div>
                {enabledTypes.delivery && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </label>

              {/* Retiro */}
              <label className={`relative cursor-pointer border-2 rounded-lg p-4 transition-all ${
                enabledTypes.pickup ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
              }`}>
                <input
                  type="checkbox"
                  checked={enabledTypes.pickup}
                  onChange={(e) => setEnabledTypes({...enabledTypes, pickup: e.target.checked})}
                  className="sr-only"
                />
                <div className="flex flex-col items-center gap-2">
                  <Store className={`w-8 h-8 ${enabledTypes.pickup ? 'text-orange-600' : 'text-gray-400'}`} />
                  <span className="font-medium">Retiro en Local</span>
                  <span className="text-xs text-gray-600 text-center">El cliente recoge</span>
                </div>
                {enabledTypes.pickup && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </label>

              {/* Mesa */}
              <label className={`relative cursor-pointer border-2 rounded-lg p-4 transition-all ${
                enabledTypes.table ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
              }`}>
                <input
                  type="checkbox"
                  checked={enabledTypes.table}
                  onChange={(e) => setEnabledTypes({...enabledTypes, table: e.target.checked})}
                  className="sr-only"
                />
                <div className="flex flex-col items-center gap-2">
                  <Utensils className={`w-8 h-8 ${enabledTypes.table ? 'text-orange-600' : 'text-gray-400'}`} />
                  <span className="font-medium">Mesa</span>
                  <span className="text-xs text-gray-600 text-center">Consumo en local</span>
                </div>
                {enabledTypes.table && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </label>

              {/* APARTADO */}
              <label className={`relative cursor-pointer border-2 rounded-lg p-4 transition-all ${
                enabledTypes.installment ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
              }`}>
                <input
                  type="checkbox"
                  checked={enabledTypes.installment}
                  onChange={(e) => setEnabledTypes({...enabledTypes, installment: e.target.checked})}
                  className="sr-only"
                />
                <div className="flex flex-col items-center gap-2">
                  <DollarSign className={`w-8 h-8 ${enabledTypes.installment ? 'text-orange-600' : 'text-gray-400'}`} />
                  <span className="font-medium">Apartado</span>
                  <span className="text-xs text-gray-600 text-center">Pago por cuotas</span>
                </div>
                {enabledTypes.installment && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </label>
            </div>

            {/* Configuración de Apartado */}
            {enabledTypes.installment && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-semibold text-orange-900 mb-2">️ Configuración del Apartado</h4>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-700">Pago inicial mínimo:</label>
                  <input
                    type="number"
                    min="10"
                    max="90"
                    value={minInitialPayment}
                    onChange={(e) => setMinInitialPayment(parseInt(e.target.value) || 50)}
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                  <span className="text-sm text-gray-700">% del total</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  El cliente debe pagar al menos este porcentaje para apartar el producto.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Horarios */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Horarios de Atención
              </CardTitle>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={is247}
                  onChange={(e) => setIs247(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Abierto 24/7</span>
              </label>
            </div>
          </CardHeader>
          <CardContent>
            {is247 ? (
              <div className="text-center py-8 text-gray-600">
                <p>Tu negocio está configurado como abierto las 24 horas, los 7 días de la semana.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {hours.map((day, index) => (
                  <div key={day.day} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg flex-wrap">
                    <span className="w-24 font-medium text-sm">{day.day}</span>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={day.closed}
                        onChange={(e) => updateHour(index, 'closed', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-600">Cerrado</span>
                    </label>

                    {!day.closed && (
                      <>
                        <input
                          type="time"
                          value={day.open}
                          onChange={(e) => updateHour(index, 'open', e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <span className="text-gray-400">a</span>
                        <input
                          type="time"
                          value={day.close}
                          onChange={(e) => updateHour(index, 'close', e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botón Guardar (móvil) */}
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full h-12 bg-orange-500 hover:bg-orange-600 sm:hidden"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Configuración
            </>
          )}
        </Button>
      </main>
    </div>
  )
}