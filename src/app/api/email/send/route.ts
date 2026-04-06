import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendEmailResend, emailTemplates } from '@/lib/email/resend'

/**
 * POST /api/email/send
 * Envia email via Resend
 *
 * Body:
 * {
 *   "template": "creditoIndicado" | "creditoAtivado" | "notificacaoComprador",
 *   "to": "buyer@company.com",
 *   "data": { ... dados específicos do template ... }
 * }
 *
 * Exemplos de body:
 *
 * 1. Email de crédito indicado:
 * {
 *   "template": "creditoIndicado",
 *   "to": "buyer@company.com",
 *   "data": {
 *     "creditId": "ICMS-001",
 *     "amount": "100000.00",
 *     "procurador": "João Silva",
 *     "mensagem": "Tenho um cliente interessado"
 *   }
 * }
 *
 * 2. Email de crédito ativado:
 * {
 *   "template": "creditoAtivado",
 *   "to": "seller@company.com",
 *   "data": {
 *     "creditId": "ICMS-001",
 *     "amount": "100000.00",
 *     "valorDesagio": "15"
 *   }
 * }
 *
 * 3. Email de notificação ao comprador:
 * {
 *   "template": "notificacaoComprador",
 *   "to": "seller@company.com",
 *   "data": {
 *     "creditId": "ICMS-001",
 *     "vendedor": "José das Neves"
 *   }
 * }
 */

type TemplateType = 'creditoIndicado' | 'creditoAtivado' | 'notificacaoComprador'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    )
  }

  try {
    const { template, to, data } = await request.json()

    // Valida template
    const templateTypes = ['creditoIndicado', 'creditoAtivado', 'notificacaoComprador']
    if (!templateTypes.includes(template)) {
      return NextResponse.json(
        {
          error: `Template inválido. Use um de: ${templateTypes.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Busca template
    let emailOptions
    try {
      emailOptions = emailTemplates[template as TemplateType](data)
    } catch (erro) {
      return NextResponse.json(
        {
          error: `Erro ao processar template ${template}: ${String(erro)}`,
        },
        { status: 400 }
      )
    }

    // Envia email
    const resultado = await sendEmailResend({
      ...emailOptions,
      to,
    })

    if (!resultado.success) {
      // Registra erro em email_log
      await supabase.from('email_log').insert({
        template,
        recipient: to,
        subject: emailOptions.subject,
        sent: false,
        error: resultado.error,
        metadata: {
          sent_by: user.id,
          data,
        },
      })

      return NextResponse.json(
        { error: resultado.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Email enviado com sucesso: ${resultado.id}`,
      resend_id: resultado.id,
    })
  } catch (erro) {
    console.error('❌ Erro em /api/email/send:', erro)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
