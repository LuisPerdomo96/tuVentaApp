'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, ArrowLeft, Crown, Zap, Building2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function PlansPage() {
  const router = useRouter()
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

    if (companyData) {
      setCompany(companyData)
    }
    setLoading(false)
  }

  async function handleUpgrade(plan: string) {
    if (plan === company.plan) {
      alert('Ya tienes este plan')
      return
    }

    if (!confirm(`¿Confirmar cambio al plan ${plan.toUpperCase()}?`)) return

    setUpgrading(true)
    const supabase = createClient()

    // Actualizar plan
    const { error } = await supabase
      .from('companies')
      .update({ 
        plan,
        plan_expires_at: plan === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', company.id)

    setUpgrading(false)

    if (error) {
      alert('Error al actualizar plan: ' + error.message)
    } else {
      alert(`✅ Plan actualizado a ${plan.toUpperCase()}`)
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

  const plans = [
    {
      id: 'free',
      name: 'Gratuito',
      price: '$0',
      period: '/mes',
      description: 'Perfecto para comenzar',
      icon: Zap,
      color: 'gray',
      features: [
        '10 productos',
        '1 sucursal',
        'Catálogo público',
        'Pedidos por WhatsApp',
        'Branding tuVentaApp',
      ],
      limitations: [
        'Sin personalización avanzada',
        'Sin estadísticas',
        'Sin soporte prioritario',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$15',
      period: '/mes',
      description: 'Para negocios en crecimiento',
      icon: Crown,
      color: 'orange',
      popular: true,
      features: [
        '100 productos',
        '3 sucursales',
        '10 empleados',
        'Sin branding',
        'Estadísticas avanzadas',
        'Personalización completa',
        'Soporte prioritario',
      ],
      limitations: [],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$49',
      period: '/mes',
      description: 'Para empresas grandes',
      icon: Building2,
      color: 'blue',
      features: [
        'Productos ilimitados',
        'Sucursales ilimitadas',
        'Empleados ilimitados',
        'API personalizada',
        'Onboarding dedicado',
        'SLA garantizado',
        'Soporte 24/7',
      ],
      limitations: [],
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
              Plan actual: <Badge className="ml-2">{company?.plan?.toUpperCase() || 'FREE'}</Badge>
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Plan Actual */}
        {company && (
          <Card className="mb-8 border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-bold">Tu Plan Actual: {company.plan.toUpperCase()}</h2>
                  <p className="text-gray-600">
                    {company.plan === 'free' && 'Tienes 10 productos disponibles'}
                    {company.plan === 'pro' && 'Tienes 100 productos disponibles'}
                    {company.plan === 'enterprise' && 'Productos ilimitados'}
                  </p>
                  {company.plan_expires_at && (
                    <p className="text-sm text-gray-500 mt-1">
                      Expira: {new Date(company.plan_expires_at).toLocaleDateString('es-VE')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grid de Planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const PlanIcon = plan.icon
            const isCurrentPlan = company?.plan === plan.id
            
            return (
              <Card 
                key={plan.id} 
                className={`relative ${
                  plan.popular ? 'border-2 border-orange-500 shadow-lg' : ''
                } ${isCurrentPlan ? 'bg-green-50' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-orange-500">Más Popular</Badge>
                  </div>
                )}
                
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-green-500">Plan Actual</Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${
                      plan.color === 'orange' ? 'bg-orange-100' :
                      plan.color === 'blue' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <PlanIcon className={`w-6 h-6 ${
                        plan.color === 'orange' ? 'text-orange-600' :
                        plan.color === 'blue' ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <p className="text-sm text-gray-600">{plan.description}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.limitations.length > 0 && (
                    <ul className="space-y-2 mb-6 text-sm text-gray-500">
                      {plan.limitations.map((limitation, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-red-400"></span>
                          <span>{limitation}</span>
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

        {/* Nota */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p> Los precios son en USD. Puedes cancelar en cualquier momento.</p>
          <p className="mt-2">
            ¿Necesitas ayuda para elegir? <Link href="/dashboard/settings" className="text-orange-600 underline">Contáctanos</Link>
          </p>
        </div>
      </main>
    </div>
  )
}