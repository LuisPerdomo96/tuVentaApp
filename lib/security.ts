import { authenticator } from 'otplib'
import QRCode from 'qrcode'

// Configuración global de TOTP (estándar Google Authenticator)
authenticator.options = {
  window: 1, // Tolerancia de 1 periodo (30 seg) hacia atrás/adelante por desfase de reloj
  step: 30,  // Cada código dura 30 segundos
}

/**
 * Valida la fortaleza de una contraseña
 * @returns Objeto con validez, errores específicos y puntuación (0-5)
 */
export function validatePasswordStrength(password: string): {
  valid: boolean
  errors: string[]
  score: number
} {
  const errors: string[] = []
  let score = 0

  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres')
  } else if (password.length >= 12) {
    score += 2
  } else {
    score += 1
  }

  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    errors.push('Al menos una mayúscula')
  }

  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    errors.push('Al menos una minúscula')
  }

  if (/[0-9]/.test(password)) {
    score += 1
  } else {
    errors.push('Al menos un número')
  }

  // Opcional: carácter especial (suma punto pero no es obligatorio para 'valid')
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1
  }

  return {
    // Es válida si no tiene errores y tiene al menos 3 puntos
    valid: errors.length === 0 && score >= 3,
    errors,
    score: Math.min(score, 5)
  }
}

/**
 * Genera la URI otpauth:// para convertir en código QR
 */
export function generateTOTPUri(email: string, secret: string, issuer: string = 'tuVentaApp'): string {
  return authenticator.keyuri(email, issuer, secret)
}

/**
 * Genera el código QR en formato Data URL (para mostrar en <img>)
 */
export async function generateTOTPQRCode(email: string, secret: string, issuer: string = 'tuVentaApp'): Promise<string> {
  const uri = generateTOTPUri(email, secret, issuer)
  return await QRCode.toDataURL(uri, { 
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })
}

/**
 * Verifica si un token TOTP de 6 dígitos es válido para un secret dado
 */
export function verifyTOTPToken(token: string, secret: string): boolean {
  try {
    // otplib espera el token sin espacios
    const cleanToken = token.replace(/\s/g, '')
    return authenticator.verify({ token: cleanToken, secret })
  } catch (error) {
    console.error('Error verificando TOTP:', error)
    return false
  }
}

/**
 * Genera un token actual (útil solo para pruebas/debugging)
 */
export function generateCurrentTOTPToken(secret: string): string {
  return authenticator.generate(secret)
}