'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Loader2, Clock, Truck, Store, Utensils, DollarSign, Crown, Lock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { getPlan } from '@/lib/plans'

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
  const [companyPlan, setCompanyPlan] = useState<string>('free')

  // Fuente única: el flag 'installments' del plan decide si Apartado es editable.
  // Free => installments=false => tarjeta desvanecida + PRO + candado (como en settings).
  const plan = getPlan(companyPlan)
  const installmentsLocked = !plan.installments

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: company } = await supabase
      .from('companies')
      .select('id, plan, delivery_enabled, pickup_enabled, table_enabled, installment_enabled, min_initial_payment_percent, business_hours, is_open_24_7')
      .eq('owner_id', user.id)
      .single()

    if (company) {
      setCompanyId(company.id)
      setCompanyPlan(company.plan || 'free')
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
        // Si el plan no incluye apartados, el servidor SIEMPRE recibe false
        // (coherencia panel<->servidor, igual que los colores en settings).
        installment_enabled: installmentsLocked ? false : enabledTypes.installment,
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

             {/* APARTADO (premium: desvanecido + PRO + candado si el plan no lo incluye) */}
              <label className={`relative border-2 rounded-lg p-4 transition-all ${
                installmentsLocked
                  ? 'group opacity-75 cursor-not-allowed border-gray-200 bg-gray-50'
                  : enabledTypes.installment
                    ? 'cursor-pointer border-orange-500 bg-orange-50'
                    : 'cursor-pointer border-gray-200 hover:border-orange-300'
              }`}>
                <input
                  type="checkbox"
                  checked={enabledTypes.installment}
                  disabled={installmentsLocked}
                  onChange={(e) => setEnabledTypes({...enabledTypes, installment: e.target.checked})}
                  className="sr-only"
                />
                <div className="flex flex-col items-center gap-2">
                  <DollarSign className={`w-8 h-8 ${!installmentsLocked && enabledTypes.installment ? 'text-orange-600' : 'text-gray-400'}`} />
                  <span className="font-medium">Apartado</span>
                  <span className="text-xs text-gray-600 text-center">Pago por cuotas</span>
                </div>
                {!installmentsLocked && enabledTypes.installment && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
                {installmentsLocked && (
                  <>
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-lg">
                      <Lock className="w-6 h-6 text-gray-400 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <div className="absolute top-2 right-2 z-20">
                      <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white gap-1 text-[10px] px-2 py-0.5 shadow-sm">
                        <Crown className="w-3 h-3" />
                        PRO
                      </Badge>
                    </div>
                  </>
                )}
              </label>
            </div>

            {/* Configuración de Apartado (visible desvanecida + PRO si el plan no lo incluye) */}
            {(enabledTypes.installment || installmentsLocked) && (
              <div className={`relative mt-4 p-4 border rounded-lg ${
                installmentsLocked
                  ? 'opacity-75 bg-gray-50 border-gray-200'
                  : 'bg-orange-50 border-orange-200'
              }`}>
                {installmentsLocked && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white gap-1 text-[10px] px-2 py-0.5 shadow-sm">
                      <Crown className="w-3 h-3" />
                      PRO
                    </Badge>
                  </div>
                )}
                <h4 className={`font-semibold mb-2 flex items-center gap-2 ${installmentsLocked ? 'text-gray-700' : 'text-orange-900'}`}>
                  {installmentsLocked && <Lock className="w-4 h-4 text-gray-400" />}
                  Configuración del Apartado
                </h4>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-700">Pago inicial mínimo:</label>
                  <input
                    type="number"
                    min="10"
                    max="90"
                    value={minInitialPayment}
                    disabled={installmentsLocked}
                    onChange={(e) => setMinInitialPayment(parseInt(e.target.value) || 50)}
                    className="w-20 px-2 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-700">% del total</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  El cliente debe pagar al menos este porcentaje para apartar el producto.
                </p>
                {installmentsLocked && (
                  <div className="mt-3 flex items-center justify-between gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Crown className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-800">
                        Los apartados y el pago por cuotas están disponibles desde el <strong>Plan Pro</strong>.
                      </p>
                    </div>
                    <Link href="/dashboard/plans">
                      <Button size="sm" className="bg-gradient-to-r from-amber-400 to-orange-500 text-white shrink-0">
                        Ver Planes
                      </Button>
                    </Link>
                  </div>
                )}
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