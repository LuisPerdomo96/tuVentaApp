'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, X, ArrowLeft, Crown, Zap, Building2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import {
  PLANS,
  getPlan,
  formatLimit,
  formatPrice,
  formatPeriod,
  daysForBilling,
  supportLabel,
  type PlanDef,
  type PlanId,
} from '@/lib/plans'

// Presentación (iconos/colores). Los NÚMEROS vienen de lib/plans, no de acá.
const META: Record<PlanId, { icon: any; bg: string; fg: string }> = {
  free: { icon: Zap, bg: 'bg-gray-100', fg: 'text-gray-600' },
  pro: { icon: Crown, bg: 'bg-orange-100', fg: 'text-orange-600' },
  enterprise: { icon: Building2, bg: 'bg-blue-100', fg: 'text-blue-600' },
}

function buildFeatures(p: PlanDef): string[] {
  return [
    `Hasta ${formatLimit(p.maxProducts)} productos`,
    `${p.maxImagesPerProduct} imagen${p.maxImagesPerProduct === 1 ? '' : 'es'} por producto`,
    `Hasta ${formatLimit(p.maxCategories)} ${p.maxCategories === 1 ? 'categoría' : 'categorías'}`,
    `Hasta ${formatLimit(p.maxQrCodes)} código${p.maxQrCodes === 1 ? '' : 's'} QR`,
    p.maxEmployees === Infinity
      ? 'Empleados ilimitados'
      : `${p.maxEmployees} empleado${p.maxEmployees === 1 ? '' : 's'}`,
    `Hasta ${formatLimit(p.maxPaymentMethods)} método${p.maxPaymentMethods === 1 ? '' : 's'} de pago`,
    p.monthlyVisits === Infinity
      ? 'Visitas ilimitadas'
      : `${formatLimit(p.monthlyVisits)} visitas/mes`,
    p.installments ? 'Apartados y sistema de abonos' : '',
    p.customSlug ? 'Slug personalizado / dominio propio' : '',
    p.advancedStats ? 'Estadísticas avanzadas de ventas' : '',
    p.advancedInventory ? 'Inventario avanzado' : '',
    p.advancedCustomization ? 'Personalización avanzada' : '',
    p.showPoweredBy ? 'Incluye sello "Powered by"' : 'Sin sello "Powered by"',
    `Soporte ${supportLabel(p.support)}`,
    '1 tienda por cuenta',
  ].filter(Boolean)
}

function buildLimitations(p: PlanDef): string[] {
  return [
    !p.installments ? 'Sin apartados / abonos' : '',
    !p.customSlug ? 'Sin slug personalizado' : '',
    !p.advancedStats ? 'Sin estadísticas avanzadas' : '',
    !p.advancedInventory ? 'Sin inventario avanzado' : '',
    !p.advancedCustomization ? 'Sin personalización avanzada' : '',
    p.support === 'standard' ? 'Sin soporte prioritario' : '',
  ].filter(Boolean)
}

export default function PlansPage() {
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [company, setCompany] = useState<any>(null)

  useEffect(() => {
    loadCompany()
  }, [])

  async function loadCompany() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (companyData) setCompany(companyData)
    setLoading(false)
  }

  async function handleUpgrade(planId: string) {
    if (planId === company.plan) {
      alert('Ya tienes este plan')
      return
    }
    if (!confirm(`¿Confirmar cambio al plan ${planId.toUpperCase()}?`)) return

    setUpgrading(true)
    const supabase = createClient()

    // La fecha de expiración ahora respeta el CICLO del plan (mensual=30d, trimestral=90d)
    const def = getPlan(planId)
    const expiresAt =
      def.billing === 'none'
        ? null
        : new Date(Date.now() + daysForBilling(def.billing) * 24 * 60 * 60 * 1000).toISOString()

    // ⚠️ NOTA DE SEGURIDAD (pendiente): este update lo hace el cliente directo.
    // Cuando conectemos el COBRO, esto pasará a una server action que valida el pago.
    const { error } = await supabase
      .from('companies')
      .update({ plan: planId, plan_expires_at: expiresAt })
      .eq('id', company.id)

    setUpgrading(false)

    if (error) {
      alert('Error al actualizar plan: ' + error.message)
    } else {
      alert(`✅ Plan actualizado a ${planId.toUpperCase()}`)
      loadCompany()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    )
  }

  const current = getPlan(company?.plan)
  const planList: PlanDef[] = [PLANS.free, PLANS.pro, PLANS.enterprise]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Planes y Precios</h1>
            <p className="text-sm text-gray-600">
              Plan actual: <Badge className="ml-2">{current.name.toUpperCase()}</Badge>
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {company && (
          <Card className="mb-8 border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold">Tu Plan Actual: {current.name.toUpperCase()}</h2>
              <p className="text-gray-600">
                Tienes hasta {formatLimit(current.maxProducts)} productos · {formatLimit(current.monthlyVisits)} visitas/mes
              </p>
              {company.plan_expires_at && (
                <p className="text-sm text-gray-500 mt-1">
                  Expira: {new Date(company.plan_expires_at).toLocaleDateString('es-VE')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planList.map((plan) => {
            const PlanIcon = META[plan.id].icon
            const isCurrentPlan = company?.plan === plan.id
            const features = buildFeatures(plan)
            const limitations = buildLimitations(plan)

            return (
              <Card
                key={plan.id}
                  className={`relative overflow-visible ${plan.popular ? 'border-2 border-orange-500 shadow-lg' : ''} ${isCurrentPlan ? 'bg-green-50' : ''}`}              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-[5]">
                    <Badge className="bg-orange-500">Más Popular</Badge>
                  </div>
                )}
                {isCurrentPlan && (
                   <div className="absolute -top-3 right-4 z-[5]">
                    <Badge className="bg-green-500">Plan Actual</Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${META[plan.id].bg}`}>
                      <PlanIcon className={`w-6 h-6 ${META[plan.id].fg}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{formatPrice(plan)}</span>
                    <span className="text-gray-600"> {formatPeriod(plan.billing)}</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {limitations.length > 0 && (
                    <ul className="space-y-2 mb-6 text-sm text-gray-500">
                      {limitations.map((l, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <span>{l}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Button
                    className={`w-full ${
                      isCurrentPlan
                        ? 'bg-gray-300 cursor-not-allowed'
                        : plan.popular
                          ? 'bg-orange-500 hover:bg-orange-600'
                          : 'bg-gray-900 hover:bg-gray-800'
                    }`}
                    disabled={isCurrentPlan || upgrading}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isCurrentPlan ? 'Plan Actual' : upgrading ? 'Procesando...' : `Elegir ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Los precios son en USD. Puedes cancelar en cualquier momento.</p>
          <p className="mt-2">
            ¿Necesitas ayuda para elegir?{' '}
            <Link href="/dashboard/settings" className="text-orange-600 underline">Contáctanos</Link>
          </p>
        </div>
      </main>
    </div>
  )
}