'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateProduct, uploadProductImage, deleteProduct } from '../../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Upload, X, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    stockMinimo: '5',
    categoryId: ''
  })

  useEffect(() => {
    loadData()
  }, [productId])

  async function loadData() {
    const supabase = createClient()

    // Cargar categorías
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    if (categoriesData) setCategories(categoriesData)

    // Cargar producto
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
        stock: product.stock.toString(),
        stockMinimo: product.stock_minimo?.toString() || '5',
        categoryId: product.category_id || ''
      })
      setImages(product.images || [])
    }

    setLoading(false)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    const form = new FormData()
    form.append('image', file)

    const result = await uploadProductImage(form)
    setUploadingImage(false)

    if (result.error) {
      alert(result.error)
    } else if (result.url) {
      setImages([...images, result.url])
    }
  }

  async function handleDeleteImage(imageUrl: string) {
    if (!confirm('¿Eliminar esta imagen?')) return
    setImages(images.filter(img => img !== imageUrl))
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
    form.append('images', JSON.stringify(images))

    const result = await updateProduct(productId, form)
    setSaving(false)

    if (result.error) {
      alert(result.error)
    } else {
      router.push('/dashboard/products')
    }
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) return

    const result = await deleteProduct(productId)
    if (result.error) {
      alert(result.error)
    } else {
      router.push('/dashboard/products')
    }
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
          <Button
            variant="outline"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
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
                    <img 
                      src={img} 
                      alt={`Producto ${idx + 1}`} 
                      className="w-full h-full object-cover rounded-lg" 
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-xs text-gray-600">Subir</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {images.length}/5 imágenes
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
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Hamburguesa Clásica"
                  required
                  minLength={3}
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe tu producto..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Precio (USD) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Stock *</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stockMinimo">Stock Mínimo</Label>
                  <Input
                    id="stockMinimo"
                    type="number"
                    min="0"
                    value={formData.stockMinimo}
                    onChange={(e) => setFormData({...formData, stockMinimo: e.target.value})}
                    placeholder="5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Alerta cuando stock sea menor</p>
                </div>
              </div>

              <div>
                <Label>Categoría</Label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 mt-2"
                >
                  <option value="">Sin categoría</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Botones de Acción */}
          <div className="flex gap-3">
            <Link href="/dashboard/products" className="flex-1">
              <Button variant="outline" className="w-full">Cancelar</Button>
            </Link>
            <Button 
              type="submit" 
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              disabled={saving || uploadingImage}
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}