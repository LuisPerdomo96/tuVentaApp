import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'

// Configuración de TOTP
authenticator.options = {
  window: 1,
  step: 30,
}

export interface TwoFactorData {
  secret: string
  qrCode: string
  backupCodes: string[]
}

export async function generateTwoFactorSecret(): Promise<{ 
  success: boolean
  data?: TwoFactorData
  error?: string 
}> {
  const supabase = await createClient()
  
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return { success: false, error: 'No autorizado' }

  // Generar secret en el cliente (más confiable)
  const secret = authenticator.generateSecret()
  
  // Generar 10 códigos de respaldo
  const backupCodes: string[] = []
  for (let i = 0; i < 10; i++) {
    const code = Array.from({ length: 8 }, () => 
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
    ).join('')
    backupCodes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }

  // Guardar en la BD
  const { error: dbError } = await supabase.rpc('admin_save_2fa_secret', {
    p_secret: secret,
    p_backup_codes: backupCodes
  })
  
  if (dbError) return { success: false, error: dbError.message }

  // Generar URI para Google Authenticator
  const uri = authenticator.keyuri(
    user.user.email || 'admin@tuventaapp.com',
    'tuVentaApp',
    secret
  )

  // Generar QR Code
  const qrCode = await QRCode.toDataURL(uri)

  return {
    success: true,
    data: {
      secret,
      qrCode,
      backupCodes
    }
  }
}