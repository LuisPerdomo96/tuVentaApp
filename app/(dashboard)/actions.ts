'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Función para convertir texto a slug válido
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // Remover acentos
    .replace(/[\u0300-\u036f]/g, '') // Eliminar diacríticos
    .replace(/\s+/g, '-') // Espacios por guiones
    .replace(/[^\w\-]+/g, '') // Solo letras, números y guiones
    .replace(/\-\-+/g, '-') // Múltiples guiones por uno solo
    .replace(/^-+/, '') // Quitar guiones al inicio
    .replace(/-+$/, '') // Quitar guiones al final
}

export async function createCompany(formData: FormData) {
  const supabase = await createClient()

  // 1. Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Debes iniciar sesión' }
  }

  // 2. Extraer datos del formulario
  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const customSlug = formData.get('slug') as string

  // 3. Validaciones
  if (!name || name.trim().length < 3) {
    return { error: 'El nombre debe tener al menos 3 caracteres' }
  }

  if (!type || !['restaurant', 'retail'].includes(type)) {
    return { error: 'Selecciona un tipo de negocio válido' }
  }

  // 4. Generar slug
  const slug = customSlug && customSlug.trim() 
    ? slugify(customSlug) 
    : slugify(name)

  if (!slug || slug.length < 3) {
    return { error: 'El identificador debe tener al menos 3 caracteres' }
  }

  // 5. Verificar que el slug no exista
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existingCompany) {
    return { error: 'Este identificador ya está en uso. Prueba con otro.' }
  }

  // 6. Verificar que el usuario no tenga ya una empresa (por ahora limitamos a 1)
  const { data: userCompanies } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
  
  if (userCompanies && userCompanies.length > 0) {
    return { error: 'Ya tienes una empresa creada' }
  }

  // 7. Crear la empresa
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      owner_id: user.id,
      name: name.trim(),
      slug,
      type,
      description: description?.trim() || null,
    })
    .select()
    .single()

  if (companyError || !company) {
    return { error: 'Error al crear la empresa: ' + (companyError?.message || 'Desconocido') }
  }

  // 8. Crear configuración por defecto
  const { error: settingsError } = await supabase
    .from('company_settings')
    .insert({
      company_id: company.id,
      show_prices: true,
      show_images: true,
      layout_type: 'grid',
    })

  if (settingsError) {
    console.error('Error creando settings:', settingsError)
    // No retornamos error porque la empresa ya se creó
  }

  // 9. Crear categorías por defecto según el tipo de negocio
  const defaultCategories = type === 'restaurant' 
    ? ['Entradas', 'Platos Principales', 'Bebidas', 'Postres']
    : ['General']

  for (let i = 0; i < defaultCategories.length; i++) {
    await supabase.from('categories').insert({
      company_id: company.id,
      name: defaultCategories[i],
      sort_order: i,
    })
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// Función para verificar disponibilidad del slug en tiempo real
export async function checkSlugAvailability(slug: string) {
  const supabase = await createClient()
  
  const cleanSlug = slugify(slug)
  
  if (!cleanSlug || cleanSlug.length < 3) {
    return { available: false, message: 'Mínimo 3 caracteres' }
  }

  const { data } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', cleanSlug)
    .single()

  if (data) {
    return { available: false, message: 'Este identificador ya está en uso' }
  }

  return { available: true, message: '¡Disponible!', slug: cleanSlug }
}