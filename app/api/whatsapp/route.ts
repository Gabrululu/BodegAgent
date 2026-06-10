// WhatsApp bot via Kapso (https://kapso.com)
//
// Setup:
//   1. Crea cuenta en kapso.com y obtén un número de WhatsApp
//   2. En el dashboard de Kapso → Settings → Webhooks → apunta a:
//      https://tu-dominio.vercel.app/api/whatsapp
//   3. Añade las variables de entorno de abajo
//
// Env vars requeridas:
//   KAPSO_API_KEY          — tu API key de Kapso
//   KAPSO_PHONE_NUMBER_ID  — el phone_number_id de tu número en Kapso

import { generateText, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { tools } from '@/lib/tools'
import { NextRequest } from 'next/server'

// Historial por número de teléfono (en memoria — usar Vercel KV para producción)
const sessions = new Map<string, { role: 'user' | 'assistant'; content: string }[]>()
const MAX_TURNS = 10 // 5 intercambios

const SYSTEM_PROMPT = `Eres BodegAgent, el asistente de pagos para bodegueros peruanos en WhatsApp.
Hablas en español peruano casual. Eres muy conciso — estás en WhatsApp, no en un chat web.
Máximo 2 oraciones por respuesta. Sin markdown. Sin asteriscos.

Puedes ayudar a:
- Cobrar en USDm (send_cusd) — confirma siempre monto y dirección antes de ejecutar
- Ver saldo (check_balance)
- Generar facturas con link de cobro (create_invoice)
- Ver pagos recibidos (check_pending_debts)
- Recordar deudas (remind_debtor)
- Tasa de cambio (get_fx_rate)
- Comparar DEXs (compare_rates)
- Anotar fiado (register_fiado)
- Saldar fiado (settle_fiado)
- Guardar contacto en agenda (save_contact)

Fee de servicio: 0.5% sobre remesas. Cuando calcules cuánto llegará de una remesa, descuéntalo.
Si la respuesta incluye un link o tx hash, compártelo completo.`

// ── Tipos del webhook de Kapso ──
type KapsoWebhook = {
  message?: {
    id: string
    from: string
    type: string
    text?: { body: string }
    kapso?: { content?: string }
  }
  conversation?: {
    phone_number_id?: string
  }
  phone_number_id?: string
}

// Meta webhook verification (GET) — required by Kapso / WhatsApp Cloud API
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  const verifyToken = process.env.KAPSO_VERIFY_TOKEN ?? 'bodegagent'
  if (mode === 'subscribe' && token === verifyToken) {
    return new Response(challenge ?? '', { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  const body: KapsoWebhook = await req.json().catch(() => ({}))

  const msg = body.message
  if (!msg || msg.type !== 'text') {
    return Response.json({ ok: true }) // ignorar mensajes no-texto (imágenes, etc.)
  }

  const text = msg.text?.body ?? msg.kapso?.content ?? ''
  const from = msg.from                                          // número del usuario
  const phoneNumberId =
    body.phone_number_id ??
    body.conversation?.phone_number_id ??
    process.env.KAPSO_PHONE_NUMBER_ID ?? ''

  if (!text || !from || !phoneNumberId) {
    return Response.json({ ok: true })
  }

  // ── Historial de conversación ──
  const history = sessions.get(from) ?? []
  history.push({ role: 'user', content: text })
  if (history.length > MAX_TURNS) history.splice(0, 2)

  try {
    const { text: reply } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'), // Haiku: velocidad + costo en WhatsApp
      system: SYSTEM_PROMPT,
      messages: history,
      tools,
      stopWhen: stepCountIs(4),
    })

    history.push({ role: 'assistant', content: reply })
    sessions.set(from, history)

    // ── Enviar respuesta vía Kapso API ──
    await sendWhatsApp(phoneNumberId, from, reply)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[kapso/whatsapp]', err)
    await sendWhatsApp(phoneNumberId, from, 'Hubo un error, intenta de nuevo en un momento.')
    return Response.json({ ok: false }, { status: 500 })
  }
}

async function sendWhatsApp(phoneNumberId: string, to: string, message: string) {
  const apiKey = process.env.KAPSO_API_KEY
  if (!apiKey) {
    console.warn('[kapso] KAPSO_API_KEY no configurada — mensaje no enviado')
    return
  }

  const res = await fetch(
    `https://api.kapso.ai/meta/whatsapp/v24.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }),
    }
  )

  if (!res.ok) {
    console.error('[kapso] Error al enviar mensaje:', await res.text())
  }
}
