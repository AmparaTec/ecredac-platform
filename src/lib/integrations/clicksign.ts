/**
 * E-CREDac — Clicksign Integration
 *
 * Assinatura digital de contratos com:
 * - Criação de documentos a partir de templates
 * - Gestão de signatários (comprador + vendedor)
 * - Webhook para tracking de assinaturas
 * - Suporte a sandbox e produção
 * - Autenticação via ICP-Brasil ou Token
 */

import { z } from 'zod'
import { HttpClient, IntegrationError, requireEnv, optionalEnv } from './http-client'

// ─── Types ───────────────────────────────────────────────────────────────────

export const CreateDocumentSchema = z.object({
  transactionId: z.string().uuid(),
  templateKey: z.string().optional(),
  content: z.string().optional(), // HTML content for the contract
  filename: z.string(),
  signers: z.array(z.object({
    name: z.string(),
    email: z.string().email(),
    cpf: z.string(),
    role: z.enum(['seller', 'buyer', 'witness', 'procurador']),
    authMethod: z.enum(['email', 'sms', 'whatsapp', 'icp_brasil']).default('email'),
    phone: z.string().optional(),
  })).min(2),
  metadata: z.record(z.string()).optional(),
})

export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>

export interface DocumentResult {
  documentKey: string
  signers: Array<{
    signerKey: string
    signatureKey: string
    name: string
    email: string
    role: string
    signUrl: string
  }>
  status: string
}

export interface WebhookPayload {
  event: {
    name: string // 'close' | 'auto_close' | 'cancel' | 'deadline' | 'sign'
  }
  document: {
    key: string
    status: string // 'running' | 'closed' | 'canceled'
    filename: string
  }
  signer?: {
    key: string
    email: string
    name: string
    signed_at?: string
  }
}

// ─── Client ──────────────────────────────────────────────────────────────────

function getClient(): HttpClient {
  const apiKey = requireEnv('CLICKSIGN_API_KEY', 'Clicksign')
  const baseUrl = optionalEnv(
    'CLICKSIGN_API_URL',
    process.env.NODE_ENV === 'production'
      ? 'https://app.clicksign.com/api/v1'
      : 'https://sandbox.clicksign.com/api/v1',
  )

  return new HttpClient({
    baseUrl,
    name: 'Clicksign',
    timeout: 30_000,
    maxRetries: 2,
    circuitThreshold: 5,
    circuitResetMs: 60_000,
    defaultHeaders: {},
  })
}

function withToken(path: string): string {
  const apiKey = requireEnv('CLICKSIGN_API_KEY', 'Clicksign')
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}access_token=${apiKey}`
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Cria um documento no Clicksign e adiciona signatários.
 * Retorna as URLs de assinatura para cada parte.
 */
export async function createDocument(input: CreateDocumentInput): Promise<DocumentResult> {
  const validated = CreateDocumentSchema.parse(input)
  const client = getClient()

  // 1. Upload document
  const docResponse = await client.post<ClicksignDocResponse>(withToken('/documents'), {
    body: {
      document: {
        path: `/ecredac/${validated.filename}`,
        content_base64: validated.content
          ? Buffer.from(validated.content).toString('base64')
          : undefined,
        template: validated.templateKey || undefined,
        deadline_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        auto_close: true,
        locale: 'pt-BR',
        sequence_enabled: false,
      },
    },
  })

  const documentKey = docResponse.document.key

  // 2. Create signers
  const signerResults: DocumentResult['signers'] = []

  for (const signer of validated.signers) {
    // Create signer
    const signerResponse = await client.post<ClicksignSignerResponse>(withToken('/signers'), {
      body: {
        signer: {
          name: signer.name,
          email: signer.email,
          documentation: signer.cpf.replace(/\D/g, ''),
          phone_number: signer.phone,
          auths: [signer.authMethod === 'icp_brasil' ? 'pki' : signer.authMethod],
          delivery: signer.authMethod === 'whatsapp' ? 'whatsapp' : 'email',
        },
      },
    })

    // Add signer to document
    const listResponse = await client.post<ClicksignListResponse>(withToken('/lists'), {
      body: {
        list: {
          document_key: documentKey,
          signer_key: signerResponse.signer.key,
          sign_as: mapRoleToSignAs(signer.role),
          message: `Por favor, assine o contrato de transferência de crédito ICMS.`,
        },
      },
    })

    signerResults.push({
      signerKey: signerResponse.signer.key,
      signatureKey: listResponse.list.request_signature_key,
      name: signer.name,
      email: signer.email,
      role: signer.role,
      signUrl: listResponse.list.url || `https://app.clicksign.com/sign/${listResponse.list.request_signature_key}`,
    })
  }

  // 3. Send notifications to all signers
  for (const signer of signerResults) {
    try {
      await client.post(withToken(`/notifications`), {
        body: {
          request_signature_key: signer.signatureKey,
          message: `Prezado(a) ${signer.name}, por favor assine o contrato de transferência de crédito de ICMS na plataforma E-CREDac.`,
        },
      })
    } catch {
      // Notification failure is non-critical
      console.warn(`[Clicksign] Falha ao notificar ${signer.email}`)
    }
  }

  return {
    documentKey,
    signers: signerResults,
    status: 'running',
  }
}

/**
 * Consulta status de um documento.
 */
export async function getDocumentStatus(documentKey: string): Promise<{
  status: string
  signers: Array<{ name: string; email: string; signedAt: string | null }>
  downloadUrl: string | null
}> {
  const client = getClient()

  const response = await client.get<ClicksignDocResponse>(
    withToken(`/documents/${documentKey}`),
  )

  return {
    status: response.document.status,
    signers: (response.document.signers || []).map((s: { name: string; email: string; signed_at?: string }) => ({
      name: s.name,
      email: s.email,
      signedAt: s.signed_at || null,
    })),
    downloadUrl: response.document.downloads?.signed_file_url || null,
  }
}

/**
 * Cancela um documento.
 */
export async function cancelDocument(documentKey: string): Promise<void> {
  const client = getClient()
  await client.patch(withToken(`/documents/${documentKey}/cancel`))
}

// ─── Webhook Verification ────────────────────────────────────────────────────

export function verifyWebhookHmac(
  payload: string,
  signature: string,
): boolean {
  const secret = process.env.CLICKSIGN_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[Clicksign] CLICKSIGN_WEBHOOK_SECRET not set — skipping verification')
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

// ─── Internal ────────────────────────────────────────────────────────────────

interface ClicksignDocResponse {
  document: {
    key: string
    status: string
    filename: string
    signers?: Array<{ name: string; email: string; signed_at?: string }>
    downloads?: { signed_file_url?: string }
  }
}

interface ClicksignSignerResponse {
  signer: { key: string; email: string; name: string }
}

interface ClicksignListResponse {
  list: {
    request_signature_key: string
    document_key: string
    signer_key: string
    url?: string
  }
}

function mapRoleToSignAs(role: string): string {
  switch (role) {
    case 'seller': return 'sign'
    case 'buyer': return 'sign'
    case 'witness': return 'witness'
    case 'procurador': return 'approve'
    default: return 'sign'
  }
}
