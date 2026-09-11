'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, Key, RefreshCw, Loader2 } from 'lucide-react'
import { adminVerify2FALogin } from '@/app/admin/actions'

export default function TwoFactorVerifyPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const cleanToken = token.replace(/\s/g, '').toUpperCase()
    
    if (cleanToken.length < 6) {
      setError('Código inválido')
      setLoading(false)
      return
    }

    const result = await adminVerify2FALogin(cleanToken, useBackupCode)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      router.push('/admin')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="text-center border-b">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Verificación en dos pasos</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            {useBackupCode 
              ? 'Ingresa uno de tus códigos de respaldo'
              : 'Ingresa el código de 6 dígitos de tu app autenticadora'}
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {useBackupCode ? 'Código de respaldo' : 'Código 2FA'}
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
                  maxLength={useBackupCode ? 9 : 6}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || token.length < 6}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode)
                  setToken('')
                  setError('')
                }}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                {useBackupCode ? 'Usar código de app' : 'Usar código de respaldo'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}