'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  Users,
  Copy,
  Check,
  Crown,
  Loader2,
  CopyCheck
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState<any>(null)
  const [stats, setStats] = useState({
    productsCount: 0,
    ordersCount: 0,
    categoriesCount: 0,
    totalRevenue: 0,
  })
  const [copied, setCopied] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    loadData()
  }, [])

  async function loadData() {
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

      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyData.id)

      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyData.id)

      const { count: categoriesCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyData.id)

      const { data: orders } = await supabase
        .from('orders')
        .select('total_usd')
        .eq('company_id', companyData.id)
        .in('status', ['payment_approved', 'in_preparation', 'ready', 'delivered'])

      const totalRevenue = orders?.reduce((sum, o) => sum + o.total_usd, 0) || 0

      setStats({
        productsCount: productsCount || 0,
        ordersCount: ordersCount || 0,
        categoriesCount: categoriesCount || 0,
        totalRevenue,
      })
    }
    setLoading(false)
  }

  async function copyLink() {
    if (!company) return
    const url = `${window.location.origin}/${company.slug}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading || !isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!company) return null

  const planLimits: any = { free: 10, pro: 100, enterprise: 999999 }
  const limit = planLimits[company.plan] || 10

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Vista general de tu negocio</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/customers">
            <Button variant="outline" className="gap-2">
              <Users className="w-4 h-4" />
              Afiliados
            </Button>
          </Link>
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2">
            <span className="text-sm text-gray-700">Copia el link para compartir tu catálogo →</span>
            <code className="text-sm font-mono text-orange-600">/{company.slug}</code>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={copyLink}
              className="gap-1"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Período de Prueba (si aplica) */}
      {company.plan === 'free' && (
        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Período de prueba activo</h3>
                <p className="text-sm text-gray-600">Te quedan 14 días de prueba gratuita</p>
              </div>
            </div>
            <Link href="/dashboard/plans">
              <Button className="bg-gray-900 hover:bg-gray-800">
                Ver planes
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Ventas Totales</span>
              <DollarSign className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">{stats.ordersCount} pedidos realizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Producto Más Vendido</span>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-gray-500 mt-1">N/A</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Productos Activos</span>
              <Package className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold">{stats.productsCount}</p>
            <p className="text-sm text-gray-500 mt-1">Disponibles en catálogo</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Categorías</span>
              <Package className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold">{stats.categoriesCount}</p>
            <p className="text-sm text-gray-500 mt-1">Activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Plan Actual</span>
              <Crown className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold capitalize">{company.plan}</p>
            <Link href="/dashboard/plans">
              <p className="text-sm text-orange-600 mt-1 hover:underline cursor-pointer">
                Ver planes →
              </p>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4">Accesos Rápidos</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/products/new">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <Package className="w-6 h-6" />
                  <span className="text-xs">Nuevo Producto</span>
                </Button>
              </Link>
              <Link href="/dashboard/orders">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <ShoppingCart className="w-6 h-6" />
                  <span className="text-xs">Ver Pedidos</span>
                </Button>
              </Link>
              <Link href="/dashboard/inventory">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <Package className="w-6 h-6" />
                  <span className="text-xs">Inventario</span>
                </Button>
              </Link>
              <Link href="/dashboard/customers">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <Users className="w-6 h-6" />
                  <span className="text-xs">Clientes</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4">Información de la Empresa</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Nombre:</span>
                <span className="font-medium">{company.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Slug:</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">/{company.slug}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo:</span>
                <span className="font-medium capitalize">{company.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Plan:</span>
                <Badge className="bg-orange-100 text-orange-800 capitalize">{company.plan}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Productos:</span>
                <span className="font-medium">{stats.productsCount}/{limit === 999999 ? '∞' : limit}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}