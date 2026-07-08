'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search, Edit, Trash2, Package, X, Crown } from 'lucide-react'
import Link from 'next/link'
import { deleteProduct } from './actions'

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [plan, setPlan] = useState('free')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    loadData()
    loadPlan()
  }, [])

  async function loadPlan() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: company } = await supabase
      .from('companies')
      .select('plan')
      .eq('owner_id', user.id)
      .single()

    if (company) setPlan(company.plan)
  }

  async function loadData() {
    const supabase = createClient()

    const { data: productsData } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name,
          color
        )
      `)
      .order('created_at', { ascending: false })

    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (productsData) setProducts(productsData)
    if (categoriesData) setCategories(categoriesData)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return

    const result = await deleteProduct(id)
    if (result.error) {
      alert(result.error)
    } else {
      loadData()
      loadPlan()
    }
  }

  function handleNewProductClick() {
    const planLimits: any = {
      free: 10,
      pro: 100,
      enterprise: 999999,
    }
    const limit = planLimits[plan] || 10

    if (products.length >= limit) {
      setShowUpgradeModal(true)
    } else {
      window.location.href = '/dashboard/products/new'
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const planLimits: any = {
    free: 10,
    pro: 100,
    enterprise: 999999,
  }
  const limit = planLimits[plan] || 10
  const isAtLimit = products.length >= limit

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando productos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Productos</h1>
            <p className="text-sm text-gray-600">
              Gestiona tu catálogo • 
              <span className={`font-medium ${isAtLimit ? 'text-red-600' : 'text-orange-600'}`}>
                {' '}{products.length}/{limit === 999999 ? '∞' : limit} productos
              </span>
            </p>
          </div>
          <Button 
            className="gap-2 bg-orange-500 hover:bg-orange-600"
            onClick={handleNewProductClick}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Producto</span>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Alerta de límite alcanzado */}
        {isAtLimit && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded-r-lg">
            <div className="flex items-start gap-3">
              <Crown className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">Límite de productos alcanzado</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Has alcanzado el límite de {limit} productos de tu plan {plan.toUpperCase()}. 
                  Actualiza a Pro para agregar más productos y desbloquear funciones avanzadas.
                </p>
                <Button
                  size="sm"
                  className="mt-2 bg-orange-500 hover:bg-orange-600"
                  onClick={() => setShowUpgradeModal(true)}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Actualizar a Pro
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Filtros y Búsqueda */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Productos */}
        {filteredProducts.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay productos
            </h3>
            <p className="text-gray-600 mb-4">
              {products.length === 0 
                ? "Comienza creando tu primer producto" 
                : "No se encontraron productos con esos filtros"}
            </p>
            {products.length === 0 && (
              <Button 
                className="gap-2 bg-orange-500 hover:bg-orange-600"
                onClick={handleNewProductClick}
              >
                <Plus className="w-4 h-4" />
                Crear Producto
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <Card key={product.id} className="overflow-hidden">
                {product.images && product.images[0] ? (
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">
                      {product.name}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      product.stock > 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.stock > 0 ? `Stock: ${product.stock}` : 'Agotado'}
                    </span>
                  </div>
                  
                  {product.categories && (
                    <p className="text-sm text-gray-600 mb-2">
                      {product.categories.name}
                    </p>
                  )}
                  
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                    {product.description || 'Sin descripción'}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-orange-600">
                      ${product.price_usd.toFixed(2)}
                    </span>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/products/${product.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* MODAL DE UPGRADE */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* Header con gradiente */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white relative">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">¡Límite Alcanzado!</h2>
                  <p className="text-sm text-white/90">Plan {plan.toUpperCase()}</p>
                </div>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Has alcanzado el límite de <strong>{limit} productos</strong> de tu plan actual.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Con el Plan Pro obtienes:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span><strong>100 productos</strong> (10x más)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Sin branding de tuVentaApp</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Estadísticas avanzadas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Soporte prioritario</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Personalización completa</span>
                  </li>
                </ul>
              </div>

              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">Solo</p>
                <p className="text-3xl font-bold text-orange-600">$15<span className="text-sm text-gray-600">/mes</span></p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowUpgradeModal(false)}
                >
                  Ahora no
                </Button>
                <Link href="/dashboard/plans" className="flex-1">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600">
                    <Crown className="w-4 h-4 mr-2" />
                    Ver Planes
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}