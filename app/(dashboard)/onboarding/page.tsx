'use client'

import { useState, useEffect } from 'react'
import { createCompany, checkSlugAvailability } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugStatus, setSlugStatus] = useState<{
    available: boolean
    message: string
    slug?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-generar slug cuando cambia el nombre (si el usuario no ha editado el slug)
  useEffect(() => {
    if (name && !slug) {
      const timer = setTimeout(() => {
        checkSlugAvailability(name).then(setSlugStatus)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [name, slug])

  // Verificar slug cuando el usuario lo edita manualmente
  useEffect(() => {
    if (slug) {
      const timer = setTimeout(() => {
        checkSlugAvailability(slug).then(setSlugStatus)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [slug])

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    setError(null)
    
    const result = await createCompany(formData)
    
    if (result?.error) {
      setError(result.error)
      setIsSubmitting(false)
    }
    // Si no hay error, el redirect se hace en la server action
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white px-4 py-8 sm:py-12">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Crea tu Empresa
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Completa la información para comenzar a usar la plataforma
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Información del Negocio</CardTitle>
            <CardDescription className="text-sm">
              Esta información aparecerá en tu catálogo público
            </CardDescription>
          </CardHeader>
          
          <form action={handleSubmit}>
            <CardContent className="space-y-5 sm:space-y-6">
              {/* Error Message */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Nombre de la Empresa */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nombre de la Empresa *
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Mi Restaurante S.A."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={3}
                  className="text-base h-11"
                />
              </div>

              {/* Tipo de Negocio */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Tipo de Negocio *
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="restaurant"
                      className="peer sr-only"
                      required
                    />
                    <div className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg peer-checked:border-orange-500 peer-checked:bg-orange-50 transition-all">
                      <span className="text-2xl mb-1">🍽️</span>
                      <span className="text-sm font-medium">Restaurante</span>
                    </div>
                  </label>
                  <label className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="retail"
                      className="peer sr-only"
                      required
                    />
                    <div className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg peer-checked:border-orange-500 peer-checked:bg-orange-50 transition-all">
                      <span className="text-2xl mb-1">🛍️</span>
                      <span className="text-sm font-medium">Tienda</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Identificador Único (Slug) */}
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-sm font-medium">
                  Identificador Único (URL)
                </Label>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border">
                  <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                    tuventa.app/
                  </span>
                  <Input
                    id="slug"
                    name="slug"
                    type="text"
                    placeholder="mi-restaurante"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    pattern="[a-z0-9\-]+"
                    className="border-0 bg-transparent p-0 focus-visible:ring-0 text-base"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Solo letras minúsculas, números y guiones
                </p>
                
                {/* Status del Slug */}
                {slugStatus && (
                  <p className={`text-xs font-medium ${
                    slugStatus.available ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {slugStatus.available ? '✓' : '✗'} {slugStatus.message}
                    {slugStatus.slug && slugStatus.slug !== slug && (
                      <span className="ml-1 text-gray-500">
                        (Se usará: {slugStatus.slug})
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Descripción (opcional)
                </Label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Describe tu empresa..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-orange-500 hover:bg-orange-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creando...' : 'Crear Empresa'}
              </Button>

              <p className="text-xs text-center text-gray-500">
                Podrás editar esta información después desde tu panel
              </p>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  )
}