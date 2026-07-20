'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Camera,
  Search,
  Package,
  ShoppingBag
} from 'lucide-react'
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
  category_name?: string
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
  const [showCart, setShowCart] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [galleryProduct, setGalleryProduct] = useState<Product | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!galleryProduct) return
      if (e.key === 'Escape') closeGallery()
      else if (e.key === 'ArrowLeft') previousImage()
      else if (e.key === 'ArrowRight') nextImage()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [galleryProduct, currentImageIndex])

  useEffect(() => {
    if (galleryProduct) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [galleryProduct])

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

    const { data: productsData } = await supabase
      .from('products')
      .select(`
        *,
        categories (name),
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
      const transformedProducts = productsData.map((p: any) => ({
        ...p,
        category_name: p.categories?.name,
        badge: p.product_badges?.[0] || null
      }))
      setProducts(transformedProducts)
    }
    setLoading(false)
  }

  function openGallery(product: Product, imageIndex: number = 0) {
    setGalleryProduct(product)
    setCurrentImageIndex(imageIndex)
  }

  function closeGallery() {
    setGalleryProduct(null)
    setCurrentImageIndex(0)
  }

  function nextImage() {
    if (!galleryProduct) return
    const totalImages = galleryProduct.images?.length || 0
    setCurrentImageIndex((prev) => (prev + 1) % totalImages)
  }

  function previousImage() {
    if (!galleryProduct) return
    const totalImages = galleryProduct.images?.length || 0
    setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages)
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
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : products.filter(p => p.category_id === selectedCategory && p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  function getFontClass() {
    switch (company?.font_family) {
      case 'poppins': return 'font-poppins'
      case 'montserrat': return 'font-montserrat'
      case 'playfair': return 'font-playfair'
      case 'serif': return 'font-serif'
      default: return 'font-sans'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando catálogo...</p>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Catálogo no encontrado</h1>
          <p className="text-gray-600">La empresa que buscas no existe o fue desactivada.</p>
        </div>
      </div>
    )
  }

  const bgColor = company.background_color || '#FDF8F5'
  const primaryColor = company.primary_color || '#F97316'

  return (
    <div className={`min-h-screen ${getFontClass()}`} style={{ backgroundColor: bgColor }}>
      {/* ✅ Header Responsive */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              {company.logo_url ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name}
                  className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl object-cover shadow-md flex-shrink-0"
                />
              ) : (
                <div 
                  className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-2xl font-bold shadow-md flex-shrink-0"
                  style={{ backgroundColor: primaryColor, color: 'white' }}
                >
                  {company.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">{company.name}</h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  {company.type === 'restaurant' ? '🍽️ Restaurante' : '🛍️ Tienda'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* ✅ Botón Mi Pedido - Visible en móvil */}
              <Link href={`/${slug}/track-order`}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm"
                >
                  <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Mi Pedido</span>
                </Button>
              </Link>
              <Button 
                onClick={() => setShowCart(true)}
                className="relative px-2 sm:px-3 py-1.5 sm:py-2"
                style={{ backgroundColor: primaryColor }}
                size="sm"
              >
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                {getCartCount() > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-red-500 text-white text-[10px] sm:text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-bold">
                    {getCartCount()}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Buscador y Filtros */}
      <div className="bg-white/50 backdrop-blur-sm border-b sticky top-[64px] sm:top-[80px] z-30">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-2 sm:space-y-3">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white/80 text-sm sm:text-base"
            />
          </div>

          {/* Categorías */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'text-white shadow-md'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
              style={selectedCategory === 'all' ? { backgroundColor: primaryColor } : {}}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                style={selectedCategory === cat.id ? { backgroundColor: primaryColor } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ Productos - Grid 2 columnas en móvil */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {filteredProducts.map(product => (
              <Card key={product.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white">
                {/* Imagen */}
                <div 
                  className="relative aspect-square bg-gray-100 cursor-pointer overflow-hidden"
                  onClick={() => openGallery(product, 0)}
                >
                  {product.images && product.images[0] ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-400 text-xs sm:text-sm">Sin imagen</span>
                    </div>
                  )}

                  {/* Badge de categoría */}
                  {product.category_name && (
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                      <Badge className="bg-black/70 text-white text-[10px] sm:text-xs backdrop-blur-sm px-2 py-0.5 sm:px-2.5 sm:py-1">
                        {product.category_name}
                      </Badge>
                    </div>
                  )}

                  {/* Badge del producto */}
                  {product.badge && (
                    <div 
                      className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold text-white shadow-lg"
                      style={{ backgroundColor: product.badge.color }}
                    >
                      {product.badge.name}
                    </div>
                  )}

                  {/* Múltiples imágenes */}
                  {product.images && product.images.length > 1 && (
                    <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-black/70 text-white px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
                      <Camera className="w-3 h-3" />
                      {product.images.length}
                    </div>
                  )}
                </div>

                <CardContent className="p-2.5 sm:p-3 md:p-5 space-y-2 sm:space-y-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xs sm:text-sm md:text-lg leading-tight mb-1 line-clamp-2">
                      {product.name}
                    </h3>
                    {company.show_descriptions !== false && product.description && (
                      <p className="text-[10px] sm:text-sm text-gray-500 line-clamp-2 hidden sm:block">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 sm:pt-2">
                    {company.show_prices !== false && (
                      <span className="text-sm sm:text-lg md:text-2xl font-bold" style={{ color: primaryColor }}>
                        ${product.price_usd.toFixed(2)}
                      </span>
                    )}
                    <Button
                      size="sm"
                      onClick={() => addToCart(product)}
                      className="rounded-full w-8 h-8 sm:w-10 sm:h-10 p-0 shadow-lg hover:shadow-xl transition-shadow"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  </div>

                  {/* Cantidad en carrito */}
                  {getCartQuantity(product.id) > 0 && (
                    <div className="flex items-center justify-center gap-2 sm:gap-3 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFromCart(product.id)}
                        className="rounded-full w-7 h-7 sm:w-8 sm:h-8 p-0"
                      >
                        <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                      <span className="font-bold text-sm sm:text-lg w-6 sm:w-8 text-center">
                        {getCartQuantity(product.id)}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => addToCart(product)}
                        className="rounded-full w-7 h-7 sm:w-8 sm:h-8 p-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* ✅ Modal de Carrito - Versión Mejorada para Móvil */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-slide-up">
            <div className="p-4 sm:p-6 border-b flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold">Tu Carrito</h2>
              <button onClick={() => setShowCart(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[50vh] p-4 sm:p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Tu carrito está vacío</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="flex gap-3 sm:gap-4 items-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {item.product.images && item.product.images[0] ? (
                        <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] sm:text-xs">Sin imagen</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{item.product.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-500">${item.product.price_usd.toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold w-6 sm:w-8 text-center text-sm sm:text-base">{item.quantity}</span>
                      <button 
                        onClick={() => addToCart(item.product)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-right min-w-[50px] sm:min-w-[60px]">
                      <p className="font-bold text-sm sm:text-base" style={{ color: primaryColor }}>
                        ${(item.product.price_usd * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 sm:p-6 border-t bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-base sm:text-lg font-semibold">Total</span>
                  <span className="text-xl sm:text-2xl font-bold" style={{ color: primaryColor }}>
                    ${getCartTotal().toFixed(2)}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setShowCart(false)
                    router.push(`/${slug}/checkout`)
                  }}
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold text-white rounded-xl hover:opacity-90 transition-opacity shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  Proceder al Pago
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ Modal de Galería - Flechas con mejor contraste */}
      {galleryProduct && galleryProduct.images && galleryProduct.images.length > 0 && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center" onClick={closeGallery}>
          <button 
            onClick={closeGallery} 
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 z-10 transition-colors backdrop-blur-sm"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-4xl w-full h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            {galleryProduct.images.length > 1 && (
              <button 
                onClick={previousImage} 
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 sm:p-3 z-10 transition-colors backdrop-blur-sm"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
            <img 
              src={galleryProduct.images[currentImageIndex]} 
              alt={galleryProduct.name} 
              className="max-w-full max-h-full object-contain rounded-lg" 
            />
            {galleryProduct.images.length > 1 && (
              <button 
                onClick={nextImage} 
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 sm:p-3 z-10 transition-colors backdrop-blur-sm"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
          </div>
          {galleryProduct.images.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto">
              {galleryProduct.images.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setCurrentImageIndex(idx)} 
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                    idx === currentImageIndex ? 'border-white scale-110' : 'border-white/30 opacity-60'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Branding Free */}
      {company.plan === 'free' && (
        <div className="fixed bottom-4 left-0 right-0 text-center py-2 bg-gray-900/90 text-white text-xs z-10 rounded-lg mx-4">
          <p>Powered by <span className="font-bold text-orange-400">tuVentaApp</span></p>
        </div>
      )}
    </div>
  )
}