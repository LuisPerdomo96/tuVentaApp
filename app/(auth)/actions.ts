'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const MAX_ATTEMPTS = 3
const LOCKOUT_MINUTES = 15

// ==================== LOGIN ====================
export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string).toLowerCase().trim()
  const password = formData.get('password') as string

  // 1. Verificar si está bloqueado
  const { data: attempt } = await supabase
    .from('login_attempts')
    .select('*')
    .eq('email', email)
    .single()

  if (attempt?.locked_until && new Date(attempt.locked_until) > new Date()) {
    const mins = Math.ceil((new Date(attempt.locked_until).getTime() - Date.now()) / 60000)
    throw new Error(`Demasiados intentos. Intenta de nuevo en ${mins} minutos.`)
  }

  // 2. Intentar login
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Incrementar intento fallido
    const newAttempts = (attempt?.attempts || 0) + 1
    
    if (newAttempts >= MAX_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000)
      
      await supabase.from('login_attempts').upsert({
        email,
        attempts: newAttempts,
        last_attempt_at: new Date().toISOString(),
        locked_until: lockedUntil.toISOString(),
      })

      // Enviar magic link para desbloquear
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
      })

      throw new Error('Cuenta bloqueada por seguridad. Revisa tu correo para desbloquearla.')
    } else {
      await supabase.from('login_attempts').upsert({
        email,
        attempts: newAttempts,
        last_attempt_at: new Date().toISOString(),
      })
      
      // Mensaje GENÉRICO - no filtrar si existe o no
      throw new Error('Correo o contraseña incorrectos')
    }
  }

  // 3. Login exitoso - limpiar intentos
  await supabase.rpc('reset_login_attempts', { p_email: email })

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// ==================== GOOGLE LOGIN ====================
export async function loginWithGoogle() {
  const supabase = await createClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) throw new Error('Error al iniciar sesión con Google')
  if (data.url) redirect(data.url)
}

// ==================== SIGNUP ====================
export async function signup(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string).toLowerCase().trim()
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) throw new Error(error.message)

  // Si requiere confirmación de email
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error('Este correo ya está registrado. Intenta iniciar sesión.')
  }

  return { message: 'Revisa tu correo para confirmar tu cuenta' }
}

// ==================== FORGOT PASSWORD ====================
export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string).toLowerCase().trim()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

  // Siempre mensaje genérico
  if (error) {
    console.error('Forgot password error:', error)
  }

  return { 
    message: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.' 
  }
}

// ==================== RESET PASSWORD ====================
export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({ password })

  if (error) throw new Error('Error al actualizar la contraseña. Intenta de nuevo.')

  revalidatePath('/', 'layout')
  redirect('/login?message=password_updated')
}

// ==================== MAGIC LINK ====================
export async function sendMagicLink(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string).toLowerCase().trim()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
  })

  if (error) throw new Error('Error al enviar el enlace mágico')

  return { message: 'Revisa tu correo para el enlace de acceso' }
}

// ==================== LOGOUT ====================
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}