'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Upload, Save, Palette, Phone, Building2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    whatsapp_number: '',
    email: '',
    primary_color: '#F97316',
    secondary_color: '#EAB308',
    accent_color: '#22C55E',
  })

  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    loadCompanyData()
  }, [])

  async function loadCompanyData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Cargar TODAS las columnas para evitar errores
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
      setFormData({
        name: company.name || '',
        description: company.description || '',
        whatsapp_number: company.whatsapp_number || '',
        email: '',
        primary_color: company.primary_color || '#F97316',
        secondary_color: company.secondary_color || '#EAB308',
        accent_color: company.accent_color || '#22C55E',
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

    // Actualizar en la base de datos
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) return

    setSaving(true)
    const supabase = createClient()

    // Actualizar solo los campos que existen
    const updateData: any = {
      name: formData.name,
      description: formData.description,
      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
      accent_color: formData.accent_color,
    }

    // Solo agregar whatsapp_number si tiene valor
    if (formData.whatsapp_number) {
      updateData.whatsapp_number = formData.whatsapp_number
    }

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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Configuración de Empresa</h1>
            <p className="text-sm text-gray-600">Personaliza tu catálogo y datos de contacto</p>
          </div>
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
              
              <p className="text-xs text-gray-500 text-center">
                Tamaño recomendado: 500x500 px (cuadrado).<br />
                Formatos: JPG, PNG, WEBP. Máximo 5MB.
              </p>
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

        {/* Contacto - CRÍTICO */}
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-5 h-5 text-orange-600" />
              Contacto (CRÍTICO)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Importante:</strong> Sin el número de WhatsApp, tus clientes no podrán enviarte pedidos.
              </p>
            </div>

            <div>
              <Label htmlFor="whatsapp">Número de WhatsApp *</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp_number}
                onChange={(e) => setFormData({...formData, whatsapp_number: e.target.value})}
                placeholder="+584121234567"
              />
              <p className="text-xs text-gray-600 mt-1">
                Formato: Código de país + número (ej: +584121234567)
              </p>
            </div>

            <div>
              <Label htmlFor="email">Email (opcional)</Label>
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

        {/* Colores Corporativos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Colores Corporativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Personaliza los colores de tu catálogo público
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Color Principal</Label>
                <div className="flex gap-2 mt-2">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                    placeholder="#F97316"
                  />
                </div>
              </div>

              <div>
                <Label>Color Secundario</Label>
                <div className="flex gap-2 mt-2">
                  <input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                    placeholder="#EAB308"
                  />
                </div>
              </div>

              <div>
                <Label>Color de Acento</Label>
                <div className="flex gap-2 mt-2">
                  <input
                    type="color"
                    value={formData.accent_color}
                    onChange={(e) => setFormData({...formData, accent_color: e.target.value})}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={formData.accent_color}
                    onChange={(e) => setFormData({...formData, accent_color: e.target.value})}
                    placeholder="#22C55E"
                  />
                </div>
              </div>
            </div>

            {/* Vista Previa */}
            <div 
              className="mt-6 p-4 rounded-lg" 
              style={{ backgroundColor: formData.primary_color }}
            >
              <div className="flex items-center justify-between text-white">
                <div>
                  <h3 className="font-bold">{formData.name || 'Tu Empresa'}</h3>
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