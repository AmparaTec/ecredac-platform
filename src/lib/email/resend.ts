/**
 * Utilitário para integração com Resend
 * API: https://resend.com/docs/send-email
 * Endpoint: POST https://api.resend.com/emails
 *
 * Variáveis de ambiente necessárias:
 * - RESEND_API_KEY: chave de API do Resend
 * - RESEND_FROM_EMAIL: email de origem (noreply@relius.com.br)
 * - RESEND_FROM_NAME: nome de origem (RELIUS E-CREDac)
 */

interface EmailOptions {
  to: string
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  cc?: string[]
  bcc?: string[]
  headers?: Record<string, string>
}

interface ResendResponse {
  id: string
  from: string
  to: string
  created_at: string
}

interface ResendError {
  message: string
  name: string
}

/**
 * Envia email via Resend
 */
export async function sendEmailResend(
  options: EmailOptions
): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@relius.com.br'
  const fromName = process.env.RESEND_FROM_NAME || 'RELIUS E-CREDac'

  if (!apiKey) {
    console.warn('⚠️ RESEND_API_KEY não configurada')
    return {
      success: false,
      error: 'RESEND_API_KEY não configurada',
    }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from || `${fromName} <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        headers: options.headers,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const error = data as ResendError
      console.error('❌ Erro ao enviar email via Resend:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    const result = data as ResendResponse
    console.log(`✓ Email enviado via Resend: ${result.id}`)

    // Log na tabela email_log
    try {
      const { createServerSupabase } = await import('@/lib/supabase/server')
      const supabase = await createServerSupabase()
      await supabase.from('email_log').insert({
        resend_id: result.id,
        template: options.subject,
        recipient: options.to,
        subject: options.subject,
        sent: true,
        metadata: {
          from: options.from,
          cc: options.cc,
          bcc: options.bcc,
        },
      })
    } catch (erroLog) {
      console.warn('⚠️ Erro ao registrar email em email_log:', erroLog)
      // Não falha se não conseguir logar
    }

    return {
      success: true,
      id: result.id,
    }
  } catch (erro) {
    console.error('❌ Erro ao chamar Resend API:', erro)
    return {
      success: false,
      error: String(erro),
    }
  }
}

/**
 * Templates de email disponíveis
 */
export const emailTemplates = {
  creditoIndicado: (data: {
    creditId: string
    amount: string
    procurador: string
    mensagem?: string
  }): EmailOptions => ({
    subject: `Novo crédito indicado - ${data.creditId}`,
    html: `
      <h1>Crédito indicado para você!</h1>
      <p>O procurador <strong>${data.procurador}</strong> indicou um crédito ICMS para sua empresa.</p>
      <h2>Detalhes do crédito:</h2>
      <ul>
        <li><strong>ID:</strong> ${data.creditId}</li>
        <li><strong>Valor:</strong> R$ ${data.amount}</li>
      </ul>
      ${data.mensagem ? `<p><strong>Mensagem do procurador:</strong> ${data.mensagem}</p>` : ''}
      <p>
        <a href="https://relius.com.br/marketplace/creditos/${data.creditId}">
          Ver crédito no marketplace
        </a>
      </p>
      <hr />
      <p><small>Este é um email automático. Não responda diretamente.</small></p>
    `,
  }),

  creditoAtivado: (data: {
    creditId: string
    amount: string
    valorDesagio: string
  }): EmailOptions => ({
    subject: `Crédito ativado - ${data.creditId}`,
    html: `
      <h1>Crédito ativado com sucesso!</h1>
      <p>Seu crédito foi ativado e está pronto para negociação.</p>
      <h2>Resumo:</h2>
      <ul>
        <li><strong>Crédito ID:</strong> ${data.creditId}</li>
        <li><strong>Valor:</strong> R$ ${data.amount}</li>
        <li><strong>Deságio:</strong> ${data.valorDesagio}%</li>
      </ul>
      <p>
        <a href="https://relius.com.br/operacoes/${data.creditId}">
          Acompanhar operação
        </a>
      </p>
      <hr />
      <p><small>Este é um email automático. Não responda diretamente.</small></p>
    `,
  }),

  notificacaoComprador: (data: {
    creditId: string
    vendedor: string
  }): EmailOptions => ({
    subject: `Novo interesse em seu crédito - ${data.creditId}`,
    html: `
      <h1>Novo interesse em seu crédito!</h1>
      <p>Um comprador se interessou pelo seu crédito <strong>${data.creditId}</strong>.</p>
      <p>Aguardamos sua aprovação para prosseguir com a negociação.</p>
      <p>
        <a href="https://relius.com.br/dashboard/creditos/${data.creditId}">
          Ver detalhes no dashboard
        </a>
      </p>
      <hr />
      <p><small>Este é um email automático. Não responda diretamente.</small></p>
    `,
  }),
}
