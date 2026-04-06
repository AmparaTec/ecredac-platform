import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook, parseIncomingMessage } from '@/lib/integrations/whatsapp'
import { createAdminSupabase } from '@/lib/supabase/server'

/**
 * GET /api/webhooks/whatsapp
 * Verificação do webhook pelo Meta (challenge/response).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const result = verifyWebhook(params)
  return new NextResponse(result.body, { status: result.status })
}

/**
 * POST /api/webhooks/whatsapp
 * Recebe mensagens e status updates do WhatsApp.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Parse mensagem recebida
    const message = parseIncomingMessage(body)
    if (!message) {
      // Status update ou evento não-mensagem — apenas acknowledger
      return NextResponse.json({ ok: true })
    }

    console.log(`[WhatsApp Webhook] Mensagem de ${message.from}: ${message.text.substring(0, 100)}`)

    // Salvar mensagem no banco (opcional — para CRM futuro)
    try {
      const supabase = createAdminSupabase()
      await supabase.from('audit_log').insert({
        entity_type: 'whatsapp_incoming',
        entity_id: message.messageId,
        action: 'whatsapp_received',
        description: `Mensagem de ${message.name || message.from}: "${message.text.substring(0, 200)}"`,
        metadata: {
          from: message.from,
          name: message.name,
          timestamp: message.timestamp,
        },
      })
    } catch (err) {
      console.error('[WhatsApp Webhook] DB error:', err)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[WhatsApp Webhook] Error:', err)
    return NextResponse.json({ ok: true }) // Sempre retornar 200 para o Meta
  }
}
