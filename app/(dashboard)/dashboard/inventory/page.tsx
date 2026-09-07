'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPlan } from '@/lib/plans'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  XCircle,
  DollarSign,
  Search,
  Edit2,
  Loader2,
  Crown,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Layers,
  Box,
} from 'lucide-react'
import Link from 'next/link'

interface ProductVariant {
  color_hex: string
  id: string
  product_id: string
  color: string
  size: string
  stock: number
  price_usd: number
  is_active: boolean
  images?: string[]
}

interface Product {
  id: string
  name: string
  description: string
  price_usd: number
  stock: number
  stock_minimo: number
  is_active: boolean
  images: string[]
  company_id: string
  category_id?: string
  category_name?: string
  variants?: ProductVariant[]
  total_stock?: number
  total_value?: number
}

type FilterStatus = 'all' | 'ok' | 'low' | 'out'

export default function InventoryPage() {
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [planId, setPlanId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)

  const [stats, setStats] = useState({
    total_products: 0,
    total_variants: 0,
    total_stock: 0,
    low_stock: 0,
    out_of_stock: 0,
    total_value: 0,
  })

  useEffect(() => {
    loadInventory()
  }, [])

  async function loadInventory() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: company } = await supabase
      .from('companies')
      .select('id, plan')
      .eq('owner_id', user.id)
      .single()

    if (!company) {
      setLoading(false)
      return
    }

    setCompanyId(company.id)
    setPlanId(company.plan || 'free')

    // Cargar productos
    const { data: productsData } = await supabase
      .from('products')
      .select(`
        *,
        categories (name)
      `)
      .eq('company_id', company.id)
      .order('name')

    if (!productsData) {
      setLoading(false)
      return
    }

    // Cargar variantes
    const productIds = productsData.map((p: any) => p.id)
    let variantsMap: Record<string, ProductVariant[]> = {}

    if (productIds.length > 0) {
      const { data: variantsData } = await supabase
        .from('product_variants')
        .select('*')
        .in('product_id', productIds)
        .order('color')

      if (variantsData) {
        variantsData.forEach((v: any) => {
          const images = Array.isArray(v.images)
            ? v.images
            : typeof v.images === 'string' && v.images
            ? JSON.parse(v.images)
            : []
          if (!variantsMap[v.product_id]) variantsMap[v.product_id] = []
          variantsMap[v.product_id].push({ ...v, images })
        })
      }
    }

    // Enriquecer productos
    const enriched: Product[] = productsData.map((p: any) => {
      const variants = variantsMap[p.id] || []
      const variantStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0)
      const totalStock = (p.stock || 0) + variantStock
      const totalValue = totalStock * (p.price_usd || 0)

      return {
        ...p,
        category_name: p.categories?.name,
        variants,
        total_stock: totalStock,
        total_value: totalValue,
        stock_minimo: p.stock_minimo ?? 5,
      }
    })

    setProducts(enriched)
    recalcStats(enriched)
    setLoading(false)
  }

  function recalcStats(data: Product[]) {
    const totalProducts = data.length
    const totalVariants = data.reduce((sum, p) => sum + (p.variants?.length || 0), 0)
    const totalStock = data.reduce((sum, p) => sum + (p.total_stock || 0), 0)
    const totalValue = data.reduce((sum, p) => sum + (p.total_value || 0), 0)
    const lowStock = data.filter(p => p.total_stock! > 0 && p.total_stock! <= p.stock_minimo).length
    const outOfStock = data.filter(p => p.total_stock === 0).length

    setStats({
      total_products: totalProducts,
      total_variants: totalVariants,
      total_stock: totalStock,
      low_stock: lowStock,
      out_of_stock: outOfStock,
      total_value: totalValue,
    })
  }

  async function updateStockMinimo(productId: string, value: number) {
    if (!companyId) return
    setSavingId(productId)
    const supabase = createClient()

    const { error } = await supabase
      .from('products')
      .update({ stock_minimo: value })
      .eq('id', productId)
      .eq('company_id', companyId)

    if (!error) {
      setProducts(prev => {
        const updated = prev.map(p =>
          p.id === productId ? { ...p, stock_minimo: value } : p
        )
        recalcStats(updated)
        return updated
      })
    }
    setSavingId(null)
  }

  async function toggleProductActive(productId: string, current: boolean) {
    if (!companyId) return
    setSavingId(productId)
    const supabase = createClient()

    const { error } = await supabase
      .from('products')
      .update({ is_active: !current })
      .eq('id', productId)
      .eq('company_id', companyId)

    if (!error) {
      setProducts(prev =>
        prev.map(p =>
          p.id === productId ? { ...p, is_active: !current } : p
        )
      )
    }
    setSavingId(null)
  }

  function toggleExpand(productId: string) {
    setExpandedProducts(prev => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.variants?.some(v => v.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           v.size.toLowerCase().includes(searchTerm.toLowerCase()))

    if (filterStatus === 'all') return matchesSearch
    if (filterStatus === 'out') return matchesSearch && p.total_stock === 0
    if (filterStatus === 'low') return matchesSearch && p.total_stock! > 0 && p.total_stock! <= p.stock_minimo
    if (filterStatus === 'ok') return matchesSearch && p.total_stock! > p.stock_minimo
    return matchesSearch
  })

  const plan = getPlan(planId)
  const premiumLocked = !!planId && !plan.advancedStats

  if (premiumLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sección del Plan Pro</h2>
          <p className="text-gray-600 mb-6">
            Ventas, Clientes e Inventario son funciones avanzadas disponibles desde el <strong>Plan Pro</strong>.
          </p>
          <Link href="/dashboard/plans">
            <Button className="bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:opacity-90">
              <Crown className="w-4 h-4 mr-2" />
              Ver Planes
            </Button>
          </Link>
        </div>
      </div>
    )
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Inventario Inteligente</h1>
            <p className="text-sm text-gray-600">Control de stock, variantes y alertas en tiempo real</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Productos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_products}</p>
                </div>
                <Box className="w-6 h-6 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Variantes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_variants}</p>
                </div>
                <Layers className="w-6 h-6 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Stock Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_stock}</p>
                </div>
                <Package className="w-6 h-6 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className={stats.low_stock > 0 ? 'border-yellow-400' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-600" />
                    Stock Bajo
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{stats.low_stock}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={stats.out_of_stock > 0 ? 'border-red-400' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-red-600" />
                    Sin Stock
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{stats.out_of_stock}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Valor Total</p>
                  <p className="text-xl font-bold text-gray-900">${stats.total_value.toFixed(2)}</p>
                </div>
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar producto, color o talla..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {([
              { key: 'all', label: 'Todos', color: 'bg-gray-100 text-gray-700' },
              { key: 'ok', label: 'Stock OK', color: 'bg-green-100 text-green-700' },
              { key: 'low', label: 'Stock Bajo', color: 'bg-yellow-100 text-yellow-700' },
              { key: 'out', label: 'Sin Stock', color: 'bg-red-100 text-red-700' },
            ] as { key: FilterStatus; label: string; color: string }[]).map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  filterStatus === f.key
                    ? 'ring-2 ring-orange-500 bg-white shadow-sm'
                    : f.color
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 w-10"></th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Producto</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Stock Total</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Stock Mín.</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Disp.</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Precio</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Valor</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProducts.map(product => {
                    const isOutOfStock = product.total_stock === 0
                    const isLowStock = product.total_stock! > 0 && product.total_stock! <= product.stock_minimo
                    const isExpanded = expandedProducts.has(product.id)
                    const hasVariants = (product.variants?.length || 0) > 0

                    return (
                      <>
                        <tr
                          key={product.id}
                          className={`hover:bg-gray-50 transition-colors ${
                            isOutOfStock ? 'bg-red-50/30' : isLowStock ? 'bg-yellow-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            {hasVariants && (
                              <button
                                onClick={() => toggleExpand(product.id)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {product.images?.[0] ? (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="w-10 h-10 rounded-lg object-cover border"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center border">
                                  <Package className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{product.name}</p>
                                {product.category_name && (
                                  <p className="text-xs text-gray-500">{product.category_name}</p>
                                )}
                                {hasVariants && (
                                  <p className="text-xs text-gray-400">{product.variants!.length} variantes</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${
                                isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-gray-900'
                              }`}>
                                {product.total_stock}
                              </span>
                              {product.stock > 0 && hasVariants && (
                                <span className="text-xs text-gray-400">
                                  ({product.stock} padre)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                defaultValue={product.stock_minimo}
                                className="w-20 h-8 text-sm"
                                min="0"
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value) || 0
                                  if (val !== product.stock_minimo) {
                                    updateStockMinimo(product.id, val)
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = parseInt((e.target as HTMLInputElement).value) || 0
                                    if (val !== product.stock_minimo) {
                                      updateStockMinimo(product.id, val)
                                    }
                                  }
                                }}
                              />
                              {savingId === product.id && (
                                <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => toggleProductActive(product.id, product.is_active)}
                              disabled={savingId === product.id}
                              className="transition-opacity hover:opacity-80 disabled:opacity-50"
                              title={product.is_active ? 'Desactivar producto' : 'Activar producto'}
                            >
                              {product.is_active ? (
                                <ToggleRight className="w-7 h-7 text-green-500" />
                              ) : (
                                <ToggleLeft className="w-7 h-7 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            {isOutOfStock ? (
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-0">
                                Sin Stock
                              </Badge>
                            ) : isLowStock ? (
                              <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-0">
                                Stock Bajo
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0">
                                Stock OK
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-gray-900 font-medium">${product.price_usd.toFixed(2)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-gray-900">${(product.total_value || 0).toFixed(2)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/dashboard/products/${product.id}/edit`}>
                              <Button variant="outline" size="sm" className="h-8">
                                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                                Editar
                              </Button>
                            </Link>
                          </td>
                        </tr>

                        {/* Variants sub-table */}
                        {isExpanded && hasVariants && (
                          <tr>
                            <td colSpan={9} className="bg-gray-50/50 px-4 py-2">
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left py-2 px-3 font-medium text-gray-500 w-10">#</th>
                                      <th className="text-left py-2 px-3 font-medium text-gray-500">Variante</th>
                                      <th className="text-left py-2 px-3 font-medium text-gray-500">Color</th>
                                      <th className="text-left py-2 px-3 font-medium text-gray-500">Talla</th>
                                      <th className="text-left py-2 px-3 font-medium text-gray-500">Stock</th>
                                      <th className="text-left py-2 px-3 font-medium text-gray-500">Estado</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {product.variants!.map((variant, idx) => (
                                      <tr key={variant.id} className="border-b border-gray-100 last:border-0">
                                        <td className="py-2 px-3 text-gray-400">{idx + 1}</td>
                                        <td className="py-2 px-3">
                                          <div className="flex items-center gap-2">
                                            {variant.images?.[0] ? (
                                              <img
                                                src={variant.images[0]}
                                                alt={variant.color}
                                                className="w-6 h-6 rounded object-cover"
                                              />
                                            ) : (
                                              <div className="w-6 h-6 rounded bg-gray-200" />
                                            )}
                                            <span className="text-gray-700">{variant.color} / {variant.size}</span>
                                          </div>
                                        </td>
                                        <td className="py-2 px-3">
                                          <span className="inline-flex items-center gap-1.5">
                                            <span
                                              className="w-3 h-3 rounded-full border border-gray-300"
                                              style={{ backgroundColor: variant.color_hex || '#ccc' }}
                                            />
                                            {variant.color}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-gray-700">{variant.size || '—'}</td>
                                        <td className="py-2 px-3">
                                          <span className={`font-semibold ${
                                            variant.stock === 0 ? 'text-red-600' : variant.stock <= 3 ? 'text-yellow-600' : 'text-gray-900'
                                          }`}>
                                            {variant.stock}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3">
                                          {variant.stock === 0 ? (
                                            <span className="text-red-600 font-medium">Agotado</span>
                                          ) : variant.stock <= 3 ? (
                                            <span className="text-yellow-600 font-medium">Bajo</span>
                                          ) : (
                                            <span className="text-green-600 font-medium">OK</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No se encontraron productos</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}