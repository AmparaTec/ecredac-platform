/**
 * E-CREDac — Integration Layer
 *
 * Barrel export para todas as integrações externas.
 *
 * @example
 * import { verifyCnpj, sendEmail, createPayment, createDocument } from '@/lib/integrations'
 */

// Base
export { HttpClient, IntegrationError, requireEnv, optionalEnv } from './http-client'

// ReceitaWS — CNPJ Verification
export { verifyCnpj, CnpjDataSchema } from './receitaws'
export type { CnpjData } from './receitaws'

// Resend — Transactional Email
export { sendEmail, sendBatch } from './resend'
export type { EmailTemplate, EmailPayload, EmailResult } from './resend'

// Pagar.me — Payment Processing
export {
  createPayment,
  getOrder,
  refundCharge,
  createRecipient,
  verifyWebhookSignature as verifyPagarmeWebhook,
  CreatePaymentSchema,
} from './pagarme'
export type { PaymentMethod, CreatePaymentInput, PaymentResult } from './pagarme'

// Clicksign — Digital Signatures
export {
  createDocument,
  getDocumentStatus,
  cancelDocument,
  verifyWebhookHmac as verifyClicksignWebhook,
  CreateDocumentSchema,
} from './clicksign'
export type { CreateDocumentInput, DocumentResult } from './clicksign'
