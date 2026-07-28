'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Save, Plus, Trash2, Edit2, Upload, X, Loader2, QrCode, Smartphone, Banknote, CreditCard, Settings2
} from 'lucide-react'
import Link from 'next/link'
import { uploadQr, upsertSaasMethod, saveSaasSettings } from './actions'

const EMPTY_FORM = {
  id: '', type: 'pago_movil', name: 'Pago Móvil', is_active: true,
  description: '', sort: 0, qr_url: '',
  banco: '', telefono: '', cedula: '', email: '', binance_id: '',
}

function methodIcon(type: string) {
  if (type === 'pago_movil') return <Smartphone className="w-5 h-5" />
  if (type === 'binance') return <span className="text-lg">🟡</span>
  if (type === 'zelle') return <span className="text-lg">💵</span>
  if (type === 'paypal') return <span className="text-lg">🅿️</span>
  return <CreditCard className="w-5 h-5" />
}

export function BillingClient({ initialMethods, initialSettings }: {
  initialMethods: any[]
  initialSettings: any
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // --- Settings (tasa + soporte) ---
  const [rate, setRate] = useState(String(initialSettings?.exchange_rate ?? 36.5))
  const [whatsapp, setWhatsapp] = useState(initialSettings?.support_whatsapp ?? '')
  const [supportEmail, setSupportEmail] = useState(initialSettings?.support_email ?? '')

  // --- Form de método ---
  const [form, setForm] = useState<any>({ ...EMPTY_FORM })
  const [uploadingQr, setUploadingQr] = useState(false)

  function setField(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })) }

  function startEdit(m: any) {
    setForm({
      id: m.id, type: m.type, name: m.name, is_active: m.is_active,
      description: m.description || '', sort: m.sort || 0, qr_url: m.details?.qr_url || '',
      banco: m.details?.banco || '', telefono: m.details?.telefono || '', cedula: m.details?.cedula || '',
      email: m.details?.email || '', binance_id: m.details?.binance_id || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() { setForm({ ...EMPTY_FORM }) }

  function onTypeChange(t: string) {
    const name = t === 'pago_movil' ? 'Pago Móvil' : t === 'binance' ? 'Binance Pay' : t === 'zelle' ? 'Zelle' : 'PayPal'
    setForm({ ...EMPTY_FORM, type: t, name })
  }

  async function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingQr(true)
    const fd = new FormData(); fd.append('image', file)
    const result = await uploadQr(fd)
    setUploadingQr(false)
    if (result.error) { alert('❌ ' + result.error); return }
    if (result.url) setField('qr_url', result.url)
  }

  function handleSaveMethod(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const fd = new FormData()
      fd.append('id', form.id || '')
      fd.append('type', form.type)
      fd.append('name', form.name || form.type)
      fd.append('is_active', String(form.is_active))
      fd.append('description', form.description)
      fd.append('sort', String(form.sort))
      fd.append('qr_url', form.qr_url)
      fd.append('banco', form.banco); fd.append('telefono', form.telefono); fd.append('cedula', form.cedula)
      fd.append('email', form.email); fd.append('binance_id', form.binance_id)
      const result = await upsertSaasMethod(fd)
      if (result.error) { alert('❌ ' + result.error); return }
      alert('✅ Método guardado')
      setForm({ ...EMPTY_FORM })
      router.refresh()
    })
  }

  function handleToggle(m: any) {
    const next = !m.is_active
    if (!next && !confirm('¿Desactivar este método? Los clientes dejarán de verlo.')) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append('id', m.id); fd.append('type', m.type); fd.append('name', m.name)
      fd.append('is_active', String(next)); fd.append('description', m.description || '')
      fd.append('sort', String(m.sort || 0)); fd.append('qr_url', m.details?.qr_url || '')
      fd.append('banco', m.details?.banco || ''); fd.append('telefono', m.details?.telefono || ''); fd.append('cedula', m.details?.cedula || '')
      fd.append('email', m.details?.email || ''); fd.append('binance_id', m.details?.binance_id || '')
      const result = await upsertSaasMethod(fd)
      if (result.error) { alert('❌ ' + result.error); return }
      router.refresh()
    })
  }

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const fd = new FormData()
      fd.append('exchange_rate', rate)
      fd.append('support_whatsapp', whatsapp)
      fd.append('support_email', supportEmail)
      const result = await saveSaasSettings(fd)
      if (result.error) { alert('❌ ' + result.error); return }
      alert('✅ Configuración guardada')
      router.refresh()
    })
  }

  const editing = !!form.id

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin"><Button variant="ghost" size="sm" className="text-white hover:bg-white/20 -ml-2"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center"><Settings2 className="w-6 h-6" /></div>
            <div>
              <h1 className="text-2xl font-bold">Configuración de Cobro del SaaS</h1>
              <p className="text-sm text-white/80">Tus cuentas de cobro, QR y tasa del día</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Settings: tasa + soporte */}
        <Card>
          <CardHeader className="border-b"><CardTitle className="text-base">💱 Tasa del día y Soporte</CardTitle></CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Tasa del día del SaaS (1 USD = ? Bs)</label>
                <p className="text-xs text-gray-500 mb-1">Se usa para mostrar el equivalente en Bs. a los tenants en Pago Móvil.</p>
                <input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">WhatsApp de soporte</label>
                  <p className="text-xs text-gray-500 mb-1">Para el link "Contáctanos" de los tenants.</p>
                  <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+584124161264"
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Email de soporte (opcional)</label>
                  <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="soporte@tuventaapp.com"
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <Button type="submit" disabled={isPending} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar configuración
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Métodos actuales */}
        <Card>
          <CardHeader className="border-b flex flex-row items-center justify-between">
            <CardTitle className="text-base">💳 Tus métodos de cobro</CardTitle>
            <Badge className="bg-gray-100 text-gray-700">{initialMethods.filter((m: any) => m.is_active).length} activos</Badge>
          </CardHeader>
          <CardContent className="p-6">
            {initialMethods.length === 0 ? (
              <p className="text-gray-500 text-center py-6">Aún no tienes métodos. Agrégalo abajo.</p>
            ) : (
              <div className="space-y-3">
                {initialMethods.map((m: any) => (
                  <div key={m.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${m.is_active ? 'bg-gray-50 border-gray-200' : 'bg-gray-100 border-gray-200 opacity-60'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-orange-500">{methodIcon(m.type)}</div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 flex items-center gap-2">
                          {m.name}
                          {!m.is_active && <Badge className="bg-gray-200 text-gray-600">Inactivo</Badge>}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {m.type === 'pago_movil' && `${m.details?.banco || ''} - ${m.details?.telefono || ''}`}
                          {m.type === 'binance' && `ID: ${m.details?.binance_id || ''}`}
                          {(m.type === 'zelle' || m.type === 'paypal') && (m.details?.email || '')}
                        </p>
                      </div>
                      {m.details?.qr_url && <QrCode className="w-5 h-5 text-gray-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => startEdit(m)}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggle(m)} className={m.is_active ? 'text-red-600' : 'text-green-600'}>
                        {m.is_active ? <><Trash2 className="w-4 h-4 mr-1" />Desactivar</> : 'Activar'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form agregar / editar */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base flex items-center gap-2">
              {editing ? <Edit2 className="w-5 h-5 text-orange-500" /> : <Plus className="w-5 h-5 text-orange-500" />}
              {editing ? 'Editar método' : 'Agregar método de cobro'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSaveMethod} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Tipo</label>
                  <select value={form.type} disabled={editing} onChange={(e) => onTypeChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg mt-1 disabled:opacity-60">
                    <option value="pago_movil">📱 Pago Móvil</option>
                    <option value="binance">🟡 Binance Pay</option>
                    <option value="zelle">💵 Zelle</option>
                    <option value="paypal">🅿️ PayPal</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Nombre mostrado</label>
                  <input value={form.name} onChange={(e) => setField('name', e.target.value)} className="w-full px-3 py-2 border rounded-lg mt-1" />
                </div>
              </div>

              {form.type === 'pago_movil' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><label className="text-sm font-semibold text-gray-700">Banco</label><input value={form.banco} onChange={(e) => setField('banco', e.target.value)} placeholder="0102 - Venezuela" className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
                  <div><label className="text-sm font-semibold text-gray-700">Teléfono</label><input value={form.telefono} onChange={(e) => setField('telefono', e.target.value)} placeholder="0412-0000000" className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
                  <div><label className="text-sm font-semibold text-gray-700">Cédula / RIF</label><input value={form.cedula} onChange={(e) => setField('cedula', e.target.value)} placeholder="V-00000000" className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
                </div>
              )}
              {form.type === 'binance' && (
                <div><label className="text-sm font-semibold text-gray-700">Binance Pay ID</label><input value={form.binance_id} onChange={(e) => setField('binance_id', e.target.value)} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
              )}
              {(form.type === 'zelle' || form.type === 'paypal') && (
                <div><label className="text-sm font-semibold text-gray-700">Email</label><input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="text-sm font-semibold text-gray-700">Orden</label><input type="number" value={form.sort} onChange={(e) => setField('sort', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
                <div className="flex items-end gap-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setField('is_active', e.target.checked)} className="w-4 h-4" />
                    Activo (visible para tenants)
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Descripción (opcional)</label>
                <input value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Ej: Transfiere en Bs. a la tasa del día" className="w-full px-3 py-2 border rounded-lg mt-1" />
              </div>

              {/* QR */}
              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><QrCode className="w-4 h-4" /> QR de pago (opcional)</label>
                <p className="text-xs text-gray-500 mb-1">Si lo subes, el tenant lo verá para escanear en /subscription.</p>
                {form.qr_url ? (
                  <div className="relative inline-block mt-1">
                    <img src={form.qr_url} alt="QR" className="w-40 h-40 object-contain rounded-lg border bg-white p-2" />
                    <button type="button" onClick={() => setField('qr_url', '')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <label className="mt-1 flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-500 transition-colors bg-gray-50 w-48">
                    {uploadingQr ? <Loader2 className="w-7 h-7 text-orange-500 animate-spin mb-2" /> : <Upload className="w-7 h-7 text-gray-400 mb-2" />}
                    <span className="text-xs text-gray-600 font-medium text-center">Subir QR</span>
                    <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" disabled={uploadingQr} />
                  </label>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isPending} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                  {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {editing ? 'Guardar cambios' : 'Agregar método'}
                </Button>
                {editing && <Button type="button" variant="outline" onClick={cancelEdit}>Cancelar</Button>}
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}