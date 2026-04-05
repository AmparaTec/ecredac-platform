/**
 * E-CREDac — Resend Email Integration
 *
 * Serviço de email transacional com:
 * - Templates tipados para cada evento da plataforma
 * - Queue com retry automático
 * - Tracking de envio
 * - Fallback silencioso em dev (log no console)
 */

import { z } from 'zod'
import { HttpClient, IntegrationError, optionalEnv } from './http-client'

// ─── Types ───────────────────────────────────────────────────────────────────

export type EmailTemplate =
  | 'welcome'
  | 'match_found'
  | 'match_confirmed'
  | 'payment_received'
  | 'payment_confirmed'
  | 'contract_ready'
  | 'contract_signed'
  | 'credit_transferred'
  | 'sla_at_risk'
  | 'sla_breached'
  | 'commission_earned'
  | 'auction_outbid'
  | 'auction_won'
  | 'listing_expiring'

export interface EmailPayload {
  to: string | string[]
  template: EmailTemplate
  data: Record<string, unknown>
  replyTo?: string
}

export interface EmailResult {
  id: string
  sent: boolean
}

// ─── Resend API response ─────────────────────────────────────────────────────

interface ResendResponse {
  id: string
}

// ─── Client ──────────────────────────────────────────────────────────────────

const client = new HttpClient({
  baseUrl: 'https://api.resend.com',
  name: 'Resend',
  timeout: 10_000,
  maxRetries: 3,
  circuitThreshold: 5,
  circuitResetMs: 60_000,
})

// ─── Public API ──────────────────────────────────────────────────────────────

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = optionalEnv('EMAIL_FROM', 'E-CREDac <noreply@ecredac.com.br>')

  // Dev mode: log to console
  if (!apiKey || process.env.NODE_ENV === 'development') {
    console.info(`[Resend][DEV] Email "${payload.template}" para ${JSON.stringify(payload.to)}`)
    console.info(`[Resend][DEV] Data:`, JSON.stringify(payload.data, null, 2))
    return { id: `dev_${Date.now()}`, sent: false }
  }

  const { subject, html } = renderTemplate(payload.template, payload.data)
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to]

  try {
    const response = await client.post<ResendResponse>('/emails', {
      headers: { Authorization: `Bearer ${apiKey}` },
      body: {
        from,
        to: recipients,
        subject,
        html,
        reply_to: payload.replyTo,
        tags: [
          { name: 'template', value: payload.template },
          { name: 'platform', value: 'ecredac' },
        ],
      },
    })

    return { id: response.id, sent: true }
  } catch (error) {
    // Email failure should never block business logic
    console.error(`[Resend] Falha ao enviar "${payload.template}":`, (error as Error).message)
    return { id: '', sent: false }
  }
}

/**
 * Batch send — envia múltiplos emails em paralelo com limite de concorrência.
 */
export async function sendBatch(payloads: EmailPayload[]): Promise<EmailResult[]> {
  const CONCURRENCY = 5
  const results: EmailResult[] = []

  for (let i = 0; i < payloads.length; i += CONCURRENCY) {
    const batch = payloads.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.allSettled(batch.map(sendEmail))
    results.push(
      ...batchResults.map(r =>
        r.status === 'fulfilled' ? r.value : { id: '', sent: false }
      )
    )
  }

  return results
}

// ─── Template Renderer ───────────────────────────────────────────────────────

function renderTemplate(
  template: EmailTemplate,
  data: Record<string, unknown>,
): { subject: string; html: string } {
  const templates = TEMPLATES[template]
  if (!templates) {
    throw new IntegrationError(`Template "${template}" não encontrado`, 'Resend', 400)
  }
  return {
    subject: templates.subject(data),
    html: wrapLayout(templates.body(data)),
  }
}

// ─── Templates ───────────────────────────────────────────────────────────────

const TEMPLATES: Record<EmailTemplate, {
  subject: (d: Record<string, unknown>) => string
  body: (d: Record<string, unknown>) => string
}> = {
  welcome: {
    subject: () => 'Bem-vindo ao E-CREDac!',
    body: (d) => `
      <h2>Olá, ${d.name}!</h2>
      <p>Sua conta no E-CREDac foi criada com sucesso.</p>
      <p>Agora você pode acessar o maior mercado de créditos de ICMS do Brasil.</p>
      ${ctaButton('Acessar Dashboard', `${d.appUrl}/dashboard`)}
      <p style="color:#64748b;font-size:13px;">
        Se não foi você quem criou está conta, ignore este email.
      </p>
    `,
  },

  match_found: {
    subject: (d) => `Novo match encontrado — R$ ${d.amount}`,
    body: (d) => `
      <h2>Match encontrado!</h2>
      <p>Encontramos um ${d.role === 'seller' ? 'comprador' : 'vendedor'} compatível com seu ${d.role === 'seller' ? 'crédito' : 'pedido'}.</p>
      ${infoCard([
        ['Valor', `R$ ${d.amount}`],
        ['Tipo', String(d.creditType)],
        ['Score', String(d.grade)],
        ['Desconto proposto', `${d.discount}%`],
      ])}
      ${ctaButton('Ver Detalhes', `${d.appUrl}/matching`)}
      <p style="color:#64748b;font-size:13px;">Este match expira em 48h se não for aceito.</p>
    `,
  },

  match_confirmed: {
    subject: (d) => `Match confirmado — R$ ${d.amount}`,
    body: (d) => `
      <h2>Match confirmado!</h2>
      <p>Ambas as partes aceitaram. A transação de <strong>R$ ${d.amount}</strong> está pronta para prosseguir.</p>
      ${ctaButton('Iniciar Transação', `${d.appUrl}/transações`)}
    `,
  },

  payment_received: {
    subject: (d) => `Pagamento recebido — R$ ${d.amount}`,
    body: (d) => `
      <h2>Pagamento confirmado!</h2>
      <p>Recebemos o pagamento de <strong>R$ ${d.amount}</strong> via ${d.method}.</p>
      <p>A transferência do crédito junto à SEFAZ será iniciada automaticamente.</p>
      ${ctaButton('Acompanhar', `${d.appUrl}/pipeline`)}
    `,
  },

  payment_confirmed: {
    subject: (d) => `Pagamento processado — Transação #${d.transactionId}`,
    body: (d) => `
      <h2>Pagamento processado</h2>
      <p>O pagamento da transação <strong>#${d.transactionId}</strong> foi processado com sucesso.</p>
      ${infoCard([
        ['Valor', `R$ ${d.amount}`],
        ['Método', String(d.method)],
        ['Status', 'Confirmado'],
      ])}
      ${ctaButton('Ver Transação', `${d.appUrl}/transações`)}
    `,
  },

  contract_ready: {
    subject: () => 'Contrato pronto para assinatura',
    body: (d) => `
      <h2>Contrato disponível</h2>
      <p>O contrato da transação <strong>#${d.transactionId}</strong> está pronto para assinatura digital.</p>
      ${ctaButton('Assinar Contrato', String(d.signUrl))}
      <p style="color:#64748b;font-size:13px;">A assinatura é feita via Clicksign com certificado ICP-Brasil.</p>
    `,
  },

  contract_signed: {
    subject: (d) => `Contrato assinado — Transação #${d.transactionId}`,
    body: (d) => `
      <h2>Contrato assinado!</h2>
      <p>Todas as partes assinaram o contrato da transação <strong>#${d.transactionId}</strong>.</p>
      <p>O próximo passo é a transferência do crédito junto à SEFAZ.</p>
      ${ctaButton('Ver Pipeline', `${d.appUrl}/pipeline`)}
    `,
  },

  credit_transferred: {
    subject: (d) => `Crédito transferido — R$ ${d.amount}`,
    body: (d) => `
      <h2>Transferência concluída!</h2>
      <p>O crédito de ICMS de <strong>R$ ${d.amount}</strong> foi transferido com sucesso pela SEFAZ.</p>
      ${infoCard([
        ['Protocolo SEFAZ', String(d.protocolNumber)],
        ['Data', String(d.date)],
      ])}
      ${ctaButton('Ver Detalhes', `${d.appUrl}/transações`)}
    `,
  },

  sla_at_risk: {
    subject: (d) => `Atenção: SLA em risco — ${d.taskName}`,
    body: (d) => `
      <h2 style="color:#f59e0b;">SLA em Risco</h2>
      <p>A tarefa <strong>"${d.taskName}"</strong> está próxima do prazo limite.</p>
      ${infoCard([
        ['Fase', String(d.phase)],
        ['Prazo', String(d.deadline)],
        ['Responsável', String(d.responsible)],
      ])}
      ${ctaButton('Agir Agora', `${d.appUrl}/pipeline`)}
    `,
  },

  sla_breached: {
    subject: (d) => `URGENTE: SLA vencido — ${d.taskName}`,
    body: (d) => `
      <h2 style="color:#ef4444;">SLA Vencido</h2>
      <p>A tarefa <strong>"${d.taskName}"</strong> ultrapassou o prazo limite.</p>
      ${infoCard([
        ['Fase', String(d.phase)],
        ['Venceu em', String(d.deadline)],
        ['Atraso', String(d.overdue)],
      ])}
      ${ctaButton('Resolver Agora', `${d.appUrl}/pipeline`)}
    `,
  },

  commission_earned: {
    subject: (d) => `Comissão gerada — R$ ${d.commissionValue}`,
    body: (d) => `
      <h2>Nova comissão!</h2>
      <p>Você ganhou uma comissão de <strong>R$ ${d.commissionValue}</strong> pela transação com <strong>${d.companyName}</strong>.</p>
      ${infoCard([
        ['Valor da transação', `R$ ${d.transactionValue}`],
        ['Taxa', `${d.commissionPct}%`],
        ['Comissão', `R$ ${d.commissionValue}`],
        ['Tier', String(d.tier)],
      ])}
      ${ctaButton('Ver Comissões', `${d.appUrl}/assessor/comissões`)}
    `,
  },

  auction_outbid: {
    subject: (d) => `Seu lance foi superado — Leilão #${d.auctionId}`,
    body: (d) => `
      <h2>Lance superado</h2>
      <p>Seu lance no leilão <strong>#${d.auctionId}</strong> foi superado.</p>
      <p>Desconto atual: <strong>${d.currentDiscount}%</strong> (seu: ${d.yourDiscount}%)</p>
      ${ctaButton('Fazer Novo Lance', `${d.appUrl}/marketplace`)}
    `,
  },

  auction_won: {
    subject: (d) => `Você venceu o leilão! — R$ ${d.amount}`,
    body: (d) => `
      <h2 style="color:#10b981;">Leilão vencido!</h2>
      <p>Parabéns! Você venceu o leilão de crédito de <strong>R$ ${d.amount}</strong>.</p>
      ${infoCard([
        ['Desconto final', `${d.finalDiscount}%`],
        ['Total a pagar', `R$ ${d.totalPayment}`],
      ])}
      ${ctaButton('Finalizar Transação', `${d.appUrl}/transações`)}
    `,
  },

  listing_expiring: {
    subject: (d) => `Crédito expirando em ${d.daysLeft} dias`,
    body: (d) => `
      <h2>Crédito expirando</h2>
      <p>Seu crédito <strong>${d.creditId}</strong> de <strong>R$ ${d.amount}</strong> expira em <strong>${d.daysLeft} dias</strong>.</p>
      <p>Considere ajustar o desconto para aumentar as chances de venda.</p>
      ${ctaButton('Editar Listing', `${d.appUrl}/marketplace`)}
    `,
  },
}

// ─── HTML Components ─────────────────────────────────────────────────────────

function ctaButton(text: string, url: string): string {
  return `
    <div style="text-align:center;margin:28px 0;">
      <a href="${url}" style="
        display:inline-block;
        background:#1a6ff5;
        color:#fff;
        padding:14px 32px;
        border-radius:12px;
        text-decoration:none;
        font-weight:600;
        font-size:15px;
      ">${text}</a>
    </div>
  `
}

function infoCard(rows: [string, string][]): string {
  const rowsHtml = rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:8px 12px;color:#64748b;font-size:13px;border-bottom:1px solid #1C2035;">${label}</td>
        <td style="padding:8px 12px;color:#e2e8f0;font-size:13px;font-weight:600;border-bottom:1px solid #1C2035;text-align:right;">${value}</td>
      </tr>
    `)
    .join('')

  return `
    <table style="width:100%;border-collapse:collapse;background:#151829;border-radius:12px;overflow:hidden;margin:20px 0;">
      ${rowsHtml}
    </table>
  `
}

function wrapLayout(body: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#06070D;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#1a6ff5;width:36px;height:36px;border-radius:10px;line-height:36px;color:#fff;font-weight:900;font-size:16px;">E</div>
      <span style="color:#e2e8f0;font-size:20px;font-weight:700;margin-left:8px;vertical-align:middle;">E-CREDac</span>
    </div>
    <!-- Content -->
    <div style="background:#0F1120;border-radius:16px;border:1px solid #252A42;padding:32px;color:#e2e8f0;font-size:15px;line-height:1.6;">
      ${body}
    </div>
    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;color:#444B6B;font-size:12px;">
      <p>E-CREDac — Plataforma de Intermediação de Créditos de ICMS</p>
      <p>LGPD Compliant · ICP-Brasil · 256-bit SSL</p>
    </div>
  </div>
</body>
</html>`
}
