// lib/telegram.ts — notificador al dueño del SaaS vía Telegram.
// SERVER-ONLY. Best-effort: NUNCA lanza. Sin env => se salta en silencio.
// Gancho limpio: hoy Telegram; mañana WhatsApp Business / push PWA se suman acá.

export function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export async function sendTelegramHtml(
  html: string
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  // Sin configurar => no rompe el flujo (útil en local/dev o antes de setear env)
  if (!token || !chatId) return { ok: false, skipped: true }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000) // timeout 5s
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.error('[telegram] sendMessage HTTP', res.status, txt)
      return { ok: false, error: `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e: any) {
    console.error('[telegram] sendMessage error', e?.message || e)
    return { ok: false, error: e?.message || 'unknown' }
  }
}