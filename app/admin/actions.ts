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