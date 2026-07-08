'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createProduct(formData: FormData) {
  const supabase = await createClient()

  // 1. Obtener usuario y empresa
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: company } = await supabase
    .from('companies')
    .select('id, plan')
    .eq('owner_id', user.id)
    .single()

  if (!company) return { error: 'Empresa no encontrada' }

  // 2. VERIFICAR LÍMITE DEL PLAN
  const planLimits: any = {
    free: 10,
    pro: 100,
    enterprise: 999999,
  }

  const limit = planLimits[company.plan] || 10

  // Contar productos actuales
  const { count: currentCount, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', company.id)

  if (countError) {
    return { error: 'Error al verificar límite de productos' }
  }

  if (currentCount && currentCount >= limit) {
    return { 
      error: `Has alcanzado el límite de ${limit} productos de tu plan ${company.plan.toUpperCase()}. Actualiza tu plan para agregar más productos.` 
    }
  }

  // 3. Extraer datos
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const price = parseFloat(formData.get('price') as string)
  const stock = parseInt(formData.get('stock') as string)
  const stockMinimo = parseInt(formData.get('stockMinimo') as string) || 5
  const categoryId = formData.get('categoryId') as string
  const imagesString = formData.get('images') as string
  const images = imagesString ? JSON.parse(imagesString) : []

  // 4. Validaciones
  if (!name || name.length < 3) {
    return { error: 'El nombre debe tener al menos 3 caracteres' }
  }

  if (isNaN(price) || price <= 0) {
    return { error: 'El precio debe ser mayor a 0' }
  }

  if (isNaN(stock) || stock < 0) {
    return { error: 'El stock no puede ser negativo' }
  }

  // 5. Crear producto
  const { data, error } = await supabase
    .from('products')
    .insert({
      company_id: company.id,
      name: name.trim(),
      description: description?.trim() || null,
      price_usd: price,
      stock,
      stock_minimo: stockMinimo,
      category_id: categoryId || null,
      images: images.length > 0 ? images : null,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating product:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/products')
  return { success: true, productId: data.id }
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!company) return { error: 'Empresa no encontrada' }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const price = parseFloat(formData.get('price') as string)
  const stock = parseInt(formData.get('stock') as string)
  const stockMinimo = parseInt(formData.get('stockMinimo') as string) || 5
  const categoryId = formData.get('categoryId') as string
  const imagesString = formData.get('images') as string
  const images = imagesString ? JSON.parse(imagesString) : []

  if (!name || name.length < 3) {
    return { error: 'El nombre debe tener al menos 3 caracteres' }
  }

  if (isNaN(price) || price <= 0) {
    return { error: 'El precio debe ser mayor a 0' }
  }

  const { error } = await supabase
    .from('products')
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      price_usd: price,
      stock,
      stock_minimo: stockMinimo,
      category_id: categoryId || null,
      images: images.length > 0 ? images : null,
    })
    .eq('id', id)
    .eq('company_id', company.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/products')
  return { success: true }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!company) return { error: 'Empresa no encontrada' }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('company_id', company.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/products')
  return { success: true }
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!company) return { error: 'Empresa no encontrada' }

  const name = formData.get('name') as string
  const color = formData.get('color') as string

  if (!name || name.length < 2) {
    return { error: 'El nombre de la categoría es muy corto' }
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({
      company_id: company.id,
      name: name.trim(),
      color: color || '#F97316',
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/products')
  return { success: true, categoryId: data.id }
}

export async function uploadProductImage(file: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!company) return { error: 'Empresa no encontrada' }

  const imageFile = file.get('image') as File
  if (!imageFile) return { error: 'No se seleccionó ninguna imagen' }

  // Validar tipo de archivo
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(imageFile.type)) {
    return { error: 'Solo se permiten imágenes JPG, PNG o WebP' }
  }

  // Validar tamaño (max 5MB)
  if (imageFile.size > 5 * 1024 * 1024) {
    return { error: 'La imagen no puede superar los 5MB' }
  }

  // Generar nombre único
  const fileExt = imageFile.name.split('.').pop()
  const fileName = `${company.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

  // Subir a Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(fileName, imageFile, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return { error: uploadError.message }
  }

  // Obtener URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName)

  return { success: true, url: publicUrl }
}