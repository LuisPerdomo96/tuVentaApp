"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateProduct, uploadProductImage, deleteProduct, createProductVariant, updateProductVariant, deleteProductVariant, setDefaultVariant } from '../../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Upload, X, Trash2, Loader2, Palette, Crown, Plus, Star, Pencil } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { getPlan } from '@/lib/plans'

const PRESET_COLORS = [
  { name: 'Negro', hex: '#000000' },
  { name: 'Blanco', hex: '#FFFFFF' },
  { name: 'Rojo', hex: '#DC2626' },
  { name: 'Azul', hex: '#2563EB' },
  { name: 'Verde', hex: '#16A34A' },
  { name: 'Amarillo', hex: '#EAB308' },
  { name: 'Rosa', hex: '#EC4899' },
  { name: 'Gris', hex: '#6B7280' },
  { name: 'Marrón', hex: '#92400E' },
  { name: 'Naranja', hex: '#F97316' },
  { name: 'Morado', hex: '#9333EA' },
  { name: 'Beige', hex: '#D4C4A8' },
]

const PRESET_SIZES = ['Única', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46']

interface ColorOption {
  name: string
  hex: string
}

interface VariantForm {
  id?: string
  color: string
  colorHex: string
  size: string
  priceUsd: string
  stock: string
  stockMinimo: string
  images: string[]
  sku: string
  isActive: boolean
  isExisting?: boolean
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [planId, setPlanId] = useState<string>('free')

  // ─── COLORES DEL PRODUCTO PADRE ───
  const [productColors, setProductColors] = useState<ColorOption[]>([])
  const [customColorOpen, setCustomColorOpen] = useState(false)
  const [customColorName, setCustomColorName] = useState('')
  const [customColorHex, setCustomColorHex] = useState('#000000')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    stockMinimo: '5',
    categoryId: '',
    size: '',
  })

  // Variantes
  const [hasVariants, setHasVariants] = useState(false)
  const [variants, setVariants] = useState<VariantForm[]>([])
  const [defaultVariantId, setDefaultVariantId] = useState<string | null>(null)
  const [showVariantForm, setShowVariantForm] = useState(false)
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null)
  const [variantForm, setVariantForm] = useState<VariantForm>({
    color: '', colorHex: '#000000', size: '', priceUsd: '', stock: '', stockMinimo: '5', images: [], sku: '', isActive: true,
  })
  const [uploadingVariantImage, setUploadingVariantImage] = useState(false)
  const [customVariantColor, setCustomVariantColor] = useState(false)

  useEffect(() => {
    loadData()
  }, [productId])

  async function loadData() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: company } = await supabase
        .from('companies')
        .select('plan')
        .eq('owner_id', user.id)
        .single()
      if (company) setPlanId(company.plan || 'free')
    }

    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    if (categoriesData) setCategories(categoriesData)

    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price_usd.toString(),
        stock: product.stock?.toString() || '0',
        stockMinimo: product.stock_minimo?.toString() || '5',
        categoryId: product.category_id || '',
        size: product.size || ''
      })
      setImages(product.images || [])
      setHasVariants(product.has_variants || false)
      setDefaultVariantId(product.default_variant_id || null)
      
      // Cargar colores del padre
      const colors = product.colors || []
      setProductColors(Array.isArray(colors) ? colors : [])
    }

    // Cargar variantes
    const { data: variantsData } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true })

    if (variantsData) {
      setVariants(variantsData.map(v => ({
        id: v.id,
        color: v.color,
        colorHex: v.color_hex || '#000000',
        size: v.size || '',
        priceUsd: v.price_usd?.toString() || '',
        stock: v.stock.toString(),
        stockMinimo: v.stock_minimo?.toString() || '5',
        images: v.images || [],
        sku: v.sku || '',
        isActive: v.is_active,
        isExisting: true,
      })))
    }

    setLoading(false)
  }

  // ─── COLORES DEL PADRE ───
  function isProductColorSelected(hex: string) {
    return productColors.some(c => c.hex === hex)
  }

  function toggleProductColor(color: ColorOption) {
    if (isProductColorSelected(color.hex)) {
      setProductColors(productColors.filter(c => c.hex !== color.hex))
    } else {
      setProductColors([...productColors, color])
    }
  }

  function removeProductColor(index: number) {
    setProductColors(productColors.filter((_, i) => i !== index))
  }

  function addCustomColor() {
    if (!customColorName.trim()) return
    const newColor = { name: customColorName.trim(), hex: customColorHex }
    if (!isProductColorSelected(newColor.hex)) {
      setProductColors([...productColors, newColor])
    }
    setCustomColorName('')
    setCustomColorHex('#000000')
    setCustomColorOpen(false)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    const form = new FormData()
    form.append('image', file)
    const result = await uploadProductImage(form)
    setUploadingImage(false)
    if (result.error) alert(result.error)
    else if (result.url) setImages([...images, result.url])
  }

  async function handleVariantImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingVariantImage(true)
    const form = new FormData()
    form.append('image', file)
    const result = await uploadProductImage(form)
    setUploadingVariantImage(false)
    if (result.error) alert(result.error)
    else if (result.url) setVariantForm({ ...variantForm, images: [...variantForm.images, result.url] })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const form = new FormData()
    form.append('name', formData.name)
    form.append('description', formData.description)
    form.append('price', formData.price)
    form.append('stock', formData.stock)
    form.append('stockMinimo', formData.stockMinimo)
    form.append('categoryId', formData.categoryId)
    form.append('size', formData.size)
    form.append('images', JSON.stringify(images))
    form.append('hasVariants', hasVariants.toString())
    form.append('colors', JSON.stringify(productColors))

    const result = await updateProduct(productId, form)
    if (result.error) {
      alert(result.error)
      setSaving(false)
      return
    }

    // Guardar variantes nuevas
    for (const v of variants) {
      if (!v.isExisting && v.id) continue
      if (!v.isExisting) {
        const res = await createProductVariant(productId, {
          color: v.color,
          colorHex: v.colorHex,
          size: v.size,
          priceUsd: v.priceUsd ? parseFloat(v.priceUsd) : null,
          stock: parseInt(v.stock),
          stockMinimo: parseInt(v.stockMinimo) || 5,
          images: v.images,
          sku: v.sku || undefined,
          isActive: v.isActive,
        })
        if (res.error) console.error('Error creando variante:', res.error)
      }
    }

    setSaving(false)
    router.push('/dashboard/products')
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) return
    const result = await deleteProduct(productId)
    if (result.error) alert(result.error)
    else router.push('/dashboard/products')
  }

  function openVariantForm(variant?: VariantForm, index?: number) {
    if (variant) {
      setVariantForm({ ...variant })
      setEditingVariantIndex(index ?? null)
      const isPreset = PRESET_COLORS.some(c => c.name === variant.color && c.hex === variant.colorHex)
      setCustomVariantColor(!isPreset && variant.color !== '')
    } else {
      setVariantForm({ color: '', colorHex: '#000000', size: '', priceUsd: '', stock: '', stockMinimo: '5', images: [], sku: '', isActive: true })
      setEditingVariantIndex(null)
      setCustomVariantColor(false)
    }
    setShowVariantForm(true)
  }

  async function saveVariant() {
    if (!variantForm.color || !variantForm.stock) {
      alert('Color y stock son obligatorios')
      return
    }

    if (editingVariantIndex !== null && variants[editingVariantIndex].isExisting && variants[editingVariantIndex].id) {
      const v = variants[editingVariantIndex]
      const res = await updateProductVariant(v.id!, {
        color: variantForm.color,
        colorHex: variantForm.colorHex,
        size: variantForm.size,
        priceUsd: variantForm.priceUsd ? parseFloat(variantForm.priceUsd) : null,
        stock: parseInt(variantForm.stock),
        stockMinimo: parseInt(variantForm.stockMinimo) || 5,
        images: variantForm.images,
        sku: variantForm.sku || undefined,
        isActive: variantForm.isActive,
      })
      if (res.error) {
        alert(res.error)
        return
      }
    }

    const newVariants = [...variants]
    if (editingVariantIndex !== null) {
      newVariants[editingVariantIndex] = { ...variantForm, isExisting: newVariants[editingVariantIndex].isExisting }
    } else {
      newVariants.push({ ...variantForm, isExisting: false })
    }
    setVariants(newVariants)
    setShowVariantForm(false)
    setEditingVariantIndex(null)
  }

  async function handleDeleteVariant(index: number) {
    const v = variants[index]
    if (!confirm(`¿Eliminar la variante "${v.color}${v.size ? ' — ' + v.size : ''}"?`)) return

    if (v.isExisting && v.id) {
      const res = await deleteProductVariant(v.id)
      if (res.error) {
        alert(res.error)
        return
      }
    }

    const newVariants = variants.filter((_, i) => i !== index)
    setVariants(newVariants)
    if (newVariants.length === 0) setHasVariants(false)
  }

  async function handleSetDefault(variantId: string) {
    const res = await setDefaultVariant(productId, variantId)
    if (res.error) alert(res.error)
    else setDefaultVariantId(variantId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    )
  }

  const plan = getPlan(planId)
  const maxImages = plan.maxImagesPerProduct
  const canHaveVariants = plan.maxVariantsPerProduct > 0
  const maxVariants = plan.maxVariantsPerProduct

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/products">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Editar Producto</h1>
              <p className="text-sm text-gray-600">Modifica la información del producto</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Imágenes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Imágenes del Producto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square">
                    <img src={img} alt={`Producto ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <button type="button" onClick={() => setImages(images.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {images.length < maxImages && (
                  <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-xs text-gray-600">Subir</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {images.length}/{maxImages === Infinity ? '∞' : maxImages} imágenes subidas
              </p>
            </CardContent>
          </Card>

          {/* Información Básica */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input id="name" value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Camisa Polo Clásica" required minLength={3} />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <textarea id="description" value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe tu producto..." rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Precio (USD) *</Label>
                  <Input id="price" type="number" step="0.01" min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="0.00" required />
                </div>
                <div>
                  <Label htmlFor="stock">Stock *</Label>
                  <Input id="stock" type="number" min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    placeholder="0" required />
                </div>
                <div>
                  <Label htmlFor="stockMinimo">Stock Mínimo</Label>
                  <Input id="stockMinimo" type="number" min="0"
                    value={formData.stockMinimo}
                    onChange={(e) => setFormData({...formData, stockMinimo: e.target.value})}
                    placeholder="5" />
                </div>
              </div>

              {/* Talla del producto base */}
              <div>
                <Label htmlFor="size">Talla</Label>
                <select id="size" value={formData.size}
                  onChange={(e) => setFormData({...formData, size: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">Sin talla</option>
                  {PRESET_SIZES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="other">Otra...</option>
                </select>
                {formData.size === 'other' && (
                  <Input id="sizeOther" placeholder="Especifica la talla" className="mt-2" />
                )}
              </div>

              <div>
                <Label>Categoría</Label>
                <select value={formData.categoryId}
                  onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 mt-2">
                  <option value="">Sin categoría</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* ═══════════════════════════════════════════════════════════
              PANEL DE COLORES DEL PRODUCTO PADRE
              ═══════════════════════════════════════════════════════════ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Colores del Producto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-gray-500">
                Selecciona los colores disponibles para este producto. Se mostrarán en el catálogo junto a las variantes.
              </p>
              
              {/* Paleta preset */}
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => toggleProductColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all relative ${
                      isProductColorSelected(c.hex)
                        ? 'border-orange-500 ring-2 ring-orange-200 scale-110'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {isProductColorSelected(c.hex) && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
                
                {/* Botón color custom */}
                <button
                  type="button"
                  onClick={() => setCustomColorOpen(!customColorOpen)}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                    customColorOpen ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  +
                </button>
              </div>

              {/* Form custom color */}
              {customColorOpen && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Input
                    type="color"
                    value={customColorHex}
                    onChange={(e) => setCustomColorHex(e.target.value)}
                    className="w-12 h-10 p-1 flex-shrink-0"
                  />
                  <Input
                    placeholder="Nombre del color (ej: Turquesa)"
                    value={customColorName}
                    onChange={(e) => setCustomColorName(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={addCustomColor} className="bg-orange-500 hover:bg-orange-600">
                    Agregar
                  </Button>
                </div>
              )}

              {/* Lista de colores seleccionados */}
              {productColors.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {productColors.map((c, idx) => (
                    <div key={`${c.hex}-${idx}`} className="flex items-center gap-1.5 px-2 py-1 bg-white border rounded-full text-xs">
                      <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: c.hex }} />
                      <span className="text-gray-700">{c.name}</span>
                      <button
                        type="button"
                        onClick={() => removeProductColor(idx)}
                        className="text-gray-400 hover:text-red-500 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECCIÓN DE VARIANTES */}
          <Card className={!canHaveVariants ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Variantes de Producto
                </CardTitle>
                {!canHaveVariants && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Plan Pro
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Este producto tiene variantes</p>
                  <p className="text-xs text-gray-500">Color, talla, stock y precio por variante</p>
                </div>
                <button
                  type="button"
                  onClick={() => canHaveVariants && setHasVariants(!hasVariants)}
                  disabled={!canHaveVariants}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    hasVariants ? 'bg-orange-500' : 'bg-gray-300'
                  } ${!canHaveVariants ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    hasVariants ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>

              {hasVariants && canHaveVariants && (
                <>
                  {variants.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        Variantes ({variants.length}/{maxVariants === Infinity ? '∞' : maxVariants})
                      </p>
                      <div className="space-y-2">
                        {variants.map((v, idx) => (
                          <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${
                            v.isActive ? 'bg-gray-50' : 'bg-gray-100 opacity-60'
                          }`}>
                            <div className="w-8 h-8 rounded-full border border-gray-200 flex-shrink-0" style={{ backgroundColor: v.colorHex }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {v.color}{v.size ? ` — Talla ${v.size}` : ''}
                                {defaultVariantId === v.id && (
                                  <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">Default</span>
                                )}
                                {!v.isActive && (
                                  <span className="ml-2 text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">Inactiva</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                Stock: {v.stock} {v.priceUsd ? `• $${v.priceUsd}` : '• Precio base'}
                                {v.sku ? ` • SKU: ${v.sku}` : ''}
                              </p>
                            </div>
                            {v.images.length > 0 && (
                              <div className="flex -space-x-2">
                                {v.images.slice(0, 3).map((img, i) => (
                                  <img key={i} src={img} className="w-6 h-6 rounded-full border-2 border-white object-cover" />
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              {v.id && defaultVariantId !== v.id && v.isActive && (
                                <button type="button" onClick={() => handleSetDefault(v.id!)}
                                  className="p-1.5 text-gray-400 hover:text-orange-500" title="Marcar como default">
                                  <Star className="w-4 h-4" />
                                </button>
                              )}
                              <button type="button" onClick={() => openVariantForm(v, idx)}
                                className="p-1.5 text-gray-400 hover:text-blue-500" title="Editar">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button type="button" onClick={() => handleDeleteVariant(idx)}
                                className="p-1.5 text-gray-400 hover:text-red-500" title="Eliminar">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {variants.length < maxVariants && (
                    <Button type="button" variant="outline" className="w-full gap-2"
                      onClick={() => openVariantForm()}>
                      <Plus className="w-4 h-4" />
                      {variants.length === 0 ? 'Agregar primera variante' : 'Agregar otra variante'}
                    </Button>
                  )}
                </>
              )}

                              {!canHaveVariants && (
                    <div className="text-center py-4">
                      <Crown className="w-8 h-8 text-orange-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        Las variantes están disponibles desde el <strong>Plan Pro</strong>
                      </p>
                      <Link href="/dashboard/plans">
                        <Button size="sm" className="mt-2 bg-orange-500 hover:bg-orange-600">
                          Ver Planes
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Link href="/dashboard/products" className="flex-1">
                  <Button variant="outline" className="w-full">Cancelar</Button>
                </Link>
                <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600"
                  disabled={saving || uploadingImage || uploadingVariantImage}>
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          </main>

          {/* ═══════════════════════════════════════════════════════════
              MODAL DE FORMULARIO DE VARIANTE
              ═══════════════════════════════════════════════════════════ */}
          {showVariantForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
                  <h3 className="font-bold text-gray-900">
                    {editingVariantIndex !== null ? 'Editar Variante' : 'Nueva Variante'}
                  </h3>
                  <button onClick={() => setShowVariantForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {/* Color */}
                  <div>
                    <Label>Color *</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {PRESET_COLORS.map((c) => (
                        <button key={c.hex} type="button"
                          onClick={() => {
                            setVariantForm({ ...variantForm, color: c.name, colorHex: c.hex })
                            setCustomVariantColor(false)
                          }}
                          className={`w-8 h-8 rounded-full border-2 transition-all relative ${
                            variantForm.color === c.name && !customVariantColor
                              ? 'border-orange-500 ring-2 ring-orange-200 scale-110'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        >
                          {variantForm.color === c.name && !customVariantColor && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <svg className="w-4 h-4 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                        </button>
                      ))}
                      <button type="button"
                        onClick={() => {
                          setCustomVariantColor(true)
                          setVariantForm({ ...variantForm, color: 'Personalizado', colorHex: '#000000' })
                        }}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs transition-all ${
                          customVariantColor ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'
                        }`}
                      >+</button>
                    </div>
                    {customVariantColor && (
                      <div className="flex gap-2 mt-2">
                        <Input type="color" value={variantForm.colorHex}
                          onChange={(e) => setVariantForm({ ...variantForm, colorHex: e.target.value })}
                          className="w-12 h-10 p-1" />
                        <Input placeholder="Nombre del color"
                          value={variantForm.color === 'Personalizado' ? '' : variantForm.color}
                          onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })}
                          className="flex-1" />
                      </div>
                    )}
                  </div>

                  {/* Talla */}
                  <div>
                    <Label>Talla</Label>
                    <select value={variantForm.size}
                      onChange={(e) => setVariantForm({ ...variantForm, size: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 mt-1">
                      <option value="">Sin talla</option>
                      {PRESET_SIZES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Stock, Precio, SKU */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Stock *</Label>
                      <Input type="number" min="0" value={variantForm.stock}
                        onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })} placeholder="0" />
                    </div>
                    <div>
                      <Label>Precio (USD)</Label>
                      <Input type="number" step="0.01" min="0" value={variantForm.priceUsd}
                        onChange={(e) => setVariantForm({ ...variantForm, priceUsd: e.target.value })} placeholder="Base" />
                    </div>
                    <div>
                      <Label>SKU</Label>
                      <Input value={variantForm.sku}
                        onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })} placeholder="Opcional" />
                    </div>
                  </div>

                  {/* Activa/Inactiva */}
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="variantActive" checked={variantForm.isActive}
                      onChange={(e) => setVariantForm({ ...variantForm, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                    <Label htmlFor="variantActive" className="mb-0">Variante activa</Label>
                  </div>

                  {/* Imágenes */}
                  <div>
                    <Label>Imágenes de esta variante</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {variantForm.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square">
                          <img src={img} className="w-full h-full object-cover rounded-lg" />
                          <button type="button"
                            onClick={() => setVariantForm({ ...variantForm, images: variantForm.images.filter((_, i) => i !== idx) })}
                            className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-colors">
                        <Upload className="w-5 h-5 text-gray-400" />
                        <input type="file" accept="image/*" onChange={handleVariantImageUpload} className="hidden" disabled={uploadingVariantImage} />
                      </label>
                    </div>
                  </div>

                  <Button type="button" className="w-full bg-orange-500 hover:bg-orange-600"
                    onClick={saveVariant}>
                    {editingVariantIndex !== null ? 'Guardar Cambios' : 'Agregar Variante'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }