'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Aprobar un upgrade pendiente (el RPC re-valida admin dentro)
export async function adminApproveEvent(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

 const { data, error } = await supabase.rpc('approve_subscription_event', { p_event_id: eventId })
  if (error) return { error: error.message }
  if (data && (data as any).ok === false) return { error: (data as any).error || 'No se pudo aprobar' }

  // C2c-2c: sembrar categorias de restaurante al aprobar un upgrade.
  // Va por SECURITY DEFINER porque el admin NO es dueño de la empresa y el RLS
  // de categories bloquearia el insert desde su sesion. Best-effort: si falla,
  // el plan YA quedo aprobado (no rompemos la aprobacion por las categorias).
  try {
    await supabase.rpc('admin_seed_restaurant_categories', { p_event_id: eventId })
  } catch (e) {
    console.error('[seed] fallo siembra de categorias de restaurante', e)
  }

  revalidatePath('/admin')
  return { success: true }
}
// Rechazar un upgrade pendiente (no activa el plan)
export async function adminRejectEvent(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('reject_subscription_event', { p_event_id: eventId })
  if (error) return { error: error.message }
  if (data && (data as any).ok === false) return { error: (data as any).error || 'No se pudo rechazar' }

  revalidatePath('/admin')
  return { success: true }
}
// Agrega esto al final de app/admin/actions.ts

export async function changeCompanyPlan(companyId: string, newPlan: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // 1. Validar que sea super-admin
  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  // 2. Validar plan
  if (!['free', 'pro', 'enterprise'].includes(newPlan)) {
    return { error: 'Plan no válido' }
  }

  // 3. Calcular fecha de vencimiento
  const expiresAt = newPlan === 'free' 
    ? null 
    : newPlan === 'pro'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 días
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 días

  // 4. Actualizar en la base de datos
  const { error } = await supabase
    .from('companies')
    .update({ 
      plan: newPlan,
      plan_expires_at: expiresAt
    })
    .eq('id', companyId)

  if (error) return { error: error.message }

  // 5. Forzar recomputación del estado (active/past_due/archived)
  await supabase.rpc('recompute_subscription_status', { p_company_id: companyId })

  return { success: true }
}
