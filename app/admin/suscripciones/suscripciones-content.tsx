'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, DollarSign, Ticket, Gift, CheckCircle, XCircle, 
  Loader2, Plus, TrendingUp, Calendar, CreditCard
} from 'lucide-react'
import { 
  adminApproveEvent, adminRejectEvent, 
  adminCreateCoupon, adminStartTrial, adminConvertTrialToPaid 
} from '../actions'

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-VE', { 
    timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric'
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export default function SuscripcionesContent({ 
  initialPending, payments, coupons, trials 
}: {
  initialPending: any[]
  payments: any[]
  coupons: any[]
  trials: any[]
}) {
  const [activeTab, setActiveTab] = useState<'pending' | 'payments' | 'coupons' | 'trials'>('pending')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [showTrialModal, setShowTrialModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<any>(null)

  // Form states
  const [couponForm, setCouponForm] = useState({
    code: '', discountType: 'percentage', discountValue: 10, maxUses: 0, validDays: 30
  })
  const [trialForm, setTrialForm] = useState({ plan: 'pro', trialDays: 7 })

  const tabs = [
    { id: 'pending', label: 'Pendientes', icon: Clock, count: initialPending.length },
    { id: 'payments', label: 'Historial', icon: CreditCard, count: payments.length },
    { id: 'coupons', label: 'Cupones', icon: Ticket, count: coupons.length },
    { id: 'trials', label: 'Trials', icon: Gift, count: trials.length },
  ]

  const handleApprove = async (eventId: string) => {
    if (!confirm('¿Aprobar este upgrade?')) return
    setProcessingId(eventId)
    const result = await adminApproveEvent(eventId)
    setProcessingId(null)
    if (result.error) alert('❌ ' + result.error)
    else window.location.reload()
  }

  const handleReject = async (eventId: string) => {
    if (!confirm('¿Rechazar este upgrade?')) return
    setProcessingId(eventId)
    const result = await adminRejectEvent(eventId)
    setProcessingId(null)
    if (result.error) alert('❌ ' + result.error)
    else window.location.reload()
  }

  const handleCreateCoupon = async () => {
    const result = await adminCreateCoupon(
      couponForm.code, couponForm.discountType, couponForm.discountValue,
      couponForm.maxUses, couponForm.validDays
    )
    if (result.error) alert('❌ ' + result.error)
    else {
      alert('✅ Cupón creado')
      setShowCouponModal(false)
      window.location.reload()
    }
  }

  const handleStartTrial = async () => {
    if (!selectedCompany) return
    const result = await adminStartTrial(selectedCompany.company_id, trialForm.plan, trialForm.trialDays)
    if (result.error) alert('❌ ' + result.error)
    else {
      alert('✅ Trial iniciado')
      setShowTrialModal(false)
      window.location.reload()
    }
  }

  const handleConvertTrial = async (companyId: string) => {
    if (!confirm('¿Convertir trial a plan pago?')) return
    setProcessingId(companyId)
    const result = await adminConvertTrialToPaid(companyId)
    setProcessingId(null)
    if (result.error) alert('❌ ' + result.error)
    else window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Suscripciones</h1>
        <p className="text-gray-600 mt-1">Gestiona planes, pagos, cupones y trials</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <Badge className="bg-gray-100 text-gray-700 text-xs">{tab.count}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Pendientes */}
      {activeTab === 'pending' && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Upgrades Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {initialPending.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p>No hay upgrades pendientes</p>
              </div>
            ) : (
              <div className="divide-y">
                {initialPending.map((p: any) => (
                  <div key={p.event_id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{p.company_name}</p>
                        <p className="text-sm text-gray-500">{p.owner_email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gray-100 text-gray-700">{p.current_plan}</Badge>
                        <span>→</span>
                        <Badge className="bg-orange-100 text-orange-800">{p.plan_to}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(p.event_id)}
                          disabled={processingId === p.event_id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingId === p.event_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(p.event_id)}
                          disabled={processingId === p.event_id}
                          className="text-red-600 border-red-300"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Historial de Pagos */}
      {activeTab === 'payments' && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Historial de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No hay pagos registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Tienda</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Monto</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Plan</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Método</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{p.company_name}</td>
                        <td className="py-3 px-4 font-semibold text-green-600">{formatCurrency(p.amount_usd)}</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-blue-100 text-blue-800">{p.plan}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{p.payment_method || '—'}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">{formatDate(p.paid_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Cupones */}
      {activeTab === 'coupons' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCouponModal(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              Crear Cupón
            </Button>
          </div>
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-purple-600" />
                Cupones Activos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {coupons.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Ticket className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay cupones creados</p>
                </div>
              ) : (
                <div className="divide-y">
                  {coupons.map((c: any) => (
                    <div key={c.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="font-semibold text-gray-900 font-mono">{c.code}</p>
                          <p className="text-sm text-gray-500">
                            {c.discount_type === 'percentage' ? `${c.discount_value}%` : formatCurrency(c.discount_value)} de descuento
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-600">
                            <p>Usos: {c.current_uses}/{c.max_uses === 0 ? '∞' : c.max_uses}</p>
                            <p>Vence: {formatDate(c.valid_until)}</p>
                          </div>
                          <Badge className={c.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}>
                            {c.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Trials */}
      {activeTab === 'trials' && (
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-pink-600" />
                Trials Activos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {trials.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Gift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay trials activos</p>
                </div>
              ) : (
                <div className="divide-y">
                  {trials.map((t: any) => (
                    <div key={t.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{t.company_name}</p>
                          <p className="text-sm text-gray-500">{t.owner_email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-gray-600">
                            <p>Plan: <Badge className="bg-pink-100 text-pink-800">{t.plan}</Badge></p>
                            <p>Expira: {formatDate(t.expires_at)}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleConvertTrial(t.company_id)}
                            disabled={processingId === t.company_id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {processingId === t.company_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                            Convertir
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Crear Cupón */}
      {showCouponModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Crear Cupón</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Código</label>
                <input
                  type="text"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({...couponForm, code: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="DESCUENTO20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de descuento</label>
                <select
                  value={couponForm.discountType}
                  onChange={(e) => setCouponForm({...couponForm, discountType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto fijo ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor</label>
                <input
                  type="number"
                  value={couponForm.discountValue}
                  onChange={(e) => setCouponForm({...couponForm, discountValue: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Máximo de usos (0 = ilimitado)</label>
                <input
                  type="number"
                  value={couponForm.maxUses}
                  onChange={(e) => setCouponForm({...couponForm, maxUses: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Días de validez</label>
                <input
                  type="number"
                  value={couponForm.validDays}
                  onChange={(e) => setCouponForm({...couponForm, validDays: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleCreateCoupon} className="flex-1 bg-orange-500">
                  Crear
                </Button>
                <Button variant="outline" onClick={() => setShowCouponModal(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}