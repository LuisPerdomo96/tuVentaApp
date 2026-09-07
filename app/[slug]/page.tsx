"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  ShoppingBag,
  Lock,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { getPlan } from "@/lib/plans"

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
  has_variants?: boolean
  size?: string
  colors?: { name: string; hex: string }[]
}

interface ProductVariant {
  id: string
  product_id: string
  color: string
  color_hex: string
  size: string
  stock: number
  images: string[]
}

interface CartItem {
  product: Product
  quantity: number
  variantId?: string
  variantColor?: string
  variantSize?: string
  variantImage?: string
}

interface UnifiedColor {
  color: string
  hex: string
  source: "parent" | "variant"
  variantId?: string
  images: string[]
}

export default function PublicCatalogPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [company, setCompany] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedSize, setSelectedSize] = useState("all")
  const [loading, setLoading] = useState(true)
  const [showCart, setShowCart] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [galleryProduct, setGalleryProduct] = useState<Product | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const [variantsMap, setVariantsMap] = useState<Record<string, ProductVariant[]>>({})
  const [hoveredVariantImage, setHoveredVariantImage] = useState<Record<string, string>>({})
  const [selectedVariantImage, setSelectedVariantImage] = useState<Record<string, string>>({})
  const [galleryImages, setGalleryImages] = useState<string[]>([])

  const [variantSelectorProduct, setVariantSelectorProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedColor, setSelectedColor] = useState<string>("")

  useEffect(() => {
    loadCatalog()
    const savedCart = localStorage.getItem(`cart_${slug}`)
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (e) {
        console.error("Error loading cart:", e)
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
      if (e.key === "Escape") closeGallery()
      else if (e.key === "ArrowLeft") previousImage()
      else if (e.key === "ArrowRight") nextImage()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [galleryProduct, currentImageIndex])

  useEffect(() => {
    if (galleryProduct) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [galleryProduct])

  async function loadCatalog() {
    const supabase = createClient()

    const { data: companyData } = await supabase
      .from("companies")
      .select("*")
      .eq("slug", slug)
      .single()

    if (!companyData) {
      setLoading(false)
      return
    }

    setCompany(companyData)

    const { data: categoriesData } = await supabase
      .from("categories")
      .select("*")
      .eq("company_id", companyData.id)
      .order("name")

    if (categoriesData) setCategories(categoriesData)

    // CORREGIDO: quitado "colors," del select (es campo JSON, no relación)
    const { data: productsData } = await supabase
      .from("products")
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
      .eq("company_id", companyData.id)
      .eq("is_active", true)
      .order("name")

    if (productsData) {
      const transformedProducts = productsData.map((p: any) => ({
        ...p,
        category_name: p.categories?.name,
        badge: p.product_badges?.[0] || null,
        colors: p.colors || [],
      }))
      setProducts(transformedProducts)

      const productIds = transformedProducts.map((p: Product) => p.id)
      if (productIds.length > 0) {
        const { data: variantsData } = await supabase
          .from("product_variants")
          .select("id, product_id, color, color_hex, size, stock, images")
          .in("product_id", productIds)
          .eq("is_active", true)
          .gt("stock", 0)

        if (variantsData) {
          const map: Record<string, ProductVariant[]> = {}
          variantsData.forEach((v: any) => {
            const images = Array.isArray(v.images)
              ? v.images
              : typeof v.images === "string"
              ? JSON.parse(v.images)
              : []
            if (!map[v.product_id]) map[v.product_id] = []
            map[v.product_id].push({ ...v, images })
          })
          setVariantsMap(map)
        }
      }
    }
    setLoading(false)
  }

  function getProductVariants(productId: string): ProductVariant[] {
    return variantsMap[productId] || []
  }

  function getProductColors(product: Product): UnifiedColor[] {
    const result: UnifiedColor[] = []
    const seen = new Set<string>()

    if (product.colors && Array.isArray(product.colors)) {
      product.colors.forEach((c: any) => {
        const key = `${c.name}-${c.hex}`
        if (!seen.has(key)) {
          seen.add(key)
          result.push({
            color: c.name,
            hex: c.hex,
            source: "parent",
            images: product.images || [],
          })
        }
      })
    }

    const variants = getProductVariants(product.id)
    variants.forEach((v) => {
      const key = `${v.color}-${v.color_hex}`
      if (!seen.has(key)) {
        seen.add(key)
        result.push({
          color: v.color,
          hex: v.color_hex,
          source: "variant",
          variantId: v.id,
          images: v.images || [],
        })
      }
    })

    return result
  }

  function getColorVariants(productId: string, color: string): ProductVariant[] {
    return getProductVariants(productId).filter((v) => v.color === color)
  }

  function hasParentColor(product: Product, color: string): boolean {
    return !!(product.colors && Array.isArray(product.colors) && product.colors.some((c: any) => c.name === color))
  }

  function getAvailableSizes(product: Product): string[] {
    const sizes = new Set<string>()
    if (product.stock > 0 && product.size) sizes.add(product.size)
    const variants = getProductVariants(product.id)
    variants.forEach((v) => {
      if (v.size) sizes.add(v.size)
    })
    return Array.from(sizes).sort()
  }

  function getProductImage(product: Product): string | undefined {
    if (selectedVariantImage[product.id]) return selectedVariantImage[product.id]
    if (hoveredVariantImage[product.id]) return hoveredVariantImage[product.id]
    if (product.stock > 0 && product.images?.[0]) return product.images[0]
    const variants = getProductVariants(product.id)
    if (variants.length > 0 && variants[0].images?.[0]) return variants[0].images[0]
    return product.images?.[0]
  }

  function getAllSizes(): string[] {
    const sizes = new Set<string>()
    products.forEach((p) => {
      if (p.stock > 0 && p.size) sizes.add(p.size)
      getProductVariants(p.id).forEach((v) => {
        if (v.size) sizes.add(v.size)
      })
    })
    return Array.from(sizes).sort()
  }

  function addToCart(product: Product, variant?: ProductVariant) {
    const existingItem = cart.find((item) =>
      variant
        ? item.variantId === variant.id
        : item.product.id === product.id && !item.variantId
    )

    if (existingItem) {
      setCart(
        cart.map((item) =>
          (variant ? item.variantId === variant.id : item.product.id === product.id && !item.variantId)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          variantId: variant?.id,
          variantColor: variant?.color,
          variantSize: variant?.size,
          variantImage: variant?.images?.[0],
        },
      ])
    }
  }

  function removeFromCart(productId: string, variantId?: string) {
    const existingItem = cart.find((item) =>
      variantId ? item.variantId === variantId : item.product.id === productId && !item.variantId
    )
    if (existingItem && existingItem.quantity > 1) {
      setCart(
        cart.map((item) =>
          (variantId ? item.variantId === variantId : item.product.id === productId && !item.variantId)
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      )
    } else {
      setCart(cart.filter((item) =>
        variantId ? item.variantId !== variantId : !(item.product.id === productId && !item.variantId)
      ))
    }
  }

  function getCartQuantity(productId: string, variantId?: string): number {
    const item = cart.find((item) =>
      variantId ? item.variantId === variantId : item.product.id === productId && !item.variantId
    )
    return item ? item.quantity : 0
  }

  function getCartTotal() {
    return cart.reduce((total, item) => total + item.product.price_usd * item.quantity, 0)
  }

  function getCartCount() {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }

  function openGallery(product: Product) {
    setGalleryProduct(product)

    let imagesToShow: string[] = product.images || []
    const selectedImage = selectedVariantImage[product.id]

    if (selectedImage) {
      const variants = getProductVariants(product.id)
      const matchingVariant = variants.find((v) => v.images?.includes(selectedImage))
      if (matchingVariant && matchingVariant.images.length > 0) {
        imagesToShow = matchingVariant.images
      } else if (product.images?.includes(selectedImage)) {
        imagesToShow = product.images
      } else {
        imagesToShow = [selectedImage]
      }
    }

    const mainImage = getProductImage(product) ?? imagesToShow[0] ?? ""
    const startIndex = mainImage ? imagesToShow.indexOf(mainImage) : -1
    setGalleryImages(imagesToShow)
    setCurrentImageIndex(startIndex >= 0 ? startIndex : 0)
  }

  function closeGallery() {
    setGalleryProduct(null)
    setCurrentImageIndex(0)
    setGalleryImages([])
  }

  function nextImage() {
    if (!galleryProduct) return
    const totalImages = galleryImages.length
    if (totalImages === 0) return
    setCurrentImageIndex((prev) => (prev + 1) % totalImages)
  }

  function previousImage() {
    if (!galleryProduct) return
    const totalImages = galleryImages.length
    if (totalImages === 0) return
    setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages)
  }

  function openVariantSelector(product: Product) {
    const allColors = getProductColors(product)
    const hasVariants = getProductVariants(product.id).length > 0

    if (allColors.length === 0 && !hasVariants) {
      addToCart(product)
      return
    }

    setVariantSelectorProduct(product)

    // Limpia la imagen seleccionada al abrir el selector
    setSelectedVariantImage((prev) => {
      const next = { ...prev }
      delete next[product.id]
      return next
    })

    if (allColors.length > 0) {
      const first = allColors[0]
      setSelectedColor(first.color)
      const colorVariants = getColorVariants(product.id, first.color)
      if (colorVariants.length > 0) {
        setSelectedVariant(colorVariants[0])
      } else {
        setSelectedVariant(null)
      }
    } else {
      setSelectedColor("")
      setSelectedVariant(null)
    }
  }

  function canAddSelection(): boolean {
    if (!variantSelectorProduct || !selectedColor) return false
    if (selectedVariant) return selectedVariant.stock > 0
    return hasParentColor(variantSelectorProduct, selectedColor) && variantSelectorProduct.stock > 0
  }

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSize =
      selectedSize === "all" || getAvailableSizes(p).includes(selectedSize)
    return matchesCategory && matchesSearch && matchesSize
  })

  function getFontClass() {
    switch (company?.font_family) {
      case "poppins":
        return "font-poppins"
      case "montserrat":
        return "font-montserrat"
      case "playfair":
        return "font-playfair"
      case "serif":
        return "font-serif"
      default:
        return "font-sans"
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

  if (company.subscription_status === "archived") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-orange-100 flex items-center justify-center animate-pulse">
            <Lock className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Tienda temporalmente fuera de servicio</h1>
          <p className="text-gray-600 mb-6">Esta tienda no está disponible en este momento. Vuelve a intentarlo más tarde.</p>
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-3">¿Eres el dueño? Renueva tu plan para reactivarla.</p>
            <Link href="/dashboard">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">Ir a mi panel</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const bgColor = company.background_color || "#FDF8F5"
  const primaryColor = company.primary_color || "#F97316"
  const allSizes = getAllSizes()

  return (
    <div className={`min-h-screen ${getFontClass()}`} style={{ backgroundColor: bgColor }}>
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
                  style={{ backgroundColor: primaryColor, color: "white" }}
                >
                  {company.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">{company.name}</h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  {company.type === "restaurant" ? "🍽️ Restaurante" : "🛍️ Tienda"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Link href={`/${slug}/track-order`}>
                <Button variant="outline" size="sm" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
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

      <div className="bg-white/50 backdrop-blur-sm border-b sticky top-[64px] sm:top-[80px] z-30">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-2 sm:space-y-3">
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

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === "all"
                  ? "text-white shadow-md"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
              style={selectedCategory === "all" ? { backgroundColor: primaryColor } : {}}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? "text-white shadow-md"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
                style={selectedCategory === cat.id ? { backgroundColor: primaryColor } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {filteredProducts.map((product) => {
              const variants = getProductVariants(product.id)
              const allColors = getProductColors(product)
              const sizes = getAvailableSizes(product)
              const mainImage = getProductImage(product)
              const needsSelector = allColors.length > 0 || variants.length > 0

              return (
                <Card key={product.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white">
                  <div
                    className="relative aspect-square bg-gray-100 cursor-pointer overflow-hidden"
                    onClick={() => openGallery(product)}
                  >
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-xs sm:text-sm">Sin imagen</span>
                      </div>
                    )}

                    {sizes.length > 0 && (
                      <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                        <Badge className="bg-black/70 text-white text-[10px] sm:text-xs backdrop-blur-sm px-2 py-0.5 sm:px-2.5 sm:py-1">
                          Talla: {sizes.join(", ")}
                        </Badge>
                      </div>
                    )}

                    {product.badge && (
                      <div
                        className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold text-white shadow-lg"
                        style={{ backgroundColor: product.badge.color }}
                      >
                        {product.badge.name}
                      </div>
                    )}

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

                    {/* Swatches de color unificados (padre + variantes) */}
                    {allColors.length > 0 && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {allColors.slice(0, 5).map((c) => (
                          <button
                            key={`${c.color}-${c.hex}`}
                            type="button"
                            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 shadow-sm ring-1 transition-transform hover:scale-110 ${
                              selectedVariantImage[product.id] === c.images?.[0]
                                ? "ring-orange-500 ring-2 border-white"
                                : "ring-gray-200 border-white"
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={c.color}
                            onMouseEnter={() => {
                              if (c.images?.[0]) {
                                setHoveredVariantImage((prev) => ({ ...prev, [product.id]: c.images[0] }))
                              }
                            }}
                            onMouseLeave={() => {
                              setHoveredVariantImage((prev) => {
                                const next = { ...prev }
                                delete next[product.id]
                                return next
                              })
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (c.images?.[0]) {
                                setSelectedVariantImage((prev) => {
                                  const isAlreadySelected = prev[product.id] === c.images[0]
                                  const next = { ...prev }
                                  if (isAlreadySelected) {
                                    delete next[product.id]
                                  } else {
                                    next[product.id] = c.images[0]
                                  }
                                  return next
                                })
                              }
                            }}
                          />
                        ))}
                        {allColors.length > 5 && (
                          <span className="text-[10px] text-gray-400 self-center">+{allColors.length - 5}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 sm:pt-2">
                      {company.show_prices !== false && (
                        <span className="text-sm sm:text-lg md:text-2xl font-bold" style={{ color: primaryColor }}>
                          ${product.price_usd.toFixed(2)}
                        </span>
                      )}
                      <Button
                        size="sm"
                        onClick={() => {
                          if (needsSelector) {
                            openVariantSelector(product)
                          } else {
                            addToCart(product)
                          }
                        }}
                        className="rounded-full w-8 h-8 sm:w-10 sm:h-10 p-0 shadow-lg hover:shadow-xl transition-shadow"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Button>
                    </div>

                    {(getCartQuantity(product.id) > 0 ||
                      cart.some((item) => item.product.id === product.id && item.variantId)) && (
                      <div className="space-y-1.5 pt-2 border-t">
                        {getCartQuantity(product.id) > 0 && (
                          <div className="flex items-center justify-center gap-2 sm:gap-3">
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
                        {cart
                          .filter((item) => item.product.id === product.id && item.variantId)
                          .map((item) => (
                            <div key={item.variantId} className="flex items-center justify-between px-1">
                              <span className="text-[10px] sm:text-xs text-gray-500 truncate max-w-[60%]">
                                {item.variantColor}
                                {item.variantSize ? ` — ${item.variantSize}` : ""}
                              </span>
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeFromCart(product.id, item.variantId)}
                                  className="rounded-full w-6 h-6 sm:w-7 sm:h-7 p-0"
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="font-bold text-xs sm:text-sm w-4 sm:w-6 text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const v = variants.find((vv) => vv.id === item.variantId)
                                    if (v) addToCart(product, v)
                                  }}
                                  className="rounded-full w-6 h-6 sm:w-7 sm:h-7 p-0"
                                  style={{ backgroundColor: primaryColor }}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal de Selector de Variante Unificado */}
      {variantSelectorProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setVariantSelectorProduct(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm max-h-[90vh] overflow-hidden animate-slide-up shadow-2xl">
            <div className="p-4 sm:p-5 border-b flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Selecciona una opción</h2>
              <button
                onClick={() => setVariantSelectorProduct(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-5 overflow-y-auto max-h-[60vh]">
              <div className="flex gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden border">
                  {selectedVariant?.images?.[0] || variantSelectorProduct.images?.[0] ? (
                    <img
                      src={selectedVariant?.images?.[0] || variantSelectorProduct.images[0]}
                      alt={variantSelectorProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Sin imagen</div>
                  )}
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <p className="font-bold text-base sm:text-lg text-gray-900 line-clamp-2">{variantSelectorProduct.name}</p>
                  <p className="text-lg sm:text-xl font-bold mt-1" style={{ color: primaryColor }}>
                    ${variantSelectorProduct.price_usd.toFixed(2)}
                  </p>
                  {selectedVariant ? (
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {selectedVariant.color}
                      {selectedVariant.size ? ` — Talla ${selectedVariant.size}` : ""}
                      <span className="text-gray-400 ml-1">(Stock: {selectedVariant.stock})</span>
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {selectedColor} — {variantSelectorProduct.size || "Única"}
                      <span className="text-gray-400 ml-1">(Stock: {variantSelectorProduct.stock})</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Color</p>
                <div className="flex flex-wrap gap-2">
                  {getProductColors(variantSelectorProduct).map((c) => {
                    const isSelected = selectedColor === c.color
                    return (
                      <button
                        key={`${c.color}-${c.hex}`}
                        onClick={() => {
                          setSelectedColor(c.color)
                          const colorVariants = getColorVariants(variantSelectorProduct.id, c.color)
                          if (colorVariants.length > 0) {
                            setSelectedVariant(colorVariants[0])
                          } else {
                            setSelectedVariant(null)
                          }
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                          isSelected
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-200 hover:border-gray-300 text-gray-700"
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-gray-200"
                          style={{ backgroundColor: c.hex }}
                        />
                        {c.color}
                      </button>
                    )
                  })}
                </div>
              </div>

              {selectedColor && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Talla</p>
                  <div className="flex flex-wrap gap-2">
                    {hasParentColor(variantSelectorProduct, selectedColor) && variantSelectorProduct.stock > 0 && (
                      <button
                        onClick={() => setSelectedVariant(null)}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                          selectedVariant === null
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-200 hover:border-gray-300 text-gray-700"
                        }`}
                      >
                        {variantSelectorProduct.size || "Única"}
                        <span className="text-gray-400 text-xs ml-1">({variantSelectorProduct.stock})</span>
                      </button>
                    )}
                    {getColorVariants(variantSelectorProduct.id, selectedColor).map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                          selectedVariant?.id === v.id
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-200 hover:border-gray-300 text-gray-700"
                        }`}
                      >
                        {v.size || "Única"}
                        <span className="text-gray-400 text-xs ml-1">({v.stock})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 border-t bg-gray-50">
              <button
                onClick={() => {
                  if (selectedVariant) {
                    addToCart(variantSelectorProduct, selectedVariant)
                  } else {
                    addToCart(variantSelectorProduct)
                  }
                  setVariantSelectorProduct(null)
                  setSelectedVariant(null)
                  setSelectedColor("")
                }}
                disabled={!canAddSelection()}
                className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold text-white rounded-xl hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus className="w-5 h-5" />
                Agregar al Carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Carrito */}
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
                cart.map((item) => (
                  <div key={item.variantId || item.product.id} className="flex gap-3 sm:gap-4 items-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {(item.variantImage || item.product.images?.[0]) ? (
                        <img
                          src={item.variantImage || item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] sm:text-xs">
                          Sin imagen
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{item.product.name}</h3>
                      {item.variantColor && (
                        <p className="text-xs sm:text-sm text-gray-500">
                          {item.variantColor}
                          {item.variantSize ? ` — ${item.variantSize}` : ""}
                        </p>
                      )}
                      <p className="text-xs sm:text-sm text-gray-500">${item.product.price_usd.toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        onClick={() => removeFromCart(item.product.id, item.variantId)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold w-6 sm:w-8 text-center text-sm sm:text-base">{item.quantity}</span>
                      <button
                        onClick={() => {
                          if (item.variantId) {
                            const v = getProductVariants(item.product.id).find((vv) => vv.id === item.variantId)
                            if (v) addToCart(item.product, v)
                          } else {
                            addToCart(item.product)
                          }
                        }}
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

      {/* Modal de Galería */}
      {galleryProduct && galleryImages.length > 0 && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center" onClick={closeGallery}>
          <button
            onClick={closeGallery}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 z-10 transition-colors backdrop-blur-sm"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-4xl w-full h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            {galleryImages.length > 1 && (
              <button
                onClick={previousImage}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 sm:p-3 z-10 transition-colors backdrop-blur-sm"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
            <img
              src={galleryImages[currentImageIndex]}
              alt={galleryProduct.name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            {galleryImages.length > 1 && (
              <button
                onClick={nextImage}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 sm:p-3 z-10 transition-colors backdrop-blur-sm"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
          </div>
          {galleryImages.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                    idx === currentImageIndex ? "border-white scale-110" : "border-white/30 opacity-60"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {getPlan(company.plan).showPoweredBy && (
        <Link
          href="/register"
          className="fixed bottom-4 left-4 right-4 text-center py-2 bg-gray-900/90 text-white text-xs z-10 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <p>
            Powered by <span className="font-bold text-orange-400">tuVentaApp</span>
            <span className="text-gray-300"> · Creá tu tienda gratis</span>
          </p>
        </Link>
      )}
    </div>
  )
}