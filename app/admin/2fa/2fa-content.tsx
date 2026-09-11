'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  ShieldCheck, 
  ShieldOff, 
  Smartphone, 
  Copy, 
  Check, 
  AlertTriangle,
  Key,
  Download
} from 'lucide-react'
import { 
  adminGenerate2FA, 
  adminEnable2FA, 
  adminDisable2FA 
} from '../actions'

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-VE', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function TwoFAContent({ 
  status, 
  adminEmail 
}: {
  status: any
  adminEmail: string
}) {
  const [step, setStep] = useState<'idle' | 'setup' | 'verify' | 'enabled'>('idle')
  const [qrData, setQrData] = useState<any>(null)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const is2FAEnabled = status?.is_enabled || false

  const handleGenerate2FA = async () => {
    setLoading(true)
    setError('')
    const result = await adminGenerate2FA()
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setQrData(result.data)
      setStep('setup')
    }
  }

  const handleEnable2FA = async () => {
    if (token.length !== 6) {
      setError('El código debe tener 6 dígitos')
      return
    }

    setLoading(true)
    setError('')
    const result = await adminEnable2FA(token)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setStep('enabled')
      window.location.reload()
    }
  }

  const handleDisable2FA = async () => {
    if (!confirm('¿Desactivar 2FA? Esto reducirá la seguridad de tu cuenta.')) return
    
    setLoading(true)
    const result = await adminDisable2FA()
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      window.location.reload()
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Seguridad - 2FA</h1>
        <p className="text-gray-600 mt-1">
          Autenticación de dos factores para proteger tu cuenta de administrador
        </p>
      </div>

      {/* Estado actual */}
      <Card className={`border-0 shadow-sm ${is2FAEnabled ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-amber-500'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                is2FAEnabled ? 'bg-green-100' : 'bg-amber-100'
              }`}>
                {is2FAEnabled ? (
                  <ShieldCheck className="w-7 h-7 text-green-600" />
                ) : (
                  <ShieldOff className="w-7 h-7 text-amber-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {is2FAEnabled ? '2FA Activado' : '2FA Desactivado'}
                </h3>
                <p className="text-sm text-gray-600">
                  {is2FAEnabled 
                    ? 'Tu cuenta está protegida con autenticación de dos factores'
                    : 'Activa 2FA para mayor seguridad'}
                </p>
                {is2FAEnabled && status?.enabled_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    Activado el {formatDate(status.enabled_at)}
                  </p>
                )}
              </div>
            </div>
            <Badge className={
              is2FAEnabled 
                ? 'bg-green-100 text-green-800' 
                : 'bg-amber-100 text-amber-800'
            }>
              {is2FAEnabled ? 'Protegido' : 'Sin protección'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats de backup codes */}
      {is2FAEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Key className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Códigos de respaldo</p>
                <p className="text-2xl font-bold">{status.remaining_backup_codes || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Último uso</p>
                <p className="text-sm font-semibold">
                  {status.last_used_at ? formatDate(status.last_used_at) : 'Nunca'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Admin</p>
                <p className="text-sm font-semibold truncate">{adminEmail}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pasos de configuración */}
      {step === 'idle' && !is2FAEnabled && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-600" />
              Activar 2FA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">¿Qué es 2FA?</h4>
                <p className="text-sm text-blue-800">
                  La autenticación de dos factores agrega una capa extra de seguridad. 
                  Además de tu contraseña, necesitarás un código de 6 dígitos generado 
                  por una app como Google Authenticator o Authy.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 text-orange-600 font-bold">1</div>
                  <div>
                    <p className="font-medium">Descarga una app autenticadora</p>
                    <p className="text-sm text-gray-600">Google Authenticator, Authy, o similar</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 text-orange-600 font-bold">2</div>
                  <div>
                    <p className="font-medium">Escanea el código QR</p>
                    <p className="text-sm text-gray-600">Te mostraremos un código para escanear</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 text-orange-600 font-bold">3</div>
                  <div>
                    <p className="font-medium">Guarda los códigos de respaldo</p>
                    <p className="text-sm text-gray-600">Por si pierdes acceso a tu app</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <Button 
                onClick={handleGenerate2FA}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                {loading ? 'Generando...' : 'Comenzar configuración'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paso 1: Mostrar QR */}
      {step === 'setup' && qrData && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-orange-600" />
              Paso 1: Escanea el código QR
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Importante:</strong> Escanea este código con Google Authenticator o Authy. 
                Si no puedes escanear, usa el código manual de abajo.
              </p>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center">
              <div className="p-4 bg-white border-2 border-gray-200 rounded-xl">
                <img 
                  src={qrData.qrCode} 
                  alt="QR Code 2FA" 
                  className="w-64 h-64"
                />
              </div>
              <p className="text-sm text-gray-600 mt-3 text-center">
                Escanea con tu app autenticadora
              </p>
            </div>

            {/* Código manual */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Código de configuración manual:
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-100 rounded-lg font-mono text-sm break-all">
                  {qrData.secret}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(qrData.secret, 'secret')}
                >
                  {copied === 'secret' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              onClick={() => setStep('verify')}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Continuar al paso 2 →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Paso 2: Verificar código */}
      {step === 'verify' && qrData && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-orange-600" />
              Paso 2: Verifica el código
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Ingresa el código de 6 dígitos que muestra tu app autenticadora para verificar que todo funciona.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Código de 6 dígitos</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleEnable2FA}
                disabled={loading || token.length !== 6}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Verificando...' : 'Activar 2FA'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep('setup')}
                disabled={loading}
              >
                Atrás
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2FA Activado - Mostrar backup codes */}
      {step === 'enabled' && qrData && (
        <Card className="border-0 shadow-sm border-l-4 border-l-green-500">
          <CardHeader className="border-b bg-green-50/50">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <ShieldCheck className="w-5 h-5" />
              ¡2FA Activado Exitosamente!
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Guarda estos códigos de respaldo
              </h4>
              <p className="text-sm text-amber-800 mb-3">
                Son tu única forma de acceder si pierdes tu app autenticadora. 
                Cada código solo se puede usar una vez.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {qrData.backupCodes.map((code: string, index: number) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <code className="font-mono text-sm font-semibold">{code}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(code, `backup-${index}`)}
                  >
                    {copied === `backup-${index}` ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>

            <Button
              onClick={() => {
                const allCodes = qrData.backupCodes.join('\n')
                const blob = new Blob([`Códigos de respaldo 2FA - tuVentaApp\n\n${allCodes}\n\nGuarda estos códigos en un lugar seguro.`], 
                  { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'backup-codes-2fa.txt'
                a.click()
              }}
              variant="outline"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar códigos
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Desactivar 2FA */}
      {is2FAEnabled && step === 'idle' && (
        <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
          <CardHeader className="border-b bg-red-50/50">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <ShieldOff className="w-5 h-5" />
              Zona Peligrosa
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                Desactivar 2FA reducirá la seguridad de tu cuenta. 
                Solo hazlo si es absolutamente necesario.
              </p>
            </div>
            <Button
              onClick={handleDisable2FA}
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading ? 'Desactivando...' : 'Desactivar 2FA'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}