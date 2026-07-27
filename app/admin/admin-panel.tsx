'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Crown, CheckCircle, XCircle, Loader2, ShieldCheck, Store, Clock, AlertTriangle, Building2
} from 'lucide-react'
import { adminApproveEvent, adminRejectEvent } from './actions'

function planBadge(plan: string) {
  const map: any = {
    free: 'bg-gray-100 text-gray-700',
    pro: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white',
    enterprise: 'bg-gradient-to-r from-violet-500 to-purple-600 text-white',
  }
  return <Badge className={map[plan] || 'bg-gray-100 text-gray-700'}>{(plan || 'free').toUpperCase()}</Badge>
}

function statusBadge(status: string) {
  const map: any = {
    active: { c: 'bg-green-100 text-green-800', l: 'Activo' },
    past_due: { c: 'bg-yellow-100 text-yellow-800', l: '⚠️ Vencido' },
    archived: { c: 'bg-red-100 text-red-800', l: 'Archivado' },
    canceled: { c: 'bg-gray-100 text-gray-700', l: 'Cancelado' },
    trialing: { c: 'bg-blue-100 text-blue-800', l: 'Prueba' },
  }
  const s = map[status] || { c: 'bg-gray-100 text-gray-700', l: status }
  return <Badge className={s.c}>{s.l}</Badge>
}

export function AdminPanel({ initialPending, initialCompanies, adminEmail }: {
  initialPending: any[]
  initialCompanies: any[]
  adminEmail: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)

  function handleApprove(eventId: string) {
    if (!confirm('¿Aprobar este upgrade y activar el plan?')) return
    setProcessingId(eventId)
    startTransition(async () => {
      const result = await adminApproveEvent(eventId)
      setProcessingId(null)
      if (result.error) { alert('❌ ' + result.error); return }
      router.refresh()
    })
  }

  function handleReject(eventId: string) {
    if (!confirm('¿Rechazar este upgrade? No se activará el plan.')) return
    setProcessingId(eventId)
    startTransition(async () => {
      const result = await adminRejectEvent(eventId)
      setProcessingId(null)
      if (result.error) { alert('❌ ' + result.error); return }
      router.refresh()
    })
  }

  const pastDueCount = initialCompanies.filter((c: any) => c.subscription_status === 'past_due').length

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Panel de Administración</h1>
                <p className="text-sm text-white/80">Gestión de planes y cobros del SaaS</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-0 gap-1">
              <Crown className="w-3 h-3" /> {adminEmail}
            </Badge>
          </div>

          {/* Métricas en chips */}
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="px-3 py-1.5 rounded-lg bg-white/15 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pendientes: <strong>{initialPending.length}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-white/15 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Vencidos: <strong>{pastDueCount}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-white/15 flex items-center gap-2">
              <Store className="w-4 h-4" /> Tiendas: <strong>{initialCompanies.length}</strong>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Upgrades Pendientes */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Upgrades Pendientes de Aprobación
              {initialPending.length > 0 && (
                <Badge className="bg-amber-100 text-amber-800 ml-1">{initialPending.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {initialPending.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p className="font-medium">No hay upgrades pendientes</p>
                <p className="text-sm">Cuando un cliente elija un plan pago, aparecerá aquí para que lo apruebes.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tienda</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Dueño</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cambio</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ciclo</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Monto</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Solicitado</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {initialPending.map((p: any) => (
                      <tr key={p.event_id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{p.company_name}</p>
                          <p className="text-xs text-gray-500">/{p.slug}</p>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{p.owner_email}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {planBadge(p.current_plan)}
                            <span className="text-gray-400">→</span>
                            {planBadge(p.plan_to)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {p.billing_cycle === 'monthly' ? 'Mensual' : p.billing_cycle === 'quarterly' ? 'Trimestral' : '—'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-900">${Number(p.amount_usd).toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {new Date(p.created_at).toLocaleDateString('es-VE')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(p.event_id)}
                              disabled={processingId === p.event_id}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {processingId === p.event_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(p.event_id)}
                              disabled={processingId === p.event_id}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Rechazar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Todas las Tiendas */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-600" />
              Todas las Tiendas
              <Badge className="bg-gray-100 text-gray-700 ml-1">{initialCompanies.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tienda</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Dueño</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Plan</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Vence</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Creado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {initialCompanies.map((c: any) => (
                    <tr key={c.company_id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500">/{c.slug} · {c.business_type === 'restaurant' ? 'Restaurante' : 'Tienda'}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{c.owner_email}</td>
                      <td className="py-3 px-4">{planBadge(c.plan)}</td>
                      <td className="py-3 px-4">{statusBadge(c.subscription_status)}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {c.plan_expires_at ? new Date(c.plan_expires_at).toLocaleDateString('es-VE') : '—'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(c.created_at).toLocaleDateString('es-VE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}