// WhatsApp bot via Kapso (https://kapso.com)
//
// Env vars requeridas:
//   KAPSO_API_KEY          — API key de Kapso
//   KAPSO_PHONE_NUMBER_ID  — phone_number_id del número en Kapso

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

// ── Payload Kapso v2: { event, data: { message, conversation } } ──
type KapsoMessage = {
  id: string
  from: string
  type: string
  text?: { body: string }
  kapso?: { content?: string }
}

type KapsoPayload = {
  event?: string
  data?: {
    message?: KapsoMessage
    messages?: KapsoMessage[] // batched (buffering habilitado)
    conversation?: { id?: string; phone_number?: string }
  }
}

export async function GET() {
  return Response.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const body: KapsoPayload = await req.json().catch(() => ({}))

  // Solo procesar mensajes recibidos
  if (body.event && body.event !== 'whatsapp.message.received') {
    return Response.json({ ok: true })
  }

  const data = body.data ?? {}
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID ?? ''

  // Kapso puede entregar un mensaje individual o un batch (buffering)
  const msgs: KapsoMessage[] = data.messages
    ? data.messages
    : data.message
    ? [data.message]
    : []

  for (const msg of msgs) {
    if (msg.type !== 'text') continue

    const text = msg.text?.body ?? msg.kapso?.content ?? ''
    const from = msg.from

    if (!text || !from) continue

    // ── Historial de conversación ──
    const history = sessions.get(from) ?? []
    history.push({ role: 'user', content: text })
    if (history.length > MAX_TURNS) history.splice(0, 2)

    try {
      const { text: reply } = await generateText({
        model: anthropic('claude-haiku-4-5-20251001'),
        system: SYSTEM_PROMPT,
        messages: history,
        tools,
        stopWhen: stepCountIs(4),
      })

      history.push({ role: 'assistant', content: reply })
      sessions.set(from, history)

      await sendWhatsApp(phoneNumberId, from, reply)
    } catch (err) {
      console.error('[kapso/whatsapp]', err)
      await sendWhatsApp(phoneNumberId, from, 'Hubo un error, intenta de nuevo en un momento.')
    }
  }

  return Response.json({ ok: true })
}

async function sendWhatsApp(phoneNumberId: string, to: string, message: string) {
  const apiKey = process.env.KAPSO_API_KEY
  if (!apiKey || !phoneNumberId) {
    console.warn('[kapso] KAPSO_API_KEY o KAPSO_PHONE_NUMBER_ID no configurados')
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
