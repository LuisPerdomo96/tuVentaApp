'use server'

import { createClient } from '@/lib/supabase/server'
import { sendTelegramHtml, escapeHtml } from '@/lib/telegram'

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

  // Notificar al dueño del SaaS por Telegram (best-effort; NUNCA rompe el registro del pago).
  // Trigger único: toda solicitud de upgrade/renovación pasa por esta server action.
  try {
    const { data: company } = await supabase
      .from('companies')
      .select('name, slug, plan')
      .eq('owner_id', user.id)
      .single()

    const planFrom = (company?.plan || 'free').toUpperCase()
    const planTo = plan.toUpperCase()
    const isRenewal = (data as any)?.type === 'renewal'
    const cycleLabel = plan === 'enterprise' ? 'trimestral' : 'mensual'
    const amountLabel = plan === 'enterprise' ? '19.99' : '4.99'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tu-venta-app.vercel.app'

    const html =
      `🔔 <b>Nuevo pago del SaaS pendiente</b>\n` +
      `🏪 Tienda: <b>${escapeHtml(company?.name || '?')}</b> (/${escapeHtml(company?.slug || '?')})\n` +
      `👤 Dueño: ${escapeHtml(user.email || '?')}\n` +
      `${isRenewal ? '🔁 Renovación' : '⬆️ Upgrade'}: ${planFrom} → <b>${planTo}</b> (${cycleLabel})\n` +
      `💵 Monto: <b>$${amountLabel}</b>\n` +
      (screenshotUrl ? `📎 <a href="${escapeHtml(screenshotUrl)}">Ver comprobante</a>\n` : '') +
      `🔗 <a href="${appUrl}/admin">Aprobar en /admin</a>`

    await sendTelegramHtml(html)
  } catch (e) {
    console.error('[notify] falló notificación SaaS', e) // no propago: el pago ya quedó registrado
  }

  return { success: true, type: (data as any)?.type }
}