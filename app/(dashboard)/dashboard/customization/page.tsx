'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Loader2, Type, Layout, Eye, Tag, Crown } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CustomizationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [plan, setPlan] = useState<string>('free')
  
  const [formData, setFormData] = useState({
    font_family: 'sans-serif',
    layout_type: 'grid',
    show_prices: true,
    show_descriptions: true,
    show_images: true,
    checkout_message: 'Al confirmar, se abrirá WhatsApp con el resumen de tu pedido',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (company) {
      setCompanyId(company.id)
      setPlan(company.plan || 'free')
      setFormData({
        font_family: company.font_family || 'sans-serif',
        layout_type: company.layout_type || 'grid',
        show_prices: company.show_prices ?? true,
        show_descriptions: company.show_descriptions ?? true,
        show_images: company.show_images ?? true,
        checkout_message: company.checkout_message || 'Al confirmar, se abrirá WhatsApp con el resumen de tu pedido',
      })
    }
    setLoading(false)
  }

  // 🔒 VERIFICAR PLAN PRO
  if (!loading && plan !== 'pro' && plan !== 'enterprise') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Personalización Avanzada
            </h1>
            <p className="text-gray-600 mb-6">
              Esta función está disponible solo para planes <strong>Pro</strong> y <strong>Enterprise</strong>
            </p>
            <div className="space-y-3">
              <Link href="/dashboard/plans">
                <Button className="w-full bg-orange-500 hover:bg-orange-600">
                  <Crown className="w-4 h-4 mr-2" />
                  Actualizar a Pro - $15/mes
                </Button>
              </Link>
              <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full">
                Volver al Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  async function handleSave() {
    if (!companyId) return
    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('companies')
      .update(formData)
      .eq('id', companyId)

    setSaving(false)

    if (error) {
      alert('Error al guardar: ' + error.message)
    } else {
      alert('✅ Personalización guardada')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    )
  }

  const fonts = [
    { id: 'sans-serif', name: 'Sans Serif (Default)', preview: 'font-sans' },
    { id: 'serif', name: 'Serif', preview: 'font-serif' },
    { id: 'poppins', name: 'Poppins', preview: 'font-poppins' },
    { id: 'montserrat', name: 'Montserrat', preview: 'font-montserrat' },
    { id: 'playfair', name: 'Playfair Display', preview: 'font-playfair' },
  ]

  const layouts = [
    { id: 'grid', name: 'Cuadrícula', icon: '⊞' },
    { id: 'list', name: 'Lista', icon: '☰' },
    { id: 'magazine', name: 'Magazine', icon: '▦' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Personalización</h1>
            <p className="text-sm text-gray-600">Personaliza la apariencia de tu catálogo</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </>
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* Tipografía */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Type className="w-5 h-5" />
              Tipografía
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Selecciona la fuente para tu catálogo público
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fonts.map(font => (
                <label
                  key={font.id}
                  className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                    formData.font_family === font.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="font"
                    value={font.id}
                    checked={formData.font_family === font.id}
                    onChange={(e) => setFormData({...formData, font_family: e.target.value})}
                    className="sr-only"
                  />
                  <div>
                    <p className="font-medium text-sm">{font.name}</p>
                    <p className={`text-lg mt-2 ${font.preview}`}>
                      Texto de ejemplo
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Layout */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layout className="w-5 h-5" />
              Diseño del Catálogo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Cómo se mostrarán los productos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {layouts.map(layout => (
                <label
                  key={layout.id}
                  className={`cursor-pointer border-2 rounded-lg p-4 transition-all text-center ${
                    formData.layout_type === layout.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="layout"
                    value={layout.id}
                    checked={formData.layout_type === layout.id}
                    onChange={(e) => setFormData({...formData, layout_type: e.target.value})}
                    className="sr-only"
                  />
                  <div className="text-4xl mb-2">{layout.icon}</div>
                  <p className="font-medium text-sm">{layout.name}</p>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Toggles de Visibilidad */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Elementos Visibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Controla qué información se muestra en el catálogo
            </p>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium">Mostrar Precios</p>
                  <p className="text-sm text-gray-600">Los clientes verán los precios</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.show_prices}
                  onChange={(e) => setFormData({...formData, show_prices: e.target.checked})}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium">Mostrar Descripciones</p>
                  <p className="text-sm text-gray-600">Las descripciones de los productos</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.show_descriptions}
                  onChange={(e) => setFormData({...formData, show_descriptions: e.target.checked})}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium">Mostrar Imágenes</p>
                  <p className="text-sm text-gray-600">Las fotos de los productos</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.show_images}
                  onChange={(e) => setFormData({...formData, show_images: e.target.checked})}
                  className="w-5 h-5"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Mensaje del Checkout */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Mensaje del Checkout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Texto que aparece al final del checkout
            </p>
            <textarea
              value={formData.checkout_message}
              onChange={(e) => setFormData({...formData, checkout_message: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Ej: Al confirmar, se abrirá WhatsApp..."
            />
          </CardContent>
        </Card>

        {/* Botón Guardar (móvil) */}
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full h-12 bg-orange-500 hover:bg-orange-600 sm:hidden"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Personalización
            </>
          )}
        </Button>
      </main>
    </div>
  )
}