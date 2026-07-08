'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ShoppingCart, Plus, Minus } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  description: string
  price_usd: number
  stock: number
  images: string[]
  category_id: string
  badge?: {
    id: string
    name: string
    color: string
    icon: string
  }
}

interface CartItem {
  product: Product
  quantity: number
}

export default function PublicCatalogPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [company, setCompany] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCatalog()
    const savedCart = localStorage.getItem(`cart_${slug}`)
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (e) {
        console.error('Error loading cart:', e)
      }
    }
  }, [slug])

  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem(`cart_${slug}`, JSON.stringify(cart))
    } else {
      localStorage.removeItem(`cart_${slug}`)
    }
  }, [cart, slug])

  async function loadCatalog() {
    const supabase = createClient()

    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!companyData) {
      setLoading(false)
      return
    }

    setCompany(companyData)

    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .eq('company_id', companyData.id)
      .order('name')

    if (categoriesData) setCategories(categoriesData)

    // Cargar productos con sus badges
    const { data: productsData } = await supabase
      .from('products')
      .select(`
        *,
        product_badges (
          id,
          name,
          color,
          icon
        )
      `)
      .eq('company_id', companyData.id)
      .eq('is_active', true)
      .gt('stock', 0)
      .order('name')

    if (productsData) {
      // Transformar los datos para que el badge sea un objeto directo
      const transformedProducts = productsData.map((p: any) => ({
        ...p,
        badge: p.product_badges?.[0] || null
      }))
      setProducts(transformedProducts)
    }
    setLoading(false)
  }

  function addToCart(product: Product) {
    const existingItem = cart.find(item => item.product.id === product.id)
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { product, quantity: 1 }])
    }
  }

  function removeFromCart(productId: string) {
    const existingItem = cart.find(item => item.product.id === productId)
    
    if (existingItem && existingItem.quantity > 1) {
      setCart(cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ))
    } else {
      setCart(cart.filter(item => item.product.id !== productId))
    }
  }

  function getCartQuantity(productId: string) {
    const item = cart.find(item => item.product.id === productId)
    return item ? item.quantity : 0
  }

  function getCartTotal() {
    return cart.reduce((total, item) => total + (item.product.price_usd * item.quantity), 0)
  }

  function getCartCount() {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category_id === selectedCategory)

  // Función para determinar la clase de fuente
  function getFontClass() {
    switch (company?.font_family) {
      case 'poppins': return 'font-poppins'
      case 'montserrat': return 'font-montserrat'
      case 'playfair': return 'font-playfair'
      case 'serif': return 'font-serif'
      default: return 'font-sans'
    }
  }

  // Función para determinar el grid layout
  function getGridLayout() {
    switch (company?.layout_type) {
      case 'list': return 'grid-cols-1'
      case 'magazine': return 'grid-cols-1 md:grid-cols-2'
      case 'grid':
      default: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando catálogo...</p>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Catálogo no encontrado</h1>
          <p className="text-gray-600">La empresa que buscas no existe o fue desactivada.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 pb-24 ${getFontClass()}`}>
      {/* Header */}
      <header 
        className="sticky top-0 z-10 shadow-md"
        style={{ backgroundColor: company.primary_color || '#F97316' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          {company.logo_url ? (
            <img 
              src={company.logo_url} 
              alt={company.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white"
            />
          ) : (
            <div 
              className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl font-bold"
              style={{ color: company.primary_color || '#F97316' }}>
              {company.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg">{company.name}</h1>
            <p className="text-white/80 text-sm">
              {company.type === 'restaurant' ? '🍽️ Restaurante' : '🛍️ Tienda'}
            </p>
          </div>
        </div>
      </header>

      {/* Filtros de Categoría */}
      <div className="bg-white border-b sticky top-[76px] z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de Productos con Personalización */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay productos disponibles en esta categoría.</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${getGridLayout()}`}>
            {filteredProducts.map(product => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Imagen (si está habilitada) */}
                {company.show_images !== false && (
                  <div className="relative">
                    {product.images && product.images[0] ? (
                      <img 
                        src={product.images[0]} 
                        alt={product.name}
                        className="w-full h-48 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400">Sin imagen</span>
                      </div>
                    )}
                    {/* Badge del producto */}
                    {product.badge && (
                      <div 
                        className="absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-bold text-white shadow-md"
                        style={{ backgroundColor: product.badge.color }}
                      >
                        {product.badge.name}
                      </div>
                    )}
                  </div>
                )}

                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
                  
                  {/* Descripción (si está habilitada) */}
                  {company.show_descriptions !== false && product.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {/* Precio y botón (si los precios están habilitados) */}
                  {company.show_prices !== false ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-orange-600">
                        ${product.price_usd.toFixed(2)}
                      </span>
                      <div className="flex items-center gap-2">
                        {getCartQuantity(product.id) > 0 && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeFromCart(product.id)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="font-medium w-6 text-center">
                              {getCartQuantity(product.id)}
                            </span>
                          </>
                        )}
                        <Button
                          size="sm"
                          onClick={() => addToCart(product)}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Si los precios están ocultos, mostrar solo el botón */
                    <div className="flex items-center gap-2 mt-2">
                      {getCartQuantity(product.id) > 0 && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFromCart(product.id)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="font-medium w-6 text-center">
                            {getCartQuantity(product.id)}
                          </span>
                        </>
                      )}
                      <Button
                        size="sm"
                        onClick={() => addToCart(product)}
                        className="flex-1 bg-orange-500 hover:bg-orange-600"
                      >
                        Agregar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
        
      {/* Carrito Flotante */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-20">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total del pedido</p>
              <p className="text-2xl font-bold text-orange-600">
                ${getCartTotal().toFixed(2)}
              </p>
            </div>
            <Button
              size="lg"
              className="gap-2 bg-orange-500 hover:bg-orange-600"
              onClick={() => router.push(`/${slug}/checkout`)}
            >
              <ShoppingCart className="w-5 h-5" />
              Ver Carrito ({getCartCount()})
            </Button>
          </div>
        </div>
      )}

      {/* Branding para plan gratuito */}
      {company.plan === 'free' && (
        <div className="fixed bottom-20 left-0 right-0 text-center py-2 bg-gray-900/90 text-white text-xs z-10">
          <p>
            Powered by <span className="font-bold text-orange-400">tuVentaApp</span>
            {' '}
            <Link href="https://tuventaapp.com" className="underline hover:text-orange-300">
              Crea tu catálogo gratis
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}