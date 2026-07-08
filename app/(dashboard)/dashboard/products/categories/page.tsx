'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  Package, 
  Loader2,
  X,
  Check
} from 'lucide-react'
import Link from 'next/link'

interface Category {
  id: string
  name: string
  color: string
  is_active: boolean
  products_count?: number
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    color: '#F97316',
    is_active: true,
  })

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!company) return

    // Cargar categorías con conteo de productos
    const { data: categoriesData } = await supabase
      .from('categories')
      .select(`
        *,
        products (
          id
        )
      `)
      .eq('company_id', company.id)
      .order('name')

    if (categoriesData) {
      const categoriesWithCount = categoriesData.map(cat => ({
        ...cat,
        products_count: cat.products.length,
      }))
      setCategories(categoriesWithCount)
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!company) return

    if (editingCategory) {
      // Actualizar
      const { error } = await supabase
        .from('categories')
        .update({
          name: formData.name,
          color: formData.color,
          is_active: formData.is_active,
        })
        .eq('id', editingCategory.id)
        .eq('company_id', company.id)

      if (error) {
        alert('Error al actualizar: ' + error.message)
      } else {
        alert('✅ Categoría actualizada')
      }
    } else {
      // Crear nueva
      const { error } = await supabase
        .from('categories')
        .insert({
          company_id: company.id,
          name: formData.name,
          color: formData.color,
          is_active: formData.is_active,
        })

      if (error) {
        alert('Error al crear: ' + error.message)
      } else {
        alert('✅ Categoría creada')
      }
    }

    setSaving(false)
    setShowForm(false)
    setEditingCategory(null)
    setFormData({ name: '', color: '#F97316', is_active: true })
    loadCategories()
  }

  function handleEdit(category: Category) {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      color: category.color,
      is_active: category.is_active,
    })
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!company) return

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('company_id', company.id)

    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      alert('✅ Categoría eliminada')
      loadCategories()
    }
  }

  function handleCancel() {
    setShowForm(false)
    setEditingCategory(null)
    setFormData({ name: '', color: '#F97316', is_active: true })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/products">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categorías</h1>
            <p className="text-gray-600">Organiza tus productos por categorías</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-500 hover:bg-orange-600 gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Categoría
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nombre de la Categoría *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Hamburguesas, Bebidas, Postres..."
                  required
                  minLength={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      placeholder="#F97316"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Categoría activa</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingCategory ? 'Actualizando...' : 'Creando...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {editingCategory ? 'Actualizar' : 'Crear'}
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Categorías */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(category => (
          <Card key={category.id} className={!category.is_active ? 'opacity-60' : ''}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    <Package className="w-6 h-6" style={{ color: category.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        className="text-xs"
                        style={{ 
                          backgroundColor: category.is_active ? category.color + '20' : '#e5e7eb',
                          color: category.is_active ? category.color : '#6b7280'
                        }}
                      >
                        {category.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(category)}
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package className="w-4 h-4" />
                  <span>{category.products_count || 0} productos</span>
                </div>
                <div 
                  className="w-6 h-6 rounded-full border-2"
                  style={{ backgroundColor: category.color, borderColor: category.color }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sin categorías
            </h3>
            <p className="text-gray-600 mb-4">
              Crea tu primera categoría para organizar tus productos
            </p>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-orange-500 hover:bg-orange-600 gap-2"
            >
              <Plus className="w-4 h-4" />
              Crear Categoría
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}