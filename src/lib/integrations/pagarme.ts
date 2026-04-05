/**
 * E-CREDac — Pagar.me v5 Integration
 *
 * Processamento de pagamentos com:
 * - PIX (QR code + copia/cola)
 * - TED (dados bancários)
 * - Boleto (PDF + código de barras)
 * - Split payment automático (platform fee)
 * - Webhook handler para atualização de status
 */

import { z } from 'zod'
import { HttpClient, IntegrationError, requireEnv } from './http-client'

// ─── Types ───────────────────────────────────────────────────────────────────

export type PaymentMethod = 'pix' | 'ted' | 'boleto'

export const CreatePaymentSchema = z.object({
  transactionId: z.string().uuid(),
  amount: z.number().positive(), // centavos
  paymentMethod: z.enum(['pix', 'ted', 'boleto']),
  buyer: z.object({
    name: z.string(),
    email: z.string().email(),
    document: z.string(), // CNPJ
    phone: z.string().optional(),
  }),
  seller: z.object({
    recipientId: z.string().optional(), // Pagar.me recipient ID for split
  }).optional(),
  platformFeeCents: z.number().int().nonnegative().default(0),
  metadata: z.record(z.string()).optional(),
})

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>

export interface PaymentResult {
  orderId: string
  chargeId: string
  status: string
  paymentMethod: PaymentMethod
  pix?: {
    qrCode: string
    qrCodeUrl: string
    expiresAt: string
  }
  boleto?: {
    url: string
    barcode: string
    dueDate: string
  }
  ted?: {
    bankName: string
    agency: string
    account: string
    accountType: string
    document: string
  }
}

export interface WebhookEvent {
  id: string
  type: string
  data: {
    id: string
    code: string
    status: string
    amount: number
    paid_amount: number
    payment_method: string
    metadata?: Record<string, string>
    charges: Array<{
      id: string
      status: string
      amount: number
      paid_at?: string
      payment_method: string
      last_transaction?: {
        id: string
        status: string
      }
    }>
  }
}

// ─── Client ──────────────────────────────────────────────────────────────────

function getClient(): HttpClient {
  const apiKey = requireEnv('PAGARME_API_KEY', 'Pagar.me')

  return new HttpClient({
    baseUrl: 'https://api.pagar.me/core/v5',
    name: 'Pagarme',
    timeout: 30_000,
    maxRetries: 2,
    circuitThreshold: 5,
    circuitResetMs: 60_000,
    defaultHeaders: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
    },
  })
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
  const validated = CreatePaymentSchema.parse(input)
  const client = getClient()

  const orderBody = buildOrderPayload(validated)

  const order = await client.post<PagarmeOrderResponse>('/orders', {
    body: orderBody,
  })

  const charge = order.charges?.[0]
  if (!charge) {
    throw new IntegrationError('Pagar.me retornou order sem charges', 'Pagarme', 500)
  }

  const result: PaymentResult = {
    orderId: order.id,
    chargeId: charge.id,
    status: charge.status,
    paymentMethod: validated.paymentMethod,
  }

  // Extract payment-specific data
  const lastTx = charge.last_transaction

  if (validated.paymentMethod === 'pix' && lastTx) {
    result.pix = {
      qrCode: lastTx.qr_code || '',
      qrCodeUrl: lastTx.qr_code_url || '',
      expiresAt: lastTx.expires_at || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }
  }

  if (validated.paymentMethod === 'boleto' && lastTx) {
    result.boleto = {
      url: lastTx.pdf || lastTx.url || '',
      barcode: lastTx.line || lastTx.barcode || '',
      dueDate: lastTx.due_at || '',
    }
  }

  if (validated.paymentMethod === 'ted') {
    result.ted = {
      bankName: 'Stone Pagamentos',
      agency: '0001',
      account: order.code || '',
      accountType: 'checking',
      document: '',
    }
  }

  return result
}

/**
 * Consulta status de um order pelo ID.
 */
export async function getOrder(orderId: string): Promise<PagarmeOrderResponse> {
  const client = getClient()
  return client.get<PagarmeOrderResponse>(`/orders/${orderId}`)
}

/**
 * Cancela/estorna um charge.
 */
export async function refundCharge(chargeId: string, amountCents?: number): Promise<unknown> {
  const client = getClient()
  return client.post(`/charges/${chargeId}/void`, {
    body: amountCents ? { amount: amountCents } : {},
  })
}

/**
 * Cria um recebedor (recipient) para split payment.
 * O seller precisa ser cadastrado como recipient para receber automaticamente.
 */
export async function createRecipient(data: {
  name: string
  email: string
  document: string
  bankCode: string
  agency: string
  account: string
  accountType: 'checking' | 'savings'
  pixKey?: string
}): Promise<{ recipientId: string }> {
  const client = getClient()

  const response = await client.post<{ id: string }>('/recipients', {
    body: {
      name: data.name,
      email: data.email,
      document: data.document,
      type: 'company',
      default_bank_account: {
        holder_name: data.name,
        holder_document: data.document,
        holder_type: 'company',
        bank: data.bankCode,
        branch_number: data.agency,
        account_number: data.account,
        account_check_digit: data.account.slice(-1),
        type: data.accountType,
      },
      transfer_settings: {
        transfer_enabled: true,
        transfer_interval: 'daily',
        transfer_day: 0,
      },
    },
  })

  return { recipientId: response.id }
}

// ─── Webhook Verification ────────────────────────────────────────────────────

export function verifyWebhookSignature(
  payload: string,
  signature: string,
): boolean {
  // Pagar.me v5 uses HMAC-SHA256
  // In production, verify with PAGARME_WEBHOOK_SECRET
  const secret = process.env.PAGARME_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[Pagarme] PAGARME_WEBHOOK_SECRET not set — skipping signature verification')
    return true
  }

  try {
    const crypto = require('crypto')
    const computed = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
  } catch {
    return false
  }
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

interface PagarmeOrderResponse {
  id: string
  code: string
  status: string
  amount: number
  charges: Array<{
    id: string
    status: string
    amount: number
    payment_method: string
    last_transaction?: {
      id: string
      status: string
      qr_code?: string
      qr_code_url?: string
      expires_at?: string
      pdf?: string
      url?: string
      line?: string
      barcode?: string
      due_at?: string
    }
  }>
}

function buildOrderPayload(input: CreatePaymentInput): Record<string, unknown> {
  const order: Record<string, unknown> = {
    code: input.transactionId,
    items: [{
      amount: input.amount,
      description: 'Crédito de ICMS — E-CREDac',
      quantity: 1,
      code: input.transactionId,
    }],
    customer: {
      name: input.buyer.name,
      email: input.buyer.email,
      document: input.buyer.document.replace(/\D/g, ''),
      document_type: 'CNPJ',
      type: 'company',
      phones: input.buyer.phone ? {
        mobile_phone: {
          country_code: '55',
          area_code: input.buyer.phone.slice(0, 2),
          number: input.buyer.phone.slice(2),
        },
      } : undefined,
    },
    payments: [buildPaymentPayload(input)],
    metadata: {
      platform: 'ecredac',
      transaction_id: input.transactionId,
      ...input.metadata,
    },
  }

  return order
}

function buildPaymentPayload(input: CreatePaymentInput): Record<string, unknown> {
  const payment: Record<string, unknown> = {
    amount: input.amount,
    payment_method: input.paymentMethod,
  }

  // Split payment: platform keeps the fee, seller receives the rest
  if (input.platformFeeCents > 0 && input.seller?.recipientId) {
    payment.split = [
      {
        amount: input.platformFeeCents,
        type: 'flat',
        recipient_id: process.env.PAGARME_PLATFORM_RECIPIENT_ID,
        options: { charge_processing_fee: false, charge_remainder_fee: false },
      },
      {
        amount: input.amount - input.platformFeeCents,
        type: 'flat',
        recipient_id: input.seller.recipientId,
        options: { charge_processing_fee: true, charge_remainder_fee: true },
      },
    ]
  }

  // Payment method specifics
  if (input.paymentMethod === 'pix') {
    payment.pix = {
      expires_in: 1800, // 30 minutos
    }
  }

  if (input.paymentMethod === 'boleto') {
    payment.boleto = {
      instructions: 'Crédito de ICMS — E-CREDac',
      due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias
    }
  }

  // TED não requer configuração adicional no payload

  return payment
}