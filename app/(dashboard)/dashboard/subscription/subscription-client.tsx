'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Crown, CheckCircle, Clock, AlertTriangle, Upload, X, Loader2, Copy, ArrowLeft,
  Building2, CreditCard, Smartphone, Banknote,
} from 'lucide-react'
import Link from 'next/link'
import { uploadSubscriptionProof, requestUpgrade } from './actions'

// Acento del SaaS (coherente con /admin y el badge PRO)
const ACCENT = '#F97316'

function getPaymentIcon(type: string) {
  switch (type) {
    case 'pago_movil': return <Smartphone className="w-5 h-5" />
    case 'binance': return <span className="text-xl">🟡</span>
    case 'zelle': return <span className="text-xl">💵</span>
    case 'paypal': return <span className="text-xl">🅿️</span>
    default: return <CreditCard className="w-5 h-5" />
  }
}

function methodSummary(m: any): string {
  if (m.type === 'pago_movil') return `${m.details?.banco || ''} - ${m.details?.telefono || ''}`.replace(/^ - $/, '')
  if (m.type === 'binance') return `ID: ${m.details?.binance_id || ''}`
  if (m.type === 'zelle' || m.type === 'paypal') return m.details?.email || ''
  return ''
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

  const requested = searchParams.get('plan')
  const [selectedPlan, setSelectedPlan] = useState<string>(
    requested === 'pro' || requested === 'enterprise' ? requested : isPaid ? company.plan : 'pro'
  )

  const [selectedMethod, setSelectedMethod] = useState<any>(null)
  const [reference, setReference] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)

  const amount = selectedPlan === 'enterprise' ? 19.99 : 4.99
  const cycle = selectedPlan === 'enterprise' ? 'cada 3 meses' : '/mes'

  // Días restantes + barra animada
  const expiresAt = company.plan_expires_at ? new Date(company.plan_expires_at) : null
  const now = new Date()
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000) : null
  const periodDays = company.plan === 'enterprise' ? 90 : 30
  const pctLeft = daysLeft !== null ? Math.max(0, Math.min(100, (daysLeft / periodDays) * 100)) : 0
  const [barWidth, setBarWidth] = useState(0)
  useEffect(() => { const t = setTimeout(() => setBarWidth(pctLeft), 150); return () => clearTimeout(t) }, [pctLeft])

  const heroStyle =
    status === 'archived' ? 'from-red-500 to-rose-600'
    : status === 'past_due' ? 'from-amber-500 to-orange-600'
    : isPaid ? 'from-emerald-500 to-green-600'
    : 'from-gray-600 to-gray-800'
  const barColor = pctLeft > 50 ? 'bg-green-500' : pctLeft > 20 ? 'bg-amber-500' : 'bg-red-500'

  // Copiar datos (espejo del checkout)
  async function copyPaymentData() {
    if (!selectedMethod) return
    let text = `📋 Datos para Transferir:\n\n`
    if (selectedMethod.type === 'pago_movil') {
      text += `Banco: ${selectedMethod.details?.banco || ''}\n`
      text += `Teléfono: ${selectedMethod.details?.telefono || ''}\n`
      text += `Cédula: ${selectedMethod.details?.cedula || ''}\n`
      text += `Monto: $${amount.toFixed(2)} USD (equivalente en Bs. a la tasa del día)`
    } else if (selectedMethod.type === 'binance') {
      text += `Binance Pay ID: ${selectedMethod.details?.binance_id || ''}\n`
      text += `Monto: $${amount.toFixed(2)} USDT`
    } else if (selectedMethod.type === 'zelle' || selectedMethod.type === 'paypal') {
      text += `Email: ${selectedMethod.details?.email || ''}\n`
      text += `Monto: $${amount.toFixed(2)}`
    }
    text += `\n\n💳 Realiza el pago y adjunta el comprobante.`
    try {
      await navigator.clipboard.writeText(text)
      alert('✅ Datos copiados al portapapeles')
    } catch {
      alert('❌ No se pudo copiar automáticamente. Copia manualmente.')
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData(); fd.append('image', file)
    const result = await uploadSubscriptionProof(fd)
    setUploading(false)
    if (result.error) { alert('❌ ' + result.error); return }
    if (result.url) setProofUrl(result.url)
  }

  async function handleSubmit() {
    if (!selectedMethod) { alert('Selecciona un método de pago.'); return }
    if (!proofUrl) { alert('Adjunta el comprobante de pago para continuar.'); return }
    setSending(true)
    const fd = new FormData()
    fd.append('plan', selectedPlan)
    fd.append('screenshotUrl', proofUrl)
    fd.append('reference', reference)
    fd.append('method', selectedMethod.type)
    const result = await requestUpgrade(fd)
    setSending(false)
    if (result.error) { alert('❌ ' + result.error); return }
    alert(result.type === 'renewal'
      ? '✅ Renovación enviada. Te avisaremos cuando sea aprobada.'
      : '✅ Solicitud enviada. Te avisaremos cuando sea aprobada.')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard/plans">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Mi Suscripción</h1>
            <p className="text-sm text-gray-600">{company.name} · /{company.slug}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* HERO de estado */}
        <div className={`bg-gradient-to-r ${heroStyle} rounded-2xl p-6 text-white shadow-lg`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                {status === 'past_due' || status === 'archived' ? <AlertTriangle className="w-6 h-6" />
                  : isPaid ? <Crown className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-sm text-white/80">
                  {status === 'archived' ? 'Plan archivado' : status === 'past_due' ? '⚠️ Tu plan venció'
                    : isPaid ? `Plan ${company.plan === 'pro' ? 'Pro' : 'Enterprise'} activo` : 'Plan Gratuito'}
                </p>
                <p className="text-2xl font-bold">
                  {daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} día${daysLeft === 1 ? '' : 's'} restante${daysLeft === 1 ? '' : 's'}` : 'Vencido') : 'Sin vencimiento'}
                </p>
              </div>
            </div>
            {status === 'past_due' && <Badge className="bg-white/20 text-white border-0">Renueva para no perder tus funciones</Badge>}
          </div>
          {isPaid && expiresAt && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-white/80 mb-1.5">
                <span>Período</span><span>Vence: {expiresAt.toLocaleDateString('es-VE')}</span>
              </div>
              <div className="w-full bg-white/25 rounded-full h-2.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`} style={{ width: `${barWidth}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Solicitud en revisión */}
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
                    Recibimos tu comprobante por <strong>${Number(pendingEvent.amount_usd).toFixed(2)}</strong>. Lo verificaremos y te avisaremos.
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
          <>
            {/* Selector de plan */}
            <Card className="shadow-lg border-0">
              <CardContent className="p-4 sm:p-6">
                <p className="font-bold text-gray-900 mb-3">1 · Elige tu plan</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['pro', 'enterprise'] as const).map((pid) => (
                    <button key={pid} type="button" onClick={() => setSelectedPlan(pid)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${selectedPlan === pid ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {pid === 'pro' ? <Crown className="w-4 h-4 text-orange-500" /> : <Building2 className="w-4 h-4 text-blue-500" />}
                        <span className="font-semibold">{pid === 'pro' ? 'Pro' : 'Enterprise'}</span>
                      </div>
                      <p className="text-sm text-gray-600">${pid === 'pro' ? '4.99' : '19.99'} {pid === 'pro' ? '/mes' : 'cada 3 meses'}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Método de Pago (ESPEJO del checkout) */}
            <Card className="shadow-lg border-0">
              <div className="bg-gradient-to-r from-purple-50 to-white border-b px-4 sm:px-6 py-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-600" /> 2 · Método de Pago
                </h2>
              </div>
              <CardContent className="p-4 sm:p-6">
                {paymentMethods.length === 0 ? (
                  <p className="text-gray-500 text-center py-6">No hay métodos de pago configurados aún.</p>
                ) : (
                  <div className="space-y-3">
                    {paymentMethods.map((m: any) => (
                      <label key={m.id} className="block cursor-pointer group">
                        <input type="radio" name="saasMethod" className="peer sr-only"
                          checked={selectedMethod?.id === m.id}
                          onChange={() => setSelectedMethod(m)} />
                        <div className={`p-3 sm:p-4 border-2 rounded-xl transition-all hover:shadow-md ${selectedMethod?.id === m.id ? 'border-white shadow-lg' : 'border-gray-200'}`}
                          style={{ backgroundColor: selectedMethod?.id === m.id ? `${ACCENT}10` : 'white' }}>
                          <div className="flex items-center gap-3">
                            <div style={{ color: ACCENT }}>{getPaymentIcon(m.type)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm sm:text-base">{m.name}</p>
                              <p className="text-xs sm:text-sm text-gray-600 truncate">{methodSummary(m)}</p>
                            </div>
                            {selectedMethod?.id === m.id && <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: ACCENT }} />}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* Datos para Transferir + Copiar + QR */}
                {selectedMethod && (
                  <div className="mt-5 p-4 sm:p-5 rounded-xl border-2" style={{ backgroundColor: `${ACCENT}10`, borderColor: `${ACCENT}30` }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-bold text-sm sm:text-base" style={{ color: ACCENT }}>📋 Datos para Transferir:</p>
                      <button type="button" onClick={copyPaymentData}
                        className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1"
                        style={{ backgroundColor: ACCENT }}>📋 Copiar</button>
                    </div>
                    <div className="text-xs sm:text-sm space-y-2">
                      {selectedMethod.type === 'pago_movil' && (
                        <>
                          <div className="flex justify-between p-2 bg-white rounded"><span>Banco:</span><span className="font-semibold break-all text-right">{selectedMethod.details?.banco}</span></div>
                          <div className="flex justify-between p-2 bg-white rounded"><span>Teléfono:</span><span className="font-semibold break-all text-right">{selectedMethod.details?.telefono}</span></div>
                          <div className="flex justify-between p-2 bg-white rounded"><span>Cédula:</span><span className="font-semibold break-all text-right">{selectedMethod.details?.cedula}</span></div>
                          <div className="flex justify-between p-2 bg-white rounded border-t-2" style={{ borderColor: ACCENT }}><span>Monto a pagar:</span><span className="font-bold break-all text-right" style={{ color: ACCENT }}>${amount.toFixed(2)} USD</span></div>
                          <p className="text-[11px] text-gray-500 px-1">Para Pago Móvil, transfiere el equivalente en Bs. a la tasa del día.</p>
                        </>
                      )}
                      {selectedMethod.type === 'binance' && (
                        <>
                          <div className="flex justify-between p-2 bg-white rounded"><span>Binance Pay ID:</span><span className="font-semibold break-all text-right">{selectedMethod.details?.binance_id}</span></div>
                          <div className="flex justify-between p-2 bg-white rounded border-t-2" style={{ borderColor: ACCENT }}><span>Monto a pagar:</span><span className="font-bold break-all text-right" style={{ color: ACCENT }}>${amount.toFixed(2)} USDT</span></div>
                        </>
                      )}
                      {(selectedMethod.type === 'zelle' || selectedMethod.type === 'paypal') && (
                        <>
                          <div className="flex justify-between p-2 bg-white rounded"><span>Email:</span><span className="font-semibold break-all text-right">{selectedMethod.details?.email}</span></div>
                          <div className="flex justify-between p-2 bg-white rounded border-t-2" style={{ borderColor: ACCENT }}><span>Monto a pagar:</span><span className="font-bold break-all text-right" style={{ color: ACCENT }}>${amount.toFixed(2)}</span></div>
                        </>
                      )}
                    </div>

                    {/* QR si el método lo tiene (lo subís desde /admin/billing) */}
                    {selectedMethod.details?.qr_url && (
                      <div className="mt-4 p-3 bg-white rounded-xl border text-center">
                        <p className="text-xs font-semibold text-gray-700 mb-2">📷 Escanea el QR para pagar</p>
                        <img src={selectedMethod.details.qr_url} alt="QR de pago" className="mx-auto w-44 h-44 object-contain rounded-lg" />
                      </div>
                    )}
                  </div>
                )}

                {/* Referencia + comprobante */}
                {selectedMethod && (
                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="text-sm font-semibold">Número de Referencia</label>
                      <input value={reference} onChange={(e) => setReference(e.target.value)}
                        placeholder="Últimos 6-8 dígitos (opcional)"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl mt-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold">3 · Captura de Pago</label>
                      {proofUrl ? (
                        <div className="relative mt-2">
                          <img src={proofUrl} alt="Captura" className="w-full h-48 object-cover rounded-xl" />
                          <button type="button" onClick={() => setProofUrl('')}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <label className="mt-2 flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-500 transition-colors bg-gray-50">
                          {uploading ? <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-3" /> : <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mb-3" />}
                          <span className="text-xs sm:text-sm text-gray-600 font-medium text-center">Toca para subir captura de pago</span>
                          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
                        </label>
                      )}
                      {uploading && <p className="text-sm text-gray-600 mt-2 text-center">Subiendo imagen...</p>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total + enviar */}
            <Card className="shadow-lg border-0">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total a pagar</p>
                    <p className="text-2xl font-bold text-gray-900">${amount.toFixed(2)} <span className="text-sm font-normal text-gray-500">{cycle}</span></p>
                  </div>
                  <Button onClick={handleSubmit} disabled={sending || uploading || !selectedMethod}
                    className="h-12 px-8 text-base font-bold shadow-lg" style={{ backgroundColor: ACCENT }}>
                    {sending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                    {sending ? 'Enviando…' : 'Enviar solicitud'}
                  </Button>
                </div>
                <p className="text-xs text-center text-gray-500 mt-3">
                  Al enviar, tu solicitud quedará en revisión hasta que sea aprobada.
                </p>
              </CardContent>
            </Card>
          </>
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
                      <span className="font-medium">{h.type === 'renewal' ? 'Renovación' : 'Upgrade'} → {h.plan_to.toUpperCase()}</span>
                      <span className="text-gray-500 ml-2">${Number(h.amount_usd).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">{new Date(h.created_at).toLocaleDateString('es-VE')}</span>
                      <Badge className={h.status === 'approved' ? 'bg-green-100 text-green-800' : h.status === 'pending' ? 'bg-amber-100 text-amber-800' : h.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}>
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