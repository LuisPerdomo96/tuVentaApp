'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { login, loginWithGoogle, sendMagicLink } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  Eye, EyeOff, Mail, Lock, Loader2, AlertCircle, 
  ArrowRight, ShieldCheck 
} from 'lucide-react'
import Link from 'next/link'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(
    message === 'password_updated' ? 'Contraseña actualizada correctamente' : null
  )
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    
    try {
      await login(formData)
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    setError(null)
    try {
      await loginWithGoogle()
    } catch (err: any) {
      setError(err.message)
      setGoogleLoading(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) {
      setError('Ingresa tu correo primero')
      return
    }
    setMagicLoading(true)
    setError(null)
    
    const formData = new FormData()
    formData.append('email', email)
    
    try {
      const result = await sendMagicLink(formData)
      setSuccess(result.message)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setMagicLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80')] bg-cover bg-center opacity-10" />
        <div className="relative z-10 max-w-md text-white p-12">
          <div className="mb-8">
            <ShieldCheck className="w-12 h-12 text-emerald-400 mb-4" />
            <h1 className="text-4xl font-bold mb-4">Tu Venta</h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Gestiona tu negocio de forma inteligente, segura y sin complicaciones.
            </p>
          </div>
          <div className="space-y-4 text-sm text-slate-400">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 font-bold">1</span>
              </div>
              <span>Ventas en tiempo real</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 font-bold">2</span>
              </div>
              <span>Control de inventario</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 font-bold">3</span>
              </div>
              <span>Reportes automáticos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho - Formulario */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-slate-900">Bienvenido de vuelta</h2>
            <p className="text-slate-500 mt-2">Ingresa tus datos para continuar</p>
          </div>

          {/* Google OAuth */}
          <Button 
            variant="outline" 
            className="w-full h-11 bg-white hover:bg-slate-50 border-slate-200"
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continuar con Google
          </Button>

          <div className="relative">
            <Separator className="bg-slate-200" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-50 px-3 text-xs text-slate-400 font-medium">
              O continúa con correo
            </span>
          </div>

          {/* Alertas */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-sm text-emerald-800">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  className="pl-10 h-11 bg-white border-slate-200 focus:border-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 bg-white border-slate-200 focus:border-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={magicLoading}
                className="text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors disabled:opacity-50"
              >
                {magicLoading ? 'Enviando...' : 'Enviar enlace mágico'}
              </button>
              <Link 
                href="/forgot-password" 
                className="text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  Iniciar Sesión
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500">
            ¿No tienes cuenta?{' '}
            <Link 
              href="/signup" 
              className="text-slate-900 font-semibold hover:underline underline-offset-2"
            >
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}