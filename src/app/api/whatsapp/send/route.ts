import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import {
  sendWhatsAppText,
  sendWhatsAppTemplate,
  WhatsAppTemplate,
} from '@/lib/integrations/whatsapp'

/**
 * POST /api/whatsapp/send
 * Envia mensagem via WhatsApp Business API ou retorna fallback wa.me link.
 *
 * Body:
 *   { phone, message }                    — texto livre
 *   { phone, template, params }           — template aprovado
 *   { phone, template: "convite_plataforma", params: { nome, link, codigo } }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { phone, message, template, params } = body

    if (!phone) {
      return NextResponse.json({ error: 'phone obrigatório' }, { status: 400 })
    }

    let result

    if (template) {
      // Enviar template
      result = await sendWhatsAppTemplate(
        phone,
        template as WhatsAppTemplate,
        params || {}
      )
    } else if (message) {
      // Enviar texto livre
      result = await sendWhatsAppText(phone, message)
    } else {
      return NextResponse.json({ error: 'message ou template obrigatório' }, { status: 400 })
    }

    // Log no audit
    await supabase.from('audit_log').insert({
      entity_type: 'whatsapp',
      entity_id: user.id,
      action: 'whatsapp_sent',
      description: `WhatsApp ${template || 'texto'} para ${phone.replace(/\d{4}$/, '****')}`,
      performed_by: user.id,
      metadata: {
        template: template || null,
        fallback: result.fallback || null,
        ok: result.ok,
      },
    }).then(() => {})

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[WhatsApp Send]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
