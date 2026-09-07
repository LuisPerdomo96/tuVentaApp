'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPlan, checkProductLimit, checkImagesPerProduct, checkCategoryLimit, checkVariantsLimit } from '@/lib/plans'

// ============================================================
// PRODUCTOS
// ============================================================

export async function createProduct(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: company } = await supabase
    .from('companies')
    .select('id, plan')
    .eq('owner_id', user.id)
    .single()

  if (!company) return { error: 'Empresa no encontrada' }

  const plan = getPlan(company.plan)

  const { count: currentCount, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', company.id)

  if (countError) {
    return { error: 'Error al verificar límite de productos' }
  }

  const blocked = checkProductLimit(plan, currentCount || 0)
  if (blocked) {
    return { error: blocked }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const price = parseFloat(formData.get('price') as string)
  const stock = parseInt(formData.get('stock') as string)
  const stockMinimo = parseInt(formData.get('stockMinimo') as string) || 5
  const categoryId = formData.get('categoryId') as string
  const size = formData.get('size') as string
  const imagesString = formData.get('images') as string
  const images = imagesString ? JSON.parse(imagesString) : []
  
  // ← FIX: Leer y parsear colores del producto padre
  const colorsString = formData.get('colors') as string
  const colors = colorsString ? JSON.parse(colorsString) : []

  const blockedImages = checkImagesPerProduct(plan, images.length)
  if (blockedImages) {
    return { error: blockedImages }
  }

  if (!name || name.length < 3) {
    return { error: 'El nombre debe tener al menos 3 caracteres' }
  }

  if (isNaN(price) || price <= 0) {
    return { error: 'El precio debe ser mayor a 0' }
  }

  if (isNaN(stock) || stock < 0) {
    return { error: 'El stock no puede ser negativo' }
  }

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
      size: size?.trim() || null,
      images: images.length > 0 ? images : null,
      colors: colors.length > 0 ? colors : null, // ← FIX: Guardar colores
      is_active: true,
      has_variants: false,
      variant_options: [],
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
    .select('id, plan')
    .eq('owner_id', user.id)
    .single()

  if (!company) return { error: 'Empresa no encontrada' }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const price = parseFloat(formData.get('price') as string)
  const stock = parseInt(formData.get('stock') as string)
  const stockMinimo = parseInt(formData.get('stockMinimo') as string) || 5
  const categoryId = formData.get('categoryId') as string
  const size = formData.get('size') as string
  const imagesString = formData.get('images') as string
  const images = imagesString ? JSON.parse(imagesString) : []
  
  // ← FIX: Leer y parsear colores del producto padre
  const colorsString = formData.get('colors') as string
  const colors = colorsString ? JSON.parse(colorsString) : []

  const plan = getPlan(company.plan)
  const blockedImages = checkImagesPerProduct(plan, images.length)
  if (blockedImages) {
    return { error: blockedImages }
  }

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
      size: size?.trim() || null,
      images: images.length > 0 ? images : null,
      colors: colors.length > 0 ? colors : null, // ← FIX: Actualizar colores
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
    .select('id, plan')
    .eq('owner_id', user.id)
    .single()

  if (!company) return { error: 'Empresa no encontrada' }

  const plan = getPlan(company.plan)
  const { count: catCount, error: countErr } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', company.id)
  if (countErr) return { error: 'Error al verificar límite de categorías' }
  const blockedCat = checkCategoryLimit(plan, catCount || 0)
  if (blockedCat) return { error: blockedCat }

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

  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(imageFile.type)) {
    return { error: 'Solo se permiten imágenes JPG, PNG o WebP' }
  }

  if (imageFile.size > 5 * 1024 * 1024) {
    return { error: 'La imagen no puede superar los 5MB' }
  }

  const fileExt = imageFile.name.split('.').pop()
  const fileName = `${company.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

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

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName)

  return { success: true, url: publicUrl }
}

export async function createCategoryFromPage(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: company } = await supabase
    .from('companies')
    .select('id, plan')
    .eq('owner_id', user.id)
    .single()
  if (!company) return { error: 'Empresa no encontrada' }

  const plan = getPlan(company.plan)
  const { count: catCount, error: countErr } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', company.id)
  if (countErr) return { error: 'Error al verificar límite de categorías' }
  const blocked = checkCategoryLimit(plan, catCount || 0)
  if (blocked) return { error: blocked }

  const name = formData.get('name') as string
  const color = (formData.get('color') as string) || '#F97316'
  const isActive = formData.get('is_active') === 'true'

  if (!name || name.trim().length < 2) {
    return { error: 'El nombre de la categoría es muy corto' }
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({
      company_id: company.id,
      name: name.trim(),
      color,
      is_active: isActive,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/products/categories')
  revalidatePath('/dashboard/products')
  return { success: true, categoryId: data.id }
}

// ============================================================
// VARIANTES DE PRODUCTO
// ============================================================

export interface VariantInput {
  color: string
  colorHex: string
  size: string
  priceUsd?: number | null
  stock: number
  stockMinimo?: number
  images: string[]
  sku?: string
  isActive?: boolean
}

export async function createProductVariant(productId: string, input: VariantInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: product } = await supabase
    .from('products')
    .select('id, company_id, has_variants')
    .eq('id', productId)
    .single()

  if (!product) return { error: 'Producto no encontrado' }

  const { data: company } = await supabase
    .from('companies')
    .select('id, plan, owner_id')
    .eq('id', product.company_id)
    .single()

  if (!company || company.owner_id !== user.id) {
    return { error: 'No autorizado' }
  }

  const plan = getPlan(company.plan)

  const { count: variantCount } = await supabase
    .from('product_variants')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId)

  const blocked = checkVariantsLimit(plan, variantCount || 0)
  if (blocked) return { error: blocked }

  const isFirstVariant = !product.has_variants || (variantCount || 0) === 0

  const { data, error } = await supabase
    .from('product_variants')
    .insert({
      product_id: productId,
      color: input.color.trim(),
      color_hex: input.colorHex,
      size: input.size?.trim() || null,
      price_usd: input.priceUsd ?? null,
      stock: input.stock,
      stock_minimo: input.stockMinimo || 5,
      images: input.images.length > 0 ? input.images : [],
      sku: input.sku?.trim() || null,
      is_active: input.isActive !== false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating variant:', error)
    return { error: error.message }
  }

  if (isFirstVariant) {
    await supabase
      .from('products')
      .update({
        has_variants: true,
        default_variant_id: data.id,
        variant_options: [{ type: 'color', label: 'Color' }, ...(input.size ? [{ type: 'size', label: 'Talla' }] : [])],
      })
      .eq('id', productId)
  }

  revalidatePath('/dashboard/products')
  revalidatePath(`/dashboard/products/${productId}/edit`)
  return { success: true, variantId: data.id }
}

export async function updateProductVariant(variantId: string, input: Partial<VariantInput>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, product_id')
    .eq('id', variantId)
    .single()

  if (!variant) return { error: 'Variante no encontrada' }

  const { data: product } = await supabase
    .from('products')
    .select('company_id')
    .eq('id', variant.product_id)
    .single()

  if (!product) return { error: 'Producto no encontrado' }

  const { data: company } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', product.company_id)
    .single()

  if (!company || company.owner_id !== user.id) {
    return { error: 'No autorizado' }
  }

  const updateData: any = {}
  if (input.color !== undefined) updateData.color = input.color.trim()
  if (input.colorHex !== undefined) updateData.color_hex = input.colorHex
  if (input.size !== undefined) updateData.size = input.size?.trim() || null
  if (input.priceUsd !== undefined) updateData.price_usd = input.priceUsd ?? null
  if (input.stock !== undefined) updateData.stock = input.stock
  if (input.stockMinimo !== undefined) updateData.stock_minimo = input.stockMinimo
  if (input.images !== undefined) updateData.images = input.images.length > 0 ? input.images : []
  if (input.sku !== undefined) updateData.sku = input.sku?.trim() || null
  if (input.isActive !== undefined) updateData.is_active = input.isActive

  const { error } = await supabase
    .from('product_variants')
    .update(updateData)
    .eq('id', variantId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/products')
  revalidatePath(`/dashboard/products/${variant.product_id}/edit`)
  return { success: true }
}

export async function deleteProductVariant(variantId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, product_id')
    .eq('id', variantId)
    .single()

  if (!variant) return { error: 'Variante no encontrada' }

  const { data: product } = await supabase
    .from('products')
    .select('company_id, default_variant_id')
    .eq('id', variant.product_id)
    .single()

  if (!product) return { error: 'Producto no encontrado' }

  const { data: company } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', product.company_id)
    .single()

  if (!company || company.owner_id !== user.id) {
    return { error: 'No autorizado' }
  }

  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', variantId)

  if (error) {
    return { error: error.message }
  }

  if (product.default_variant_id === variantId) {
    await supabase
      .from('products')
      .update({ default_variant_id: null })
      .eq('id', variant.product_id)
  }

  const { count: remaining } = await supabase
    .from('product_variants')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', variant.product_id)

  if ((remaining || 0) === 0) {
    await supabase
      .from('products')
      .update({
        has_variants: false,
        default_variant_id: null,
        variant_options: [],
      })
      .eq('id', variant.product_id)
  }

  revalidatePath('/dashboard/products')
  revalidatePath(`/dashboard/products/${variant.product_id}/edit`)
  return { success: true }
}

export async function setDefaultVariant(productId: string, variantId: string | null) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: product } = await supabase
    .from('products')
    .select('company_id')
    .eq('id', productId)
    .single()

  if (!product) return { error: 'Producto no encontrado' }

  const { data: company } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', product.company_id)
    .single()

  if (!company || company.owner_id !== user.id) {
    return { error: 'No autorizado' }
  }

  const { error } = await supabase
    .from('products')
    .update({ default_variant_id: variantId })
    .eq('id', productId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/products')
  return { success: true }
}

export async function updateProductVariantOptions(productId: string, options: { type: string; label: string }[]) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: product } = await supabase
    .from('products')
    .select('company_id')
    .eq('id', productId)
    .single()

  if (!product) return { error: 'Producto no encontrado' }

  const { data: company } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', product.company_id)
    .single()

  if (!company || company.owner_id !== user.id) {
    return { error: 'No autorizado' }
  }

  const { error } = await supabase
    .from('products')
    .update({ variant_options: options })
    .eq('id', productId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/products')
  return { success: true }
}