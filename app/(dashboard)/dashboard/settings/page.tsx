'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Upload, 
  Save, 
  Palette, 
  Phone, 
  Building2, 
  Loader2,
  Crown,
  Eye,
  EyeOff,
  Layout,
  Type,
  Lock,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ========== TEMAS PREDEFINIDOS ==========
const PREDEFINED_THEMES = [
  {
    id: 'modern-orange',
    name: 'Moderno Naranja',
    primary: '#F97316',
    secondary: '#EAB308',
    accent: '#22C55E',
    background: '#F9FAFB',
    preview: 'bg-gradient-to-br from-orange-500 to-yellow-500'
  },
  {
    id: 'pastel-pink',
    name: 'Pastel Rosa',
    primary: '#EC4899',
    secondary: '#F472B6',
    accent: '#8B5CF6',
    background: '#FDF2F8',
    preview: 'bg-gradient-to-br from-pink-400 to-purple-400'
  },
  {
    id: 'ocean-blue',
    name: 'Océano Azul',
    primary: '#3B82F6',
    secondary: '#06B6D4',
    accent: '#10B981',
    background: '#F0F9FF',
    preview: 'bg-gradient-to-br from-blue-500 to-cyan-500'
  },
  {
    id: 'forest-green',
    name: 'Bosque Verde',
    primary: '#22C55E',
    secondary: '#84CC16',
    accent: '#F59E0B',
    background: '#F0FDF4',
    preview: 'bg-gradient-to-br from-green-500 to-lime-500'
  },
  {
    id: 'sunset',
    name: 'Atardecer',
    primary: '#F97316',
    secondary: '#EF4444',
    accent: '#EAB308',
    background: '#FFFBEB',
    preview: 'bg-gradient-to-br from-orange-500 to-red-500'
  },
  {
    id: 'midnight',
    name: 'Medianoche',
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#EC4899',
    background: '#F5F3FF',
    preview: 'bg-gradient-to-br from-indigo-500 to-purple-600'
  },
  {
    id: 'minimal-gray',
    name: 'Minimal Gris',
    primary: '#374151',
    secondary: '#6B7280',
    accent: '#F97316',
    background: '#FFFFFF',
    preview: 'bg-gradient-to-br from-gray-700 to-gray-500'
  },
  {
    id: 'coral-reef',
    name: 'Arrecife Coral',
    primary: '#F43F5E',
    secondary: '#FB7185',
    accent: '#14B8A6',
    background: '#FFF1F2',
    preview: 'bg-gradient-to-br from-rose-500 to-pink-400'
  }
]

// ========== TIPOGRAFÍAS ==========
const FONTS = [
  { id: 'sans', name: 'Sans Serif', class: 'font-sans' },
  { id: 'poppins', name: 'Poppins', class: 'font-poppins' },
  { id: 'montserrat', name: 'Montserrat', class: 'font-montserrat' },
  { id: 'playfair', name: 'Playfair', class: 'font-playfair' },
  { id: 'serif', name: 'Serif', class: 'font-serif' },
]

// ========== LAYOUTS ==========
const LAYOUTS = [
  { id: 'grid', name: 'Cuadrícula', icon: '⊞' },
  { id: 'list', name: 'Lista', icon: '☰' },
  { id: 'magazine', name: 'Revista', icon: '◫' },
]

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [companyPlan, setCompanyPlan] = useState<string>('free')
  const [isClient, setIsClient] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    whatsapp_number: '',
    email: '',
    primary_color: '#F97316',
    secondary_color: '#EAB308',
    accent_color: '#22C55E',
    background_color: '#F9FAFB',
    font_family: 'sans',
    layout_type: 'grid',
    show_prices: true,
    show_descriptions: true,
    show_images: true,
  })

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)

  useEffect(() => {
    setIsClient(true)
    loadCompanyData()
  }, [])

  async function loadCompanyData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (error) {
      console.error('Error cargando empresa:', error)
      setLoading(false)
      return
    }

    if (company) {
      setCompanyId(company.id)
      setCompanyPlan(company.plan || 'free')
      setFormData({
        name: company.name || '',
        description: company.description || '',
        whatsapp_number: company.whatsapp_number || '',
        email: company.email || '',
        primary_color: company.primary_color || '#F97316',
        secondary_color: company.secondary_color || '#EAB308',
        accent_color: company.accent_color || '#22C55E',
        background_color: company.background_color || '#F9FAFB',
        font_family: company.font_family || 'sans',
        layout_type: company.layout_type || 'grid',
        show_prices: company.show_prices !== false,
        show_descriptions: company.show_descriptions !== false,
        show_images: company.show_images !== false,
      })
      setLogoUrl(company.logo_url || null)
    }
    setLoading(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !companyId) return

    setUploadingLogo(true)
    const supabase = createClient()

    const fileExt = file.name.split('.').pop()
    const fileName = `${companyId}-logo-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      alert('Error al subir logo: ' + uploadError.message)
      setUploadingLogo(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)

    const { error: updateError } = await supabase
      .from('companies')
      .update({ logo_url: publicUrl })
      .eq('id', companyId)

    if (updateError) {
      alert('Error al actualizar logo: ' + updateError.message)
    } else {
      setLogoUrl(publicUrl)
    }
    setUploadingLogo(false)
  }

  function applyTheme(theme: any) {
    if (companyPlan === 'free') return
    
    setSelectedTheme(theme.id)
    setFormData({
      ...formData,
      primary_color: theme.primary,
      secondary_color: theme.secondary,
      accent_color: theme.accent,
      background_color: theme.background,
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) return

    setSaving(true)
    const supabase = createClient()

    // Solo actualizamos campos que SÍ existen en la BD
    // Filtramos los que podrían no existir
    const updateData: any = {
      name: formData.name,
      description: formData.description,
      whatsapp_number: formData.whatsapp_number,
      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
      accent_color: formData.accent_color,
    }

    // Solo agregar si tienen valor
    if (formData.email) updateData.email = formData.email
    if (formData.background_color) updateData.background_color = formData.background_color
    if (formData.font_family) updateData.font_family = formData.font_family
    if (formData.layout_type) updateData.layout_type = formData.layout_type

    // Booleanos
    updateData.show_prices = formData.show_prices
    updateData.show_descriptions = formData.show_descriptions
    updateData.show_images = formData.show_images

    const { error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', companyId)

    setSaving(false)

    if (error) {
      console.error('Error al guardar:', error)
      alert('Error al guardar: ' + error.message)
    } else {
      alert('✅ Configuración guardada exitosamente')
      await loadCompanyData()
    }
  }

  const isFree = companyPlan === 'free'

  if (loading || !isClient) {
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Configuración de Empresa</h1>
            <p className="text-sm text-gray-600">Personaliza tu catálogo y datos de contacto</p>
          </div>
          <Badge className={isFree ? 'bg-gray-100 text-gray-800' : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'}>
            {isFree ? 'Plan Gratuito' : 'Plan PRO'}
          </Badge>
        </div>
      </header>

      <form onSubmit={handleSave} className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* Logotipo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Logotipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-100"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-400">
                    {formData.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>{uploadingLogo ? 'Subiendo...' : 'Cargar Logo'}</span>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploadingLogo}
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Información General */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre de la Empresa *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Mi Empresa S.A."
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe tu empresa..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-5 h-5 text-orange-600" />
              Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="whatsapp">Número de WhatsApp *</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp_number}
                onChange={(e) => setFormData({...formData, whatsapp_number: e.target.value})}
                placeholder="+584121234567"
              />
              <p className="text-xs text-gray-600 mt-1">
                Formato: Código de país + número
              </p>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="contacto@tuempresa.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* ========== SECCIÓN PRO: TEMAS PREDEFINIDOS ========== */}
        <Card className={isFree ? 'opacity-75' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-600" />
                Temas Predefinidos
              </CardTitle>
              {isFree && (
                <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white gap-1">
                  <Crown className="w-3 h-3" />
                  PRO
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {isFree ? 'Disponible solo en Plan PRO' : 'Elige un tema predefinido para tu catálogo'}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PREDEFINED_THEMES.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => applyTheme(theme)}
                  disabled={isFree}
                  className={`relative p-3 rounded-lg border-2 transition-all ${
                    selectedTheme === theme.id 
                      ? 'border-purple-500 ring-2 ring-purple-200' 
                      : 'border-gray-200 hover:border-purple-300'
                  } ${isFree ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className={`h-12 rounded-md ${theme.preview} mb-2`} />
                  <p className="text-xs font-medium text-gray-700 text-center">{theme.name}</p>
                  {isFree && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ========== SECCIÓN PRO: PERSONALIZACIÓN AVANZADA ========== */}
        <Card className={isFree ? 'opacity-75' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Layout className="w-5 h-5 text-blue-600" />
                Personalización Avanzada
              </CardTitle>
              {isFree && (
                <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white gap-1">
                  <Crown className="w-3 h-3" />
                  PRO
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Colores Personalizados */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4" />
                Colores Corporativos
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs">Color Principal</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                      disabled={isFree}
                      className="w-10 h-9 rounded border cursor-pointer disabled:opacity-50"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                      disabled={isFree}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Color Secundario</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                      disabled={isFree}
                      className="w-10 h-9 rounded border cursor-pointer disabled:opacity-50"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                      disabled={isFree}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Color de Acento</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={formData.accent_color}
                      onChange={(e) => setFormData({...formData, accent_color: e.target.value})}
                      disabled={isFree}
                      className="w-10 h-9 rounded border cursor-pointer disabled:opacity-50"
                    />
                    <Input
                      value={formData.accent_color}
                      onChange={(e) => setFormData({...formData, accent_color: e.target.value})}
                      disabled={isFree}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Color de Fondo</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={formData.background_color}
                      onChange={(e) => setFormData({...formData, background_color: e.target.value})}
                      disabled={isFree}
                      className="w-10 h-9 rounded border cursor-pointer disabled:opacity-50"
                    />
                    <Input
                      value={formData.background_color}
                      onChange={(e) => setFormData({...formData, background_color: e.target.value})}
                      disabled={isFree}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tipografía */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Type className="w-4 h-4" />
                Tipografía
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {FONTS.map(font => (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => !isFree && setFormData({...formData, font_family: font.id})}
                    disabled={isFree}
                    className={`p-3 rounded-lg border-2 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      formData.font_family === font.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Layout */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Layout className="w-4 h-4" />
                Diseño del Catálogo
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {LAYOUTS.map(layout => (
                  <button
                    key={layout.id}
                    type="button"
                    onClick={() => !isFree && setFormData({...formData, layout_type: layout.id})}
                    disabled={isFree}
                    className={`p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      formData.layout_type === layout.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{layout.icon}</div>
                    <div className="text-xs font-medium">{layout.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mostrar/Ocultar */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                {formData.show_images ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Visibilidad de Elementos
              </Label>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center">
                      <span className="text-lg">🖼️</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Imágenes de productos</p>
                      <p className="text-xs text-gray-500">Mostrar fotos en el catálogo</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.show_images}
                    onChange={(e) => !isFree && setFormData({...formData, show_images: e.target.checked})}
                    disabled={isFree}
                    className="w-5 h-5 disabled:opacity-50"
                  />
                </label>

                <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-green-100 flex items-center justify-center">
                      <span className="text-lg">💲</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Precios</p>
                      <p className="text-xs text-gray-500">Mostrar precios visibles</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.show_prices}
                    onChange={(e) => !isFree && setFormData({...formData, show_prices: e.target.checked})}
                    disabled={isFree}
                    className="w-5 h-5 disabled:opacity-50"
                  />
                </label>

                <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-purple-100 flex items-center justify-center">
                      <span className="text-lg">📝</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Descripciones</p>
                      <p className="text-xs text-gray-500">Mostrar descripciones de productos</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.show_descriptions}
                    onChange={(e) => !isFree && setFormData({...formData, show_descriptions: e.target.checked})}
                    disabled={isFree}
                    className="w-5 h-5 disabled:opacity-50"
                  />
                </label>
              </div>
            </div>

            {isFree && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Crown className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Actualiza a Plan PRO</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Desbloquea personalización completa: temas, colores, fuentes y más opciones para hacer único tu catálogo.
                    </p>
                    <Link href="/dashboard/plans">
                      <Button size="sm" className="mt-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white">
                        Ver Planes
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vista Previa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vista Previa</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: formData.background_color }}
            >
              <div 
                className="p-4 rounded-lg text-white"
                style={{ backgroundColor: formData.primary_color }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{formData.name || 'Tu Empresa'}</h3>
                    <p className="text-sm opacity-90">Vista previa del header</p>
                  </div>
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                    style={{ backgroundColor: formData.accent_color }}
                  >
                    +
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botón Guardar */}
        <div className="sticky bottom-4 bg-white p-4 rounded-lg shadow-lg border">
          <Button 
            type="submit" 
            className="w-full h-12 text-base bg-orange-500 hover:bg-orange-600"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}