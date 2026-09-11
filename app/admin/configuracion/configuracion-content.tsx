'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Settings, 
  DollarSign, 
  Save, 
  History, 
  TrendingUp,
  Package,
  Mail,
  Shield,
  Database,
  Edit3,
  Check,
  X,
  AlertCircle
} from 'lucide-react'
import { adminUpdateSetting, adminUpdatePlan } from '../actions'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-VE', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function ConfiguracionContent({ 
  settings, 
  plans, 
  stats, 
  changeLog,
  adminEmail 
}: {
  settings: any[]
  plans: any[]
  stats: any
  changeLog: any[]
  adminEmail: string
}) {
  const [activeTab, setActiveTab] = useState<'settings' | 'plans' | 'history'>('settings')
  const [settingsCategory, setSettingsCategory] = useState<string>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [saving, setSaving] = useState<string | null>(null)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [planFormData, setPlanFormData] = useState<any>(null)
  const [featuresText, setFeaturesText] = useState<string>('')
  const [limitsText, setLimitsText] = useState<string>('')

  const categories = [
    { id: 'all', label: 'Todas', icon: Settings },
    { id: 'general', label: 'General', icon: Settings },
    { id: 'billing', label: 'Facturación', icon: DollarSign },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'limits', label: 'Límites', icon: Shield },
  ]

  const filteredSettings = settings.filter((s: any) => 
    settingsCategory === 'all' || s.category === settingsCategory
  )

  const groupedSettings = filteredSettings.reduce((acc: any, setting: any) => {
    if (!acc[setting.category]) acc[setting.category] = []
    acc[setting.category].push(setting)
    return acc
  }, {})

  const handleEditSetting = (setting: any) => {
    setEditingId(setting.key)
    setEditValue(setting.value)
  }

  const handleSaveSetting = async (key: string) => {
    setSaving(key)
    const result = await adminUpdateSetting(key, editValue)
    setSaving(null)
    if (result.error) {
      alert('❌ ' + result.error)
    } else {
      alert('✅ Variable actualizada')
      setEditingId(null)
      window.location.reload()
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan.plan_key)
    setPlanFormData({ ...plan })
    setFeaturesText(Array.isArray(plan.features) ? plan.features.join('\n') : '')
    setLimitsText(JSON.stringify(plan.limits, null, 2))
  }

  const handleSavePlan = async () => {
    if (!planFormData) return
    setSaving(planFormData.plan_key)
    
    const featuresArray = featuresText.split('\n').filter(f => f.trim())
    let limitsObj = {}
    try {
      limitsObj = JSON.parse(limitsText)
    } catch (e) {
      alert(' Límites en formato JSON inválido')
      setSaving(null)
      return
    }

    const result = await adminUpdatePlan({
      ...planFormData,
      features: featuresArray,
      limits: limitsObj
    })
    
    setSaving(null)
    if (result.error) {
      alert('❌ ' + result.error)
    } else {
      alert('✅ Plan actualizado')
      setEditingPlan(null)
      window.location.reload()
    }
  }

  const tabs = [
    { id: 'settings', label: 'Variables del Sistema', icon: Database, count: settings.length },
    { id: 'plans', label: 'Planes y Precios', icon: Package, count: plans.length },
    { id: 'history', label: 'Historial de Cambios', icon: History, count: changeLog.length },
  ]

  const renderInput = (setting: any) => {
    if (setting.value_type === 'boolean') {
      return (
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="true">Sí / Activo</option>
          <option value="false">No / Inactivo</option>
        </select>
      )
    }
    
    if (setting.value_type === 'number') {
      return (
        <input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      )
    }

    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración Avanzada</h1>
        <p className="text-gray-600 mt-1">Personaliza planes, precios y variables del sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Variables</p>
              <p className="text-2xl font-bold">{stats.total_settings || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Planes Activos</p>
              <p className="text-2xl font-bold">{stats.active_plans || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <History className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Cambios</p>
              <p className="text-2xl font-bold">{stats.total_changes || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Cambios Hoy</p>
              <p className="text-2xl font-bold">{stats.changes_today || 0}</p>
            </div>
          </CardContent>
        </Card>
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

      {/* Tab: Variables del Sistema */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          {/* Filtros de categoría */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSettingsCategory(cat.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  settingsCategory === cat.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* Variables agrupadas */}
          {Object.entries(groupedSettings).map(([category, categorySettings]: [string, any]) => (
            <Card key={category} className="border-0 shadow-sm">
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="text-base capitalize flex items-center gap-2">
                  {(() => {
                    const CategoryIcon = categories.find(c => c.id === category)?.icon || Settings
                    return <CategoryIcon className="w-5 h-5" />
                  })()}
                  {category === 'general' ? 'General' : 
                   category === 'billing' ? 'Facturación' :
                   category === 'email' ? 'Email' :
                   category === 'limits' ? 'Límites' : category}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {(categorySettings as any[]).map((setting: any) => (
                    <div key={setting.key} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-mono text-sm font-semibold text-gray-900">{setting.key}</p>
                            {setting.is_public && (
                              <Badge className="bg-green-100 text-green-800 text-xs">Pública</Badge>
                            )}
                            <Badge className="bg-gray-100 text-gray-700 text-xs">{setting.value_type}</Badge>
                          </div>
                          {setting.description && (
                            <p className="text-xs text-gray-500 mt-1">{setting.description}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 flex-1 max-w-md">
                          {editingId === setting.key ? (
                            <div className="flex items-center gap-2 flex-1">
                              {renderInput(setting)}
                              <Button
                                size="sm"
                                onClick={() => handleSaveSetting(setting.key)}
                                disabled={saving === setting.key}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {saving === setting.key ? '...' : <Check className="w-4 h-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={saving === setting.key}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 px-3 py-2 bg-gray-50 rounded-lg font-mono text-sm truncate">
                                {setting.value_type === 'boolean' 
                                  ? (setting.value === 'true' ? '✅ Sí' : '❌ No')
                                  : setting.value || <span className="text-gray-400">—</span>
                                }
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditSetting(setting)}
                                className="text-blue-600 border-blue-300"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tab: Planes y Precios */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          {plans.map((plan: any) => (
            <Card key={plan.plan_key} className="border-0 shadow-sm">
              <CardHeader className="border-b bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {plan.display_name}
                    {plan.is_featured && (
                      <Badge className="bg-amber-100 text-amber-800">⭐ Destacado</Badge>
                    )}
                    <Badge className={plan.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {plan.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </CardTitle>
                  {!editingPlan && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditPlan(plan)}
                      className="text-blue-600 border-blue-300"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {editingPlan === plan.plan_key && planFormData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Nombre display</label>
                        <input
                          type="text"
                          value={planFormData.display_name}
                          onChange={(e) => setPlanFormData({...planFormData, display_name: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Precio USD</label>
                        <input
                          type="number"
                          step="0.01"
                          value={planFormData.price_usd}
                          onChange={(e) => setPlanFormData({...planFormData, price_usd: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Ciclo de facturación</label>
                        <select
                          value={planFormData.billing_cycle}
                          onChange={(e) => setPlanFormData({...planFormData, billing_cycle: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="monthly">Mensual</option>
                          <option value="quarterly">Trimestral</option>
                          <option value="yearly">Anual</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Duración (días)</label>
                        <input
                          type="number"
                          value={planFormData.duration_days}
                          onChange={(e) => setPlanFormData({...planFormData, duration_days: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Color</label>
                        <select
                          value={planFormData.color}
                          onChange={(e) => setPlanFormData({...planFormData, color: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="gray">Gris</option>
                          <option value="amber">Ámbar</option>
                          <option value="violet">Violeta</option>
                          <option value="blue">Azul</option>
                          <option value="green">Verde</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Orden</label>
                        <input
                          type="number"
                          value={planFormData.sort_order}
                          onChange={(e) => setPlanFormData({...planFormData, sort_order: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Activo</label>
                        <select
                          value={planFormData.is_active ? 'true' : 'false'}
                          onChange={(e) => setPlanFormData({...planFormData, is_active: e.target.value === 'true'})}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="true">Sí</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Destacado</label>
                        <select
                          value={planFormData.is_featured ? 'true' : 'false'}
                          onChange={(e) => setPlanFormData({...planFormData, is_featured: e.target.value === 'true'})}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="true">Sí</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Descripción</label>
                      <input
                        type="text"
                        value={planFormData.description || ''}
                        onChange={(e) => setPlanFormData({...planFormData, description: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Características (una por línea)</label>
                      <textarea
                        value={featuresText}
                        onChange={(e) => setFeaturesText(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                        rows={6}
                        placeholder="Catálogo básico&#10;20 productos&#10;5 categorías"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Límites (JSON)</label>
                      <textarea
                        value={limitsText}
                        onChange={(e) => setLimitsText(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                        rows={4}
                        placeholder='{"products": 20, "categories": 5}'
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button onClick={handleSavePlan} disabled={saving === plan.plan_key} className="flex-1 bg-orange-500">
                        {saving === plan.plan_key ? 'Guardando...' : 'Guardar cambios'}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingPlan(null)} className="flex-1">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Precio</p>
                        <p className="text-lg font-bold text-gray-900">${plan.price_usd}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Ciclo</p>
                        <p className="text-sm font-semibold text-gray-900 capitalize">
                          {plan.billing_cycle === 'monthly' ? 'Mensual' : 
                           plan.billing_cycle === 'quarterly' ? 'Trimestral' : 'Anual'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Duración</p>
                        <p className="text-lg font-bold text-gray-900">{plan.duration_days} días</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Orden</p>
                        <p className="text-lg font-bold text-gray-900">#{plan.sort_order}</p>
                      </div>
                    </div>

                    {plan.description && (
                      <p className="text-sm text-gray-600 italic">"{plan.description}"</p>
                    )}

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Características:</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(plan.features) && plan.features.map((feature: string, i: number) => (
                          <Badge key={i} className="bg-blue-50 text-blue-700 border border-blue-200">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Límites:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {plan.limits && Object.entries(plan.limits).map(([key, value]: [string, any]) => (
                          <div key={key} className="p-2 bg-gray-50 rounded text-xs">
                            <span className="text-gray-500">{key}:</span>{' '}
                            <span className="font-semibold">{value === -1 ? '' : value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tab: Historial de Cambios */}
      {activeTab === 'history' && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historial de Cambios Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {changeLog.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No hay cambios registrados</p>
              </div>
            ) : (
              <div className="divide-y">
                {changeLog.map((log: any) => (
                  <div key={log.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        log.change_type === 'setting_update' ? 'bg-blue-50' :
                        log.change_type === 'plan_update' ? 'bg-purple-50' : 'bg-gray-50'
                      }`}>
                        {log.change_type === 'setting_update' ? <Settings className="w-5 h-5 text-blue-600" /> :
                         log.change_type === 'plan_update' ? <Package className="w-5 h-5 text-purple-600" /> :
                         <AlertCircle className="w-5 h-5 text-gray-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className={
                            log.change_type === 'setting_update' ? 'bg-blue-100 text-blue-800' :
                            log.change_type === 'plan_update' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {log.change_type === 'setting_update' ? 'Variable' : 
                             log.change_type === 'plan_update' ? 'Plan' : 'Config'}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            por <strong>{log.changed_by_email || adminEmail}</strong>
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">
                          {log.change_type === 'setting_update' && (
                            <>Variable <code className="bg-gray-100 px-1 rounded">{log.new_value?.key}</code> actualizada</>
                          )}
                          {log.change_type === 'plan_update' && (
                            <>Plan <strong>{log.new_value?.display_name}</strong> actualizado a ${log.new_value?.price_usd}</>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(log.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}