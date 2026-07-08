'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createProduct, createCategory, uploadProductImage } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Upload, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)
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
    loadCategories()
  }, [])

  async function loadCategories() {
    const supabase = createClient()
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    if (data) setCategories(data)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const form = new FormData()
    form.append('name', formData.name)
    form.append('description', formData.description)
    form.append('price', formData.price)
    form.append('stock', formData.stock)
    form.append('stockMinimo', formData.stockMinimo)
    form.append('categoryId', formData.categoryId)
    form.append('images', JSON.stringify(images))

    const result = await createProduct(form)
    setLoading(false)

    if (result.error) {
      alert(result.error)
    } else {
      router.push('/dashboard/products')
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault()
    const form = new FormData()
    const name = (e.target as HTMLFormElement).categoryName.value
    form.append('name', name)
    form.append('color', '#F97316')

    const result = await createCategory(form)
    if (result.error) {
      alert(result.error)
    } else {
      setShowNewCategory(false)
      loadCategories()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard/products">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Nuevo Producto</h1>
            <p className="text-sm text-gray-600">Completa la información del producto</p>
          </div>
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
                      onClick={() => setImages(images.filter((_, i) => i !== idx))}
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
                {images.length}/5 imágenes subidas
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
                <div className="flex gap-2 mt-2">
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewCategory(!showNewCategory)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {showNewCategory && (
                  <form onSubmit={handleCreateCategory} className="mt-2 flex gap-2">
                    <Input
                      name="categoryName"
                      placeholder="Nueva categoría"
                      required
                      autoFocus
                    />
                    <Button type="submit" size="sm">Crear</Button>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Link href="/dashboard/products" className="flex-1">
              <Button variant="outline" className="w-full">Cancelar</Button>
            </Link>
            <Button 
              type="submit" 
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              disabled={loading || uploadingImage}
            >
              {loading ? 'Guardando...' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}