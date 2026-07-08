'use client'

import { useEffect, useState } from 'react'
import { getSalesStats, exportToCSV } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  Download,
  Loader2,
  Calendar
} from 'lucide-react'
import Link from 'next/link'

export default function StatsPage() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7days' | '30days' | '3months'>('7days')
  const [stats, setStats] = useState<any>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    loadStats()
  }, [period])

  async function loadStats() {
    setLoading(true)
    const result = await getSalesStats(period)
    if (result.success && result.stats) {
      setStats(result.stats)
    }
    setLoading(false)
  }

  async function handleExport() {
    setExporting(true)
    const result = await exportToCSV(period)
    if (result.success && result.csv) {
      // Descargar CSV
      const blob = new Blob([result.csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ventas-${period}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    }
    setExporting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">No hay datos disponibles</p>
      </div>
    )
  }

  // Convertir salesByDay a array para el gráfico
  const chartData = Object.entries(stats.salesByDay).map(([date, amount]: [string, any]) => ({
    date,
    amount: amount as number
  }))

  const maxAmount = Math.max(...chartData.map(d => d.amount), 1)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Estadísticas de Ventas</h1>
              <p className="text-sm text-gray-600">Métricas y análisis de tu negocio</p>
            </div>
          </div>
          <Button onClick={handleExport} disabled={exporting} variant="outline">
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportar CSV
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* Filtros de Período */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Período:</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant={period === '7days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('7days')}
              >
                Últimos 7 días
              </Button>
              <Button
                variant={period === '30days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('30days')}
              >
                Últimos 30 días
              </Button>
              <Button
                variant={period === '3months' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('3months')}
              >
                Últimos 3 meses
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards Principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Ingresos Totales</p>
                  <p className="text-3xl font-bold text-green-600">
                    ${stats.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Pedidos</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalOrders}</p>
                </div>
                <ShoppingCart className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Ticket Promedio</p>
                  <p className="text-3xl font-bold text-purple-600">
                    ${stats.averageTicket.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Productos Vendidos</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {stats.topProducts.reduce((sum: number, p: any) => sum + p.quantity, 0)}
                  </p>
                </div>
                <Package className="w-10 h-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Ventas por Día */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📈 Ventas por Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chartData.map((day, index) => (
                <div key={index} className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-20">{day.date}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-orange-600 h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                      style={{ width: `${(day.amount / maxAmount) * 100}%` }}
                    >
                      <span className="text-white text-sm font-medium">
                        ${day.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Productos Más Vendidos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🏆 Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topProducts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay ventas registradas</p>
              ) : (
                stats.topProducts.map((product: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' :
                        'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">
                      {product.quantity} unidades
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pedidos por Estado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📋 Pedidos por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Pendientes de Pago</p>
                <p className="text-2xl font-bold text-gray-900">{stats.ordersByStatus.pending}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600">En Revisión</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.ordersByStatus.review}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Aprobados</p>
                <p className="text-2xl font-bold text-green-600">{stats.ordersByStatus.approved}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">En Preparación</p>
                <p className="text-2xl font-bold text-blue-600">{stats.ordersByStatus.in_preparation}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Listos</p>
                <p className="text-2xl font-bold text-purple-600">{stats.ordersByStatus.ready}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Entregados</p>
                <p className="text-2xl font-bold text-green-600">{stats.ordersByStatus.delivered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}