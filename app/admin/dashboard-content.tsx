'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Store, 
  TrendingUp, 
  AlertCircle, 
  DollarSign,
  ArrowUpRight,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'

interface DashboardContentProps {
  stats: {
    total_companies: number
    active_companies: number
    pending_upgrades: number
    monthly_revenue: number
  }
  recentCompanies: any[]
  pendingCount: number
  planDistribution: any[]
  revenueHistory: any[]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-VE', { 
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export default function DashboardContent({ 
  stats, 
  recentCompanies, 
  pendingCount,
  planDistribution,
  revenueHistory 
}: DashboardContentProps) {
  
  const statCards = [
    {
      title: 'Total Tiendas',
      value: stats.total_companies,
      icon: Store,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'Tiendas Activas',
      value: stats.active_companies,
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      trend: '+5%',
      trendUp: true
    },
    {
      title: 'Upgrades Pendientes',
      value: stats.pending_upgrades,
      icon: Clock,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      trend: pendingCount > 0 ? `${pendingCount} nuevos` : 'Al día',
      trendUp: pendingCount === 0
    },
    {
      title: 'Ingresos Mensuales',
      value: formatCurrency(stats.monthly_revenue),
      icon: DollarSign,
      bgColor: 'bg-violet-50',
      iconColor: 'text-violet-600',
      trend: '+18%',
      trendUp: true
    },
  ]

  const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Resumen general de tu plataforma</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800 gap-1">
            <Activity className="w-3 h-3" />
            Sistema activo
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <span className={`text-xs font-medium ${stat.trendUp ? 'text-green-600' : 'text-amber-600'}`}>
                  {stat.trend}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de Planes */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Store className="w-5 h-5 text-gray-600" />
              Distribución de Planes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {planDistribution.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Sin datos disponibles</p>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {planDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {planDistribution.map((item: any, index: number) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-600">{item.name}:</span>
                      <span className="text-sm font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historial de Ingresos */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              Ingresos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {revenueHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Sin datos disponibles</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={revenueHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tiendas Recientes y Actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tiendas Recientes */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-gray-50/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-600" />
                Tiendas Recientes
              </CardTitle>
              <Link 
                href="/admin/tiendas"
                className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
              >
                Ver todas
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentCompanies.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Store className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No hay tiendas registradas aún</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentCompanies.map((company: any) => (
                  <div key={company.company_id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                          <Store className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{company.name}</p>
                          <p className="text-sm text-gray-500">/{company.slug} • {company.owner_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={
                          company.plan === 'enterprise' 
                            ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white'
                            : company.plan === 'pro'
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }>
                          {company.plan.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatDate(company.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas y Notificaciones */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-gray-600" />
              Alertas y Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {pendingCount > 0 && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-900">Upgrades pendientes</p>
                  <p className="text-sm text-amber-700">
                    Tienes {pendingCount} solicitud(es) de upgrade esperando aprobación
                  </p>
                  <Link 
                    href="/admin/suscripciones"
                    className="text-sm text-amber-800 font-medium hover:underline mt-1 inline-block"
                  >
                    Revisar ahora →
                  </Link>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">Usuarios activos</p>
                <p className="text-sm text-blue-700">
                  {stats.active_companies} tiendas activas en la plataforma
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-900">Ingresos del mes</p>
                <p className="text-sm text-green-700">
                  {formatCurrency(stats.monthly_revenue)} generados este mes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}