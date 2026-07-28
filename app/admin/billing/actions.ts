'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Sube el QR al storage (bucket product-images, carpeta saas/)
export async function uploadQr(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const file = formData.get('image') as File
  if (!file) return { error: 'No se seleccionó imagen' }
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) return { error: 'Solo JPG, PNG o WebP' }
  if (file.size > 5 * 1024 * 1024) return { error: 'La imagen no puede superar 5MB' }

  const ext = file.name.split('.').pop()
  const fileName = `saas/qr/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from('product-images')
    .upload(fileName, file, { cacheControl: '3600', upsert: false })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName)
  return { url: publicUrl }
}

// Crea o edita un método de cobro del SaaS (arma details por tipo; el RPC valida admin)
export async function upsertSaasMethod(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const id = (formData.get('id') as string) || null
  const type = formData.get('type') as string
  const name = formData.get('name') as string
  const isActive = formData.get('is_active') === 'true'
  const description = (formData.get('description') as string) || null
  const sort = parseInt(formData.get('sort') as string) || 0
  const qrUrl = (formData.get('qr_url') as string) || null

  let details: any = {}
  if (type === 'pago_movil') {
    details = {
      banco: formData.get('banco') as string,
      telefono: formData.get('telefono') as string,
      cedula: formData.get('cedula') as string,
    }
  } else if (type === 'binance') {
    details = { binance_id: formData.get('binance_id') as string }
  } else {
    details = { email: formData.get('email') as string }
  }
  if (qrUrl) details.qr_url = qrUrl

  const { data, error } = await supabase.rpc('admin_upsert_saas_payment_method', {
    p_id: id,
    p_type: type,
    p_name: name,
    p_is_active: isActive,
    p_details: details,
    p_description: description,
    p_sort: sort,
  })
  if (error) return { error: error.message }
  if (data && (data as any).ok === false) return { error: (data as any).error || 'No se pudo guardar' }

  revalidatePath('/admin/billing')
  return { success: true }
}

// Guarda tasa + soporte (el RPC valida admin)
export async function saveSaasSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const rate = parseFloat(formData.get('exchange_rate') as string)
  const whatsapp = ((formData.get('support_whatsapp') as string) || '').trim() || null
  const email = ((formData.get('support_email') as string) || '').trim() || null

  const { data, error } = await supabase.rpc('admin_upsert_saas_settings', {
    p_exchange_rate: isNaN(rate) ? null : rate,
    p_support_whatsapp: whatsapp,
    p_support_email: email,
  })
  if (error) return { error: error.message }
  if (data && (data as any).ok === false) return { error: (data as any).error || 'No se pudo guardar' }

  revalidatePath('/admin/billing')
  return { success: true }
}