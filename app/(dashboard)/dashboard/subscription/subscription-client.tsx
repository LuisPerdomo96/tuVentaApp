'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Crown, CheckCircle, Clock, AlertTriangle, Upload, X, Loader2, Copy, ArrowLeft, Building2
} from 'lucide-react'
import Link from 'next/link'
import { uploadSubscriptionProof, requestUpgrade } from './actions'

// Chip con botón "Copiar" + feedback "Copiado ✓"
function CopyChip({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }
  return (
    <div className="flex items-center justify-between bg-white rounded-lg border px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className={`ml-3 shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors ${
          copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}

export function SubscriptionClient({ company, pendingEvent, history, paymentMethods }: {
  company: any
  pendingEvent: any
  history: any[]
  paymentMethods: any[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const isPaid = company.plan === 'pro' || company.plan === 'enterprise'
  const status = company.subscription_status || 'active'

  // Plan destino: el de la URL (?plan=), si no, el actual (renovación) o Pro (si es free)
  const requested = searchParams.get('plan')
  const [selectedPlan, setSelectedPlan] = useState<string>(
    requested === 'pro' || requested === 'enterprise'
      ? requested
      : isPaid ? company.plan : 'pro'
  )

  const [reference, setReference] = useState('')
  const [method, setMethod] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)

  // Días restantes + barra animada
  const expiresAt = company.plan_expires_at ? new Date(company.plan_expires_at) : null
  const now = new Date()
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000) : null
  const periodDays = company.plan === 'enterprise' ? 90 : 30
  const pctLeft = daysLeft !== null ? Math.max(0, Math.min(100, (daysLeft / periodDays) * 100)) : 0
  const [barWidth, setBarWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setBarWidth(pctLeft), 150)
    return () => clearTimeout(t)
  }, [pctLeft])

  const heroStyle =
    status === 'archived' ? 'from-red-500 to-rose-600'
    : status === 'past_due' ? 'from-amber-500 to-orange-600'
    : isPaid ? 'from-emerald-500 to-green-600'
    : 'from-gray-600 to-gray-800'

  const barColor = pctLeft > 50 ? 'bg-green-500' : pctLeft > 20 ? 'bg-amber-500' : 'bg-red-500'

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('image', file)
    const result = await uploadSubscriptionProof(fd)
    setUploading(false)
    if (result.error) { alert('❌ ' + result.error); return }
    if (result.url) setProofUrl(result.url)
  }

  async function handleSubmit() {
    if (!proofUrl) { alert('Adjunta el comprobante de pago para continuar.'); return }
    setSending(true)
    const fd = new FormData()
    fd.append('plan', selectedPlan)
    fd.append('screenshotUrl', proofUrl)
    fd.append('reference', reference)
    fd.append('method', method)
    const result = await requestUpgrade(fd)
    setSending(false)
    if (result.error) { alert('❌ ' + result.error); return }
    alert(result.type === 'renewal'
      ? '✅ Renovación enviada. Te avisaremos cuando sea aprobada.'
      : '✅ Solicitud enviada. Te avisaremos cuando sea aprobada.')
    router.refresh()
  }

  const amount = selectedPlan === 'enterprise' ? 19.99 : 4.99
  const cycle = selectedPlan === 'enterprise' ? 'cada 3 meses' : '/mes'

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard/plans">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Mi Suscripción</h1>
            <p className="text-sm text-gray-600">{company.name} · /{company.slug}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* HERO de estado */}
        <div className={`bg-gradient-to-r ${heroStyle} rounded-2xl p-6 text-white shadow-lg`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                {status === 'past_due' || status === 'archived'
                  ? <AlertTriangle className="w-6 h-6" />
                  : isPaid ? <Crown className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-sm text-white/80">
                  {status === 'archived' ? 'Plan archivado'
                    : status === 'past_due' ? '⚠️ Tu plan venció'
                    : isPaid ? `Plan ${company.plan === 'pro' ? 'Pro' : 'Enterprise'} activo`
                    : 'Plan Gratuito'}
                </p>
                <p className="text-2xl font-bold">
                  {daysLeft !== null
                    ? daysLeft > 0 ? `${daysLeft} día${daysLeft === 1 ? '' : 's'} restante${daysLeft === 1 ? '' : 's'}` : 'Vencido'
                    : 'Sin vencimiento'}
                </p>
              </div>
            </div>
            {status === 'past_due' && (
              <Badge className="bg-white/20 text-white border-0">Renueva para no perder tus funciones</Badge>
            )}
          </div>

          {isPaid && expiresAt && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-white/80 mb-1.5">
                <span>Período</span>
                <span>Vence: {expiresAt.toLocaleDateString('es-VE')}</span>
              </div>
              <div className="w-full bg-white/25 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Si hay solicitud en revisión */}
        {pendingEvent ? (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900">
                    Solicitud {pendingEvent.type === 'renewal' ? 'de renovación' : `de upgrade a ${pendingEvent.plan_to.toUpperCase()}`} en revisión
                  </h3>
                  <p className="text-sm text-amber-800 mt-1">
                    Recibimos tu comprobante por <strong>${Number(pendingEvent.amount_usd).toFixed(2)}</strong>.
                    Lo estamos verificando; te avisaremos cuando sea aprobada.
                  </p>
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    {pendingEvent.metadata?.screenshot_url && (
                      <a href={pendingEvent.metadata.screenshot_url} target="_blank" rel="noopener noreferrer">
                        <img src={pendingEvent.metadata.screenshot_url} alt="Comprobante" className="h-20 rounded-lg border object-cover" />
                      </a>
                    )}
                    <Badge className="bg-amber-200 text-amber-900">⏳ Pendiente de aprobación</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Flujo: mejorar / renovar con comprobante */
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {isPaid ? 'Renovar mi plan' : 'Mejorar mi plan'}
                </h3>
                <p className="text-sm text-gray-600">
                  Elige el plan, transfiere a una de nuestras cuentas y adjunta el comprobante.
                </p>
              </div>

              {/* Selector de plan */}
              <div className="grid grid-cols-2 gap-3">
                {(['pro', 'enterprise'] as const).map((pid) => (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setSelectedPlan(pid)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedPlan === pid
                        ? 'border-orange-500 bg-orange-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {pid === 'pro' ? <Crown className="w-4 h-4 text-orange-500" /> : <Building2 className="w-4 h-4 text-blue-500" />}
                      <span className="font-semibold">{pid === 'pro' ? 'Pro' : 'Enterprise'}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      ${pid === 'pro' ? '4.99' : '19.99'} {pid === 'pro' ? '/mes' : 'cada 3 meses'}
                    </p>
                  </button>
                ))}
              </div>

              {/* Datos de pago del SaaS */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">1 · Transfiere a una de estas cuentas</p>
                <div className="space-y-3">
                  {paymentMethods.map((m: any) => (
                    <div key={m.id} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900">{m.name}</p>
                        <Badge className="bg-gray-100 text-gray-700">{m.type === 'pago_movil' ? 'Bs.' : 'USD'}</Badge>
                      </div>
                      <div className="space-y-2">
                        {m.type === 'pago_movil' && (
                          <>
                            {m.details?.banco && <CopyChip label="Banco" value={m.details.banco} />}
                            {m.details?.telefono && <CopyChip label="Teléfono" value={m.details.telefono} />}
                            {m.details?.cedula && <CopyChip label="Cédula" value={m.details.cedula} />}
                          </>
                        )}
                        {m.type === 'zelle' && m.details?.email && <CopyChip label="Email Zelle" value={m.details.email} />}
                        {m.type === 'binance' && m.details?.binance_id && <CopyChip label="Binance Pay ID" value={m.details.binance_id} />}
                      </div>
                      {m.description && <p className="text-xs text-gray-500 mt-2">{m.description}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Comprobante */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">2 · Adjunta tu comprobante</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="N° de referencia"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Método usado…</option>
                    {paymentMethods.map((m: any) => (
                      <option key={m.id} value={m.type}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {proofUrl ? (
                  <div className="relative">
                    <img src={proofUrl} alt="Comprobante" className="w-full h-52 object-cover rounded-xl border" />
                    <button
                      type="button"
                      onClick={() => setProofUrl('')}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-500 transition-colors bg-gray-50">
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    )}
                    <span className="text-sm text-gray-600 font-medium">Subir comprobante de pago</span>
                    <span className="text-xs text-gray-500 mt-1">JPG, PNG o WEBP (máx. 5MB)</span>
                    <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
                  </label>
                )}
              </div>

              {/* Enviar */}
              <div className="flex items-center justify-between gap-4 pt-2 border-t">
                <div>
                  <p className="text-sm text-gray-600">Total a pagar</p>
                  <p className="text-2xl font-bold text-gray-900">${amount.toFixed(2)} <span className="text-sm font-normal text-gray-500">{cycle}</span></p>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={sending || uploading}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-white h-12 px-8"
                >
                  {sending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                  {sending ? 'Enviando…' : 'Enviar solicitud'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mini-historial */}
        {history.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Historial de solicitudes</h3>
              <div className="space-y-2">
                {history.map((h: any) => (
                  <div key={h.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div>
                      <span className="font-medium">
                        {h.type === 'renewal' ? 'Renovación' : 'Upgrade'} → {h.plan_to.toUpperCase()}
                      </span>
                      <span className="text-gray-500 ml-2">${Number(h.amount_usd).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">{new Date(h.created_at).toLocaleDateString('es-VE')}</span>
                      <Badge className={
                        h.status === 'approved' ? 'bg-green-100 text-green-800'
                        : h.status === 'pending' ? 'bg-amber-100 text-amber-800'
                        : h.status === 'rejected' ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-700'
                      }>
                        {h.status === 'approved' ? 'Aprobada' : h.status === 'pending' ? 'En revisión' : h.status === 'rejected' ? 'Rechazada' : h.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}