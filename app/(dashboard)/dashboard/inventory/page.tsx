'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Package, AlertTriangle, XCircle, DollarSign, Search, Edit2, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function InventoryPage() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [stats, setStats] = useState({
    total_products: 0,
    total_stock: 0,
    low_stock: 0,
    out_of_stock: 0,
    total_value: 0,
  })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadInventory()
  }, [])

  async function loadInventory() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!company) return

    // Cargar productos
    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', company.id)
      .order('name')

    if (productsData) {
      setProducts(productsData)
      
      // Calcular estadísticas
      const totalProducts = productsData.length
      const totalStock = productsData.reduce((sum, p) => sum + p.stock, 0)
      const lowStock = productsData.filter(p => p.stock > 0 && p.stock <= (p.stock_minimo || 5)).length
      const outOfStock = productsData.filter(p => p.stock === 0).length
      const totalValue = productsData.reduce((sum, p) => sum + (p.stock * p.price_usd), 0)

      setStats({
        total_products: totalProducts,
        total_stock: totalStock,
        low_stock: lowStock,
        out_of_stock: outOfStock,
        total_value: totalValue,
      })
    }
    setLoading(false)
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
            <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
            <p className="text-sm text-gray-600">Control de stock y alertas</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
              <span className="text-blue-600 text-xs font-bold">i</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">¿Cómo funciona el inventario?</h3>
              <p className="text-sm text-blue-700 mt-1">
                El sistema te alerta automáticamente cuando un producto tiene stock bajo (según el stock mínimo configurado) 
                o está agotado. El valor total se calcula multiplicando el stock por el precio de cada producto.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Productos</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_products}</p>
                </div>
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className={stats.low_stock > 0 ? 'border-yellow-400' : ''}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    Stock Bajo
                  </p>
                  <p className="text-3xl font-bold text-gray-900">{stats.low_stock}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={stats.out_of_stock > 0 ? 'border-red-400' : ''}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <XCircle className="w-4 h-4 text-red-600" />
                    Sin Stock
                  </p>
                  <p className="text-3xl font-bold text-gray-900">{stats.out_of_stock}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                  <p className="text-3xl font-bold text-gray-900">${stats.total_value.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Producto</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Stock</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Stock Mín.</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Disp.</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Precio</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Valor Total</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProducts.map(product => {
                    const stockMinimo = product.stock_minimo || 5
                    const isOutOfStock = product.stock === 0
                    const isLowStock = product.stock > 0 && product.stock <= stockMinimo
                    const totalValue = product.stock * product.price_usd

                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {product.images?.[0] ? (
                              <img 
                                src={product.images[0]} 
                                alt={product.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                <Package className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{product.name}</p>
                              {product.description && (
                                <p className="text-xs text-gray-500 truncate max-w-xs">{product.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-900">{product.stock}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Input
                            type="number"
                            defaultValue={stockMinimo}
                            className="w-20 h-8 text-sm"
                            min="0"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${
                            product.stock > 0 ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              product.stock > 0 ? 'left-5' : 'left-0.5'
                            }`} />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isOutOfStock ? (
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                              Sin Stock
                            </Badge>
                          ) : isLowStock ? (
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                              Stock Bajo
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              Stock OK
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-900">${product.price_usd.toFixed(2)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-900">${totalValue.toFixed(2)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Link href={`/dashboard/products/${product.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Edit2 className="w-4 h-4 mr-2" />
                              Actualizar
                            </Button>
                          </Link>
                        </td>
                      </tr>
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