'use server'

import { createClient } from '@/lib/supabase/server'

// Sube el comprobante al storage (bucket product-images, carpeta subscription/)
export async function uploadSubscriptionProof(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const file = formData.get('image') as File
  if (!file) return { error: 'No se seleccionó imagen' }
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) return { error: 'Solo JPG, PNG o WebP' }
  if (file.size > 5 * 1024 * 1024) return { error: 'La imagen no puede superar 5MB' }

  const ext = file.name.split('.').pop()
  const fileName = `subscription/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from('product-images')
    .upload(fileName, file, { cacheControl: '3600', upsert: false })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName)
  return { url: publicUrl }
}

// Crea la solicitud de upgrade/renovación (pending con comprobante)
export async function requestUpgrade(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const plan = formData.get('plan') as string
  const screenshotUrl = formData.get('screenshotUrl') as string
  const reference = formData.get('reference') as string
  const method = formData.get('method') as string
  const notes = formData.get('notes') as string

  const { data, error } = await supabase.rpc('request_subscription_upgrade', {
    p_plan_to: plan,
    p_screenshot_url: screenshotUrl,
    p_reference: reference || null,
    p_notes: notes || null,
    p_method: method || null,
  })
  if (error) return { error: error.message }
  if (data && (data as any).ok === false) return { error: (data as any).error || 'No se pudo enviar la solicitud' }

  return { success: true, type: (data as any)?.type }
}