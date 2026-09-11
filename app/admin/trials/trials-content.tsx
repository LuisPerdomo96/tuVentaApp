'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Gift, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  Plus,
  Loader2,
  Calendar,
  AlertCircle,
  Users
} from 'lucide-react'
import { 
  adminStartTrialForCompany, 
  adminExtendTrial, 
  adminCancelTrial,
  adminConvertTrialToPaid 
} from '../actions'

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-VE', { 
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getDaysRemaining(expiresAt: string | null) {
  if (!expiresAt) return 0
  const now = new Date()
  const exp = new Date(expiresAt)
  const diff = exp.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function TrialsContent({ 
  trials, 
  stats, 
  companies 
}: {
  trials: any[]
  stats: any
  companies: any[]
}) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'converted' | 'expired'>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [showStartModal, setShowStartModal] = useState(false)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [selectedTrial, setSelectedTrial] = useState<any>(null)
  
  const [startForm, setStartForm] = useState({
    companyId: '',
    plan: 'pro',
    trialDays: 7
  })
  const [extendDays, setExtendDays] = useState(7)

  const filteredTrials = trials.filter((t: any) => {
    if (activeFilter === 'all') return true
    return t.status === activeFilter
  })

  const handleStartTrial = async () => {
    if (!startForm.companyId) {
      alert('Selecciona una empresa')
      return
    }
    const result = await adminStartTrialForCompany(
      startForm.companyId,
      startForm.plan,
      startForm.trialDays
    )
    if (result.error) alert('❌ ' + result.error)
    else {
      alert('✅ Trial iniciado correctamente')
      setShowStartModal(false)
      window.location.reload()
    }
  }

  const handleExtend = async () => {
    if (!selectedTrial) return
    const result = await adminExtendTrial(selectedTrial.id, extendDays)
    if (result.error) alert('❌ ' + result.error)
    else {
      alert(`✅ Trial extendido por ${extendDays} días`)
      setShowExtendModal(false)
      window.location.reload()
    }
  }

  const handleCancel = async (trialId: string) => {
    if (!confirm('¿Cancelar este trial? La empresa volverá al plan gratuito.')) return
    setProcessingId(trialId)
    const result = await adminCancelTrial(trialId)
    setProcessingId(null)
    if (result.error) alert('❌ ' + result.error)
    else window.location.reload()
  }

  const handleConvert = async (companyId: string) => {
    if (!confirm('¿Convertir este trial a plan pago?')) return
    setProcessingId(companyId)
    const result = await adminConvertTrialToPaid(companyId)
    setProcessingId(null)
    if (result.error) alert('❌ ' + result.error)
    else window.location.reload()
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { c: string; l: string }> = {
      active: { c: 'bg-green-100 text-green-800', l: 'Activo' },
      converted: { c: 'bg-blue-100 text-blue-800', l: 'Convertido' },
      expired: { c: 'bg-red-100 text-red-800', l: 'Expirado' },
      cancelled: { c: 'bg-gray-100 text-gray-700', l: 'Cancelado' },
    }
    const s = map[status] || { c: 'bg-gray-100 text-gray-700', l: status }
    return <Badge className={s.c}>{s.l}</Badge>
  }

  const statCards = [
    {
      title: 'Total Trials',
      value: stats.total_trials || 0,
      icon: Gift,
      bgColor: 'bg-pink-50',
      iconColor: 'text-pink-600'
    },
    {
      title: 'Activos',
      value: stats.active_trials || 0,
      icon: Clock,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    {
      title: 'Convertidos',
      value: stats.converted_trials || 0,
      icon: CheckCircle,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Tasa de Conversión',
      value: `${stats.conversion_rate || 0}%`,
      icon: TrendingUp,
      bgColor: 'bg-violet-50',
      iconColor: 'text-violet-600'
    },
  ]

  const filters = [
    { id: 'all', label: 'Todos', count: trials.length },
    { id: 'active', label: 'Activos', count: trials.filter((t: any) => t.status === 'active').length },
    { id: 'converted', label: 'Convertidos', count: trials.filter((t: any) => t.status === 'converted').length },
    { id: 'expired', label: 'Expirados', count: trials.filter((t: any) => t.status === 'expired').length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pruebas Gratuitas</h1>
          <p className="text-gray-600 mt-1">Gestiona trials y conversiones a pago</p>
        </div>
        <Button onClick={() => setShowStartModal(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" />
          Iniciar Trial
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeFilter === filter.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {filter.label}
            <Badge className="bg-gray-100 text-gray-700 text-xs">{filter.count}</Badge>
          </button>
        ))}
      </div>

      {/* Lista de Trials */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-600" />
            Trials Registrados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTrials.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Gift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No hay trials registrados</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredTrials.map((trial: any) => {
                const daysRemaining = getDaysRemaining(trial.expires_at)
                const isExpiringSoon = daysRemaining <= 3 && daysRemaining > 0
                const isExpired = daysRemaining < 0
                
                return (
                  <div key={trial.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                          <Gift className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{trial.company_name}</p>
                          <p className="text-sm text-gray-500">{trial.owner_email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            {statusBadge(trial.status)}
                            <Badge className="bg-purple-100 text-purple-800">
                              {trial.plan.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            {trial.status === 'active' && (
                              <span className={isExpiringSoon ? 'text-amber-600 font-medium' : isExpired ? 'text-red-600 font-medium' : ''}>
                                {isExpired ? `Expiró hace ${Math.abs(daysRemaining)} días` : 
                                 isExpiringSoon ? `⚠️ Expira en ${daysRemaining} días` : 
                                 `Expira en ${daysRemaining} días`}
                              </span>
                            )}
                            {trial.status === 'converted' && '✅ Convertido a pago'}
                            {trial.status === 'expired' && ' Trial expirado'}
                            {trial.status === 'cancelled' && '❌ Cancelado'}
                          </p>
                        </div>
                        
                        {trial.status === 'active' && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTrial(trial)
                                setShowExtendModal(true)
                              }}
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <Calendar className="w-4 h-4 mr-1" />
                              Extender
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleConvert(trial.company_id)}
                              disabled={processingId === trial.company_id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {processingId === trial.company_id ? 
                                <Loader2 className="w-4 h-4 animate-spin" /> : 
                                <CheckCircle className="w-4 h-4 mr-1" />
                              }
                              Convertir
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancel(trial.id)}
                              disabled={processingId === trial.id}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Barra de progreso del trial */}
                    {trial.status === 'active' && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Inicio: {formatDate(trial.started_at)}</span>
                          <span>Fin: {formatDate(trial.expires_at)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              isExpiringSoon ? 'bg-amber-500' : 
                              isExpired ? 'bg-red-500' : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.max(0, Math.min(100, 
                                ((trial.trial_days - daysRemaining) / trial.trial_days) * 100
                              ))}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Iniciar Trial */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-600" />
              Iniciar Prueba Gratuita
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Empresa</label>
                <select
                  value={startForm.companyId}
                  onChange={(e) => setStartForm({...startForm, companyId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleccionar empresa...</option>
                  {companies.map((c: any) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.name} ({c.owner_email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Plan del trial</label>
                <select
                  value={startForm.plan}
                  onChange={(e) => setStartForm({...startForm, plan: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="pro">Pro ($4.99/mes)</option>
                  <option value="enterprise">Enterprise ($19.99/3 meses)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Días de prueba</label>
                <input
                  type="number"
                  value={startForm.trialDays}
                  onChange={(e) => setStartForm({...startForm, trialDays: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                  max="30"
                />
                <p className="text-xs text-gray-500 mt-1">Máximo 30 días</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleStartTrial} className="flex-1 bg-orange-500">
                  Iniciar Trial
                </Button>
                <Button variant="outline" onClick={() => setShowStartModal(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Extender Trial */}
      {showExtendModal && selectedTrial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Extender Trial</h3>
            <p className="text-sm text-gray-600 mb-4">
              Empresa: <strong>{selectedTrial.company_name}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Días adicionales</label>
                <input
                  type="number"
                  value={extendDays}
                  onChange={(e) => setExtendDays(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                  max="30"
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleExtend} className="flex-1 bg-blue-600">
                  Extender
                </Button>
                <Button variant="outline" onClick={() => setShowExtendModal(false)} className="flex-1">
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