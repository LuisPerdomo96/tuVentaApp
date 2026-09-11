'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { verifyTOTPToken, generateTOTPQRCode } from '@/lib/security'
import { cookies } from 'next/headers'

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

  revalidatePath('/admin')
  return { success: true }
}
// Bloquear usuario
export async function adminBlockUser(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('admin_block_user', { p_user_id: userId })
  if (error) return { error: error.message }
  
  revalidatePath('/admin/usuarios')
  return { success: true }
}

// Desbloquear usuario
export async function adminUnblockUser(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('admin_unblock_user', { p_user_id: userId })
  if (error) return { error: error.message }
  
  revalidatePath('/admin/usuarios')
  return { success: true }
}

// Eliminar usuario
export async function adminDeleteUser(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('admin_delete_user', { p_user_id: userId })
  if (error) return { error: error.message }
  
  revalidatePath('/admin/usuarios')
  return { success: true }
}

// Verificar email de usuario
export async function adminVerifyEmail(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('admin_verify_user_email', { p_user_id: userId })
  if (error) return { error: error.message }
  
  revalidatePath('/admin/usuarios')
  return { success: true }
}
// Crear cupón
export async function adminCreateCoupon(
  code: string,
  discountType: string,
  discountValue: number,
  maxUses: number = 0,
  validDays: number = 30
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('admin_create_coupon', {
    p_code: code,
    p_discount_type: discountType,
    p_discount_value: discountValue,
    p_max_uses: maxUses,
    p_valid_days: validDays
  })
  
  if (error) return { error: error.message }
  
  revalidatePath('/admin/suscripciones')
  return { success: true }
}

// Iniciar trial
export async function adminStartTrial(companyId: string, plan: string, trialDays: number = 7) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('start_trial', {
    p_company_id: companyId,
    p_plan: plan,
    p_trial_days: trialDays
  })
  
  if (error) return { error: error.message }
  if (data && (data as any).error) return { error: (data as any).error }
  
  revalidatePath('/admin/suscripciones')
  return { success: true }
}

// Convertir trial a pago
export async function adminConvertTrialToPaid(companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('convert_trial_to_paid', {
    p_company_id: companyId
  })
  
  if (error) return { error: error.message }
  if (data && (data as any).error) return { error: (data as any).error }
  
  revalidatePath('/admin/suscripciones')
  return { success: true }
}
// Iniciar trial para empresa específica
export async function adminStartTrialForCompany(companyId: string, plan: string, trialDays: number = 7) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('admin_start_trial_for_company', {
    p_company_id: companyId,
    p_plan: plan,
    p_trial_days: trialDays
  })
  
  if (error) return { error: error.message }
  if (data && (data as any).error) return { error: (data as any).error }
  
  revalidatePath('/admin/trials')
  revalidatePath('/admin/tiendas')
  return { success: true }
}

// Extender trial
export async function adminExtendTrial(trialId: string, extraDays: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('admin_extend_trial', {
    p_trial_id: trialId,
    p_extra_days: extraDays
  })
  
  if (error) return { error: error.message }
  if (data && (data as any).error) return { error: (data as any).error }
  
  revalidatePath('/admin/trials')
  return { success: true }
}

// Cancelar trial
export async function adminCancelTrial(trialId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('admin_cancel_trial', {
    p_trial_id: trialId
  })
  
  if (error) return { error: error.message }
  if (data && (data as any).error) return { error: (data as any).error }
  
  revalidatePath('/admin/trials')
  revalidatePath('/admin/tiendas')
  return { success: true }
}
// Obtener variables del sistema
export async function adminGetSystemSettings(category?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('admin_get_system_settings', {
    p_category: category || null
  })
  
  if (error) return { error: error.message }
  
  return { success: true, data: data || [] }
}

// Actualizar variable del sistema
export async function adminUpdateSetting(key: string, value: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('admin_update_setting', {
    p_key: key,
    p_value: value,
    p_user_id: user.id
  })
  
  if (error) return { error: error.message }
  if (data && (data as any).error) return { error: (data as any).error }
  
  revalidatePath('/admin/configuracion')
  return { success: true }
}

// Obtener planes configurados
export async function adminGetPlansConfig() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('admin_get_plans_config')
  
  if (error) return { error: error.message }
  
  return { success: true, data: data || [] }
}

// Actualizar plan
export async function adminUpdatePlan(planData: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('admin_update_plan', {
    p_plan_key: planData.plan_key,
    p_name: planData.name,
    p_display_name: planData.display_name,
    p_price_usd: planData.price_usd,
    p_billing_cycle: planData.billing_cycle,
    p_duration_days: planData.duration_days,
    p_is_active: planData.is_active,
    p_is_featured: planData.is_featured,
    p_features: planData.features,
    p_limits: planData.limits,
    p_color: planData.color,
    p_icon: planData.icon,
    p_description: planData.description,
    p_sort_order: planData.sort_order,
    p_user_id: user.id
  })
  
  if (error) return { error: error.message }
  if (data && (data as any).error) return { error: (data as any).error }
  
  revalidatePath('/admin/configuracion')
  return { success: true }
}

// Obtener historial de cambios
export async function adminGetConfigChangeLog(limit: number = 50) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('admin_get_config_change_log', {
    p_limit: limit
  })
  
  if (error) return { error: error.message }
  
  return { success: true, data: data || [] }
}

// Obtener estadísticas de configuración
export async function adminGetConfigStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('admin_get_config_stats')
  
  if (error) return { error: error.message }
  
  return { success: true, data: data || {} }
}

// =================================================================
// FUNCIONES 2FA (Unificadas para coincidir con UI y lib/security)
// =================================================================

// 1. Generar configuración 2FA
export async function adminGenerate2FA() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('admin_generate_2fa_secret')
  if (error) return { error: error.message }
  if (data && (data as any).error) return { error: (data as any).error }

  const secret = (data as any).secret
  const backupCodes = (data as any).backup_codes
  
  // Generar QR usando la librería segura que creamos
  const qrCode = await generateTOTPQRCode(user.email || '', secret)

  return { 
    success: true, 
    data: { secret, qrCode, backupCodes } 
  }
}

// 2. Activar 2FA
export async function adminEnable2FA(token: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  // Obtener el secret actual para verificar en el servidor
  const { data: secret } = await supabase.rpc('admin_get_2fa_secret_for_verification')
  if (!secret) return { error: 'Primero genera la configuración 2FA' }

  // Verificar el token TOTP localmente con otplib
  const isValid = verifyTOTPToken(token, secret)
  if (!isValid) return { error: 'Código 2FA inválido. Intenta de nuevo.' }

  // Si es válido, activar en la BD
  const { data, error } = await supabase.rpc('admin_enable_2fa')
  if (error) return { error: error.message }
  if (data && (data as any).error) return { error: (data as any).error }

  revalidatePath('/admin/2fa')
  return { success: true }
}

// 3. Desactivar 2FA
export async function adminDisable2FA() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) return { error: 'No autorizado' }

  const { data, error } = await supabase.rpc('admin_disable_2fa')
  if (error) return { error: error.message }
  if (data && (data as any).error) return { error: (data as any).error }

  const cookieStore = await cookies()
  cookieStore.delete('2fa_verified')

  revalidatePath('/admin/2fa')
  return { success: true }
}

// 4. Verificar 2FA durante el login
export async function adminVerify2FALogin(token: string, useBackupCode: boolean = false) {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const pendingUserId = cookieStore.get('2fa_pending_user')?.value
  
  if (!pendingUserId) {
    return { error: 'Sesión expirada. Inicia sesión de nuevo.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== pendingUserId) {
    return { error: 'Usuario no coincide. Inicia sesión de nuevo.' }
  }

  if (useBackupCode) {
    const { data, error } = await supabase.rpc('admin_use_backup_code', { p_code: token })
    if (error) return { error: 'Error al verificar código de respaldo' }
    if (data && (data as any).error) return { error: (data as any).error }
  } else {
    const { data: secret } = await supabase.rpc('admin_get_2fa_secret_for_verification')
    if (!secret) return { error: '2FA no está configurado correctamente' }
    
    const isValid = verifyTOTPToken(token, secret)
    if (!isValid) return { error: 'Código 2FA inválido. Intenta de nuevo.' }
  }

  cookieStore.set('2fa_verified', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 // 7 días
  })
  cookieStore.delete('2fa_pending_user')

  revalidatePath('/', 'layout')
  return { success: true }
}

// 5. Obtener estado 2FA
export async function adminGet2FAStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', data: null }

  const { data, error } = await supabase.rpc('admin_get_2fa_status')
  if (error) return { error: error.message, data: null }
  
  return { 
    success: true, 
    data: data || { is_enabled: false, remaining_backup_codes: 0 } 
  }
}