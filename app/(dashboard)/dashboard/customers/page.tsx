'use client'

import { useEffect, useState } from 'react'
import { getCustomers } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Users, 
  DollarSign, 
  Search, 
  Loader2,
  Phone,
  ShoppingBag,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'

export default function CustomersPage() {
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'with_debt'>('all')
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalRevenue: 0,
    averageSpent: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const result = await getCustomers()
    if (result.success && result.data) {
      setCustomers(result.data)
      
      const totalRevenue = result.data.reduce((sum: number, c: any) => sum + c.totalSpent, 0)
      setStats({
        totalCustomers: result.data.length,
        totalRevenue,
        averageSpent: result.data.length > 0 ? totalRevenue / result.data.length : 0,
      })
    }
    setLoading(false)
  }

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
    
    const matchesFilter = filterType === 'all' || 
      (filterType === 'with_debt' && c.activeInstallments > 0)
    
    return matchesSearch && matchesFilter
  })

  const customersWithDebt = customers.filter(c => c.activeInstallments > 0).length

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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
            <p className="text-sm text-gray-600">Gestiona tu base de clientes</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Clientes</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalCustomers}</p>
                </div>
                <Users className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
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

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Gasto Promedio</p>
                  <p className="text-3xl font-bold text-purple-600">
                    ${stats.averageSpent.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda y Filtros */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar por nombre o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            
            {/* Filtros */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                Todos los clientes ({customers.length})
              </Button>
              <Button
                variant={filterType === 'with_debt' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('with_debt')}
                className={`${customersWithDebt > 0 ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
              >
                💳 Con deuda ({customersWithDebt})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Clientes */}
        {filteredCustomers.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {customers.length === 0 ? 'Sin clientes aún' : 'No se encontraron clientes'}
            </h3>
            <p className="text-gray-600">
              {customers.length === 0 
                ? "Los clientes aparecerán aquí después de realizar su primer pedido"
                : filterType === 'with_debt'
                  ? "No hay clientes con deuda actualmente"
                  : "Intenta con otra búsqueda"}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer, index) => (
              <Card key={customer.phone} className={`hover:shadow-md transition-shadow ${
                customer.activeInstallments > 0 ? 'border-red-300 border-2' : ''
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' :
                        'bg-blue-500'
                      }`}>
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                          {index < 3 && customersWithDebt === 0 && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              {index === 0 ? '🥇 Top' : index === 1 ? '🥈' : '🥉'}
                            </Badge>
                          )}
                          {customer.activeInstallments > 0 && (
                            <Badge className="bg-red-100 text-red-800">
                              💳 Debe
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3" />
                            {customer.totalOrders} pedidos
                          </span>
                        </div>

                        {/* Badge de deuda si tiene apartados activos */}
                        {customer.activeInstallments > 0 && (
                          <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                            <p className="text-xs text-red-800 font-medium">
                              💳 {customer.activeInstallments} apartado(s) activo(s)
                            </p>
                            <p className="text-sm text-red-600 font-bold">
                              Total pendiente: ${customer.totalPending?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total gastado</p>
                      <p className="text-xl font-bold text-orange-600">
                        ${customer.totalSpent.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Último: {new Date(customer.lastOrderDate).toLocaleDateString('es-VE')}
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="mt-3 pt-3 border-t flex gap-2">
                    <Link href={`/dashboard/customers/${encodeURIComponent(customer.phone)}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Ver Historial
                      </Button>
                    </Link>
                    <a 
                      href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full text-green-600">
                        <Phone className="w-4 h-4 mr-2" />
                        WhatsApp
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}