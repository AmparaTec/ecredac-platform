/**
 * Integração WhatsApp Business Cloud API (Meta)
 * Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Variáveis de ambiente necessárias:
 *   WHATSAPP_TOKEN          — Bearer token da API (gerado no Meta Business)
 *   WHATSAPP_PHONE_ID       — ID do número de telefone registrado
 *   WHATSAPP_BUSINESS_ID    — ID da conta Business (opcional)
 *   WHATSAPP_VERIFY_TOKEN   — Token para validação do webhook
 *   NEXT_PUBLIC_APP_URL     — URL da plataforma
 */

const WHATSAPP_API = 'https://graph.facebook.com/v21.0'

function getConfig() {
  return {
    token: process.env.WHATSAPP_TOKEN || '',
    phoneId: process.env.WHATSAPP_PHONE_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://ecredac.com.br',
  }
}

function isConfigured(): boolean {
  const c = getConfig()
  return !!(c.token && c.phoneId)
}

// ─── Tipos ───────────────────────────────────────────

interface WhatsAppResponse {
  messaging_product: string
  contacts: { input: string; wa_id: string }[]
  messages: { id: string }[]
}

interface SendResult {
  ok: boolean
  messageId?: string
  error?: string
  fallback?: 'wa.me' | 'none'
  fallbackUrl?: string
}

export type WhatsAppTemplate =
  | 'convite_plataforma'
  | 'match_encontrado'
  | 'pagamento_recebido'
  | 'marco_concluido'
  | 'contrato_pronto'
  | 'aceite_cessionario'
  | 'comissao_disponivel'

// ─── Envio de mensagens ──────────────────────────────

/**
 * Envia mensagem de texto simples via WhatsApp Business API.
 * Se a API não estiver configurada, retorna fallback wa.me link.
 */
export async function sendWhatsAppText(
  phone: string,
  message: string
): Promise<SendResult> {
  const cleanPhone = normalizePhone(phone)
  if (!cleanPhone) {
    return { ok: false, error: 'Número de telefone inválido' }
  }

  // Se API não configurada, retornar link wa.me para abertura manual
  if (!isConfigured()) {
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    return { ok: true, fallback: 'wa.me', fallbackUrl: url }
  }

  const config = getConfig()

  try {
    const res = await fetch(`${WHATSAPP_API}/${config.phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { body: message },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[WhatsApp] API error:', err)
      // Fallback para wa.me
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      return { ok: false, error: err?.error?.message || 'Erro na API', fallback: 'wa.me', fallbackUrl: url }
    }

    const data: WhatsAppResponse = await res.json()
    return { ok: true, messageId: data.messages?.[0]?.id }
  } catch (err: any) {
    console.error('[WhatsApp] Unexpected:', err)
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    return { ok: false, error: err.message, fallback: 'wa.me', fallbackUrl: url }
  }
}

/**
 * Envia template aprovado pelo Meta (necessário para mensagens proativas).
 * Os templates devem ser criados e aprovados no Meta Business Manager.
 */
export async function sendWhatsAppTemplate(
  phone: string,
  template: WhatsAppTemplate,
  params: Record<string, string> = {}
): Promise<SendResult> {
  const cleanPhone = normalizePhone(phone)
  if (!cleanPhone) {
    return { ok: false, error: 'Número de telefone inválido' }
  }

  // Se API não configurada, construir mensagem texto e enviar via wa.me
  if (!isConfigured()) {
    const textMessage = buildTemplateMessage(template, params)
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`
    return { ok: true, fallback: 'wa.me', fallbackUrl: url }
  }

  const config = getConfig()

  // Montar components do template
  const components: any[] = []
  const paramValues = Object.values(params)
  if (paramValues.length > 0) {
    components.push({
      type: 'body',
      parameters: paramValues.map(v => ({ type: 'text', text: v })),
    })
  }

  try {
    const res = await fetch(`${WHATSAPP_API}/${config.phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'template',
        template: {
          name: template,
          language: { code: 'pt_BR' },
          components: components.length > 0 ? components : undefined,
        },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[WhatsApp] Template error:', err)
      // Fallback
      const textMessage = buildTemplateMessage(template, params)
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`
      return { ok: false, error: err?.error?.message, fallback: 'wa.me', fallbackUrl: url }
    }

    const data: WhatsAppResponse = await res.json()
    return { ok: true, messageId: data.messages?.[0]?.id }
  } catch (err: any) {
    const textMessage = buildTemplateMessage(template, params)
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`
    return { ok: false, error: err.message, fallback: 'wa.me', fallbackUrl: url }
  }
}

// ─── Webhook (verificação + recebimento) ─────────────

/**
 * Verifica o webhook (GET) — Meta envia challenge para confirmar.
 */
export function verifyWebhook(params: URLSearchParams): { status: number; body: string } {
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')
  const config = getConfig()

  if (mode === 'subscribe' && token === config.verifyToken) {
    return { status: 200, body: challenge || '' }
  }
  return { status: 403, body: 'Forbidden' }
}

/**
 * Processa mensagem recebida (POST) do webhook.
 * Retorna parsed data ou null se não for mensagem relevante.
 */
export function parseIncomingMessage(body: any): {
  from: string
  name: string
  text: string
  timestamp: string
  messageId: string
} | null {
  try {
    const entry = body?.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value
    const message = value?.messages?.[0]

    if (!message || message.type !== 'text') return null

    const contact = value?.contacts?.[0]

    return {
      from: message.from,
      name: contact?.profile?.name || '',
      text: message.text?.body || '',
      timestamp: message.timestamp,
      messageId: message.id,
    }
  } catch {
    return null
  }
}

// ─── Templates de mensagem (fallback texto) ──────────

const TEMPLATES: Record<WhatsAppTemplate, (p: Record<string, string>) => string> = {
  convite_plataforma: (p) =>
    `Olá${p.nome ? `, ${p.nome}` : ''}! 👋\n\n` +
    `Você foi convidado para a plataforma *E-CREDac* — o maior marketplace de créditos de ICMS do Brasil.\n\n` +
    `Cadastre-se pelo link:\n${p.link || p.url || ''}\n\n` +
    `Use o código de indicação: *${p.codigo || ''}*\n\n` +
    `Com a E-CREDac você pode comprar ou vender créditos de ICMS com segurança, rastreabilidade e deságios competitivos.`,

  match_encontrado: (p) =>
    `🔗 *Novo match encontrado!*\n\n` +
    `Um crédito de *R$ ${p.valor || ''}* com deságio de *${p.desagio || ''}%* foi conectado ao seu perfil.\n\n` +
    `Acesse a plataforma para analisar e aceitar: ${p.url || ''}`,

  pagamento_recebido: (p) =>
    `💰 *Pagamento confirmado!*\n\n` +
    `O pagamento de *R$ ${p.valor || ''}* referente à operação #${p.operacao || ''} foi recebido.\n\n` +
    `Acompanhe: ${p.url || ''}`,

  marco_concluido: (p) =>
    `✅ *Marco ${p.numero || ''} concluído*\n\n` +
    `"${p.titulo || ''}" foi concluído na operação #${p.operacao || ''}.\n\n` +
    `${p.parcela ? `Uma parcela de pagamento pode estar disponível para liberação.\n\n` : ''}` +
    `Acompanhe: ${p.url || ''}`,

  contrato_pronto: (p) =>
    `📝 *Contrato pronto para assinatura*\n\n` +
    `O contrato de cessão de crédito da operação #${p.operacao || ''} está pronto.\n\n` +
    `Valor: *R$ ${p.valor || ''}*\n` +
    `Assine digitalmente: ${p.url || ''}`,

  aceite_cessionario: (p) =>
    `⏰ *Aceite pendente no e-CredAc*\n\n` +
    `A cessão foi protocolada na SEFAZ. Você tem *10 dias* para aceitar.\n\n` +
    `Protocolo: ${p.protocolo || ''}\n` +
    `Operação: #${p.operacao || ''}\n\n` +
    `Acesse o e-CredAc para aceitar a transferência.`,

  comissao_disponivel: (p) =>
    `💎 *Comissão disponível!*\n\n` +
    `Sua comissão de *R$ ${p.valor || ''}* (${p.percentual || ''}%) foi apurada.\n\n` +
    `Referente à operação #${p.operacao || ''} do cliente ${p.cliente || ''}.\n\n` +
    `Consulte seus ganhos: ${p.url || ''}`,
}

function buildTemplateMessage(template: WhatsAppTemplate, params: Record<string, string>): string {
  const fn = TEMPLATES[template]
  return fn ? fn(params) : `Notificação E-CREDac: ${template}`
}

// ─── Utilitários ─────────────────────────────────────

/**
 * Normaliza número brasileiro para formato internacional (5511999998888).
 */
function normalizePhone(phone: string): string {
  // Remover tudo que não é dígito
  let digits = phone.replace(/\D/g, '')

  // Se começar com 0, remover
  if (digits.startsWith('0')) digits = digits.slice(1)

  // Se não tiver código de país, adicionar 55
  if (!digits.startsWith('55') && digits.length <= 11) {
    digits = '55' + digits
  }

  // Validar tamanho (55 + DDD 2 + número 8-9 = 12-13 dígitos)
  if (digits.length < 12 || digits.length > 13) {
    return ''
  }

  return digits
}

/**
 * Gera link wa.me para abrir conversa diretamente.
 * Útil como fallback quando a API não está configurada.
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const clean = normalizePhone(phone)
  if (!clean) return ''
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
}

/**
 * Verifica se a integração WhatsApp Business API está configurada.
 */
export function isWhatsAppConfigured(): boolean {
  return isConfigured()
}
