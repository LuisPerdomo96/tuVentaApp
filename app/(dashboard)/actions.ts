'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PLANS, daysForBilling, getPlan, checkQrLimit, DEFAULT_COMPANY_THEME, type PlanId } from '@/lib/plans'

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
      plan: 'free',
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


  const newPlan = getPlan('free') // plan con el que nace la empresa
  const fullDefaults = type === 'restaurant'
    ? ['Entradas', 'Platos Principales', 'Bebidas', 'Postres']
    : ['General']
  const defaultCategories = newPlan.id === 'free'
    ? ['General']
    : fullDefaults.slice(0, newPlan.maxCategories)

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
// =========================================================
//  UPGRADE / CAMBIO DE PLAN  (server-side, seguro)
// =========================================================
export async function upgradePlan(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const target = formData.get('plan') as string
  const plan = PLANS[target as PlanId]
  if (!plan) return { error: 'Plan no válido' }

  const { data: company } = await supabase
    .from('companies')
    .select('id, plan, type')
    .eq('owner_id', user.id)
    .single()
  if (!company) return { error: 'Empresa no encontrada' }
  if (company.plan === plan.id) return { error: 'Ya tienes este plan' }

  // Vencimiento según ciclo (free = sin vencimiento)
  const expiresAt =
    plan.billing === 'none'
      ? null
      : new Date(Date.now() + daysForBilling(plan.billing) * 24 * 60 * 60 * 1000).toISOString()

  // Armamos el payload del cambio de plan
  const updatePayload: any = { plan: plan.id, plan_expires_at: expiresAt }

  // Si el plan destino NO incluye personalización avanzada (ej. Free),
  // RESETEAMOS la cosmética a los predeterminados: la personalización es un
  // beneficio que se paga; sin plan pago, el catálogo vuelve al tema base.
  // (NO borra productos/pedidos/categorías: eso sigue protegido por la política C.)
  if (!plan.advancedCustomization) {
    Object.assign(updatePayload, DEFAULT_COMPANY_THEME)
  }

  // Doble candado: solo el dueño de ESTA empresa puede cambiarla
  const { error } = await supabase
    .from('companies')
    .update(updatePayload)
    .eq('id', company.id)
    .eq('owner_id', user.id)
  if (error) return { error: error.message }
  
  // Sembrar plantillas de restaurant al subir a un plan con >1 categoría
  if (plan.maxCategories > 1 && company.type === 'restaurant') {
    const templates = ['Entradas', 'Platos Principales', 'Bebidas', 'Postres']
    const { data: existing } = await supabase
      .from('categories')
      .select('name')
      .eq('company_id', company.id)
    const have = new Set((existing || []).map((c) => (c.name || '').toLowerCase()))
    const room = Math.max(0, plan.maxCategories - (existing?.length || 0))
    const toAdd = templates.filter((t) => !have.has(t.toLowerCase())).slice(0, room)
    for (let i = 0; i < toAdd.length; i++) {
      await supabase.from('categories').insert({
        company_id: company.id,
        name: toAdd[i],
        color: '#F97316',
        is_active: true,
        sort_order: i,
      })
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/plans')
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/products/categories')
  return { success: true, plan: plan.id }
}
// =========================================================
//  AGREGAR QR DE MESA  (server-side, con límite por plan)
// =========================================================
export async function addTableQr(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: company } = await supabase
    .from('companies')
    .select('id, plan')
    .eq('owner_id', user.id)
    .single()
  if (!company) return { error: 'Empresa no encontrada' }

  const tableNumber = (formData.get('table_number') as string)?.trim()
  if (!tableNumber) return { error: 'Ingresa un número de mesa' }

  // Enforcement: límite de QR/mesas por plan (fuente única: lib/plans.ts)
  const plan = getPlan(company.plan)
  const { count: qrCount, error: countErr } = await supabase
    .from('table_qrs')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', company.id)
  if (countErr) return { error: 'Error al verificar límite de QR' }
  const blocked = checkQrLimit(plan, qrCount || 0)
  if (blocked) return { error: blocked }

  // Evitar mesa duplicada (ahora validado en el servidor)
  const { data: dup } = await supabase
    .from('table_qrs')
    .select('id')
    .eq('company_id', company.id)
    .eq('table_number', tableNumber)
    .maybeSingle()
  if (dup) return { error: 'Ya existe una mesa con ese número' }

  const { error } = await supabase
    .from('table_qrs')
    .insert({ company_id: company.id, table_number: tableNumber })
  if (error) return { error: error.message }

  revalidatePath('/dashboard/qr')
  return { success: true }
}
// =========================================================
//  GUARDAR CONFIGURACIÓN DE EMPRESA  (server-side, seguro)
//  - campos básicos: siempre se guardan (todos los planes)
//  - campos de personalización avanzada: SOLO si el plan lo permite;
//    si no, el servidor los IGNORA (no los borra, no rebota el guardado)
// =========================================================
export async function saveCompanySettings(formData: FormData) {
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

  // --- Campos básicos: permitidos en TODOS los planes ---
  const name = (formData.get('name') as string)?.trim()
  if (!name || name.length < 2) {
    return { error: 'El nombre de la empresa es obligatorio' }
  }

  const updateData: any = {
    name,
    description: (formData.get('description') as string)?.trim() || null,
    whatsapp_number: (formData.get('whatsapp_number') as string)?.trim() || null,
  }
  const email = (formData.get('email') as string)?.trim()
  if (email) updateData.email = email

  // --- Campos premium: SOLO si el plan tiene personalización avanzada ---
  //     Si el plan NO la tiene, estos campos NO entran al update → quedan como estaban.
  if (plan.advancedCustomization) {
    const bg = (formData.get('background_color') as string)?.trim()
    updateData.primary_color = formData.get('primary_color') as string
    updateData.secondary_color = formData.get('secondary_color') as string
    updateData.accent_color = formData.get('accent_color') as string
    if (bg) updateData.background_color = bg
    updateData.font_family = formData.get('font_family') as string
    updateData.layout_type = formData.get('layout_type') as string
    updateData.show_prices = formData.get('show_prices') === 'true'
    updateData.show_descriptions = formData.get('show_descriptions') === 'true'
    updateData.show_images = formData.get('show_images') === 'true'
  }

  // Doble candado: solo el dueño de ESTA empresa la modifica
  const { error } = await supabase
    .from('companies')
    .update(updateData)
    .eq('id', company.id)
    .eq('owner_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  return { success: true }
}