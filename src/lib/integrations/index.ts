/**
 * E-CREDac -- Integration Layer
 *
 * Barrel export para todas as integracoes externas.
 *
 * @example
 * import { verifyCnpj, sendEmail, createPayment, createDocument } from '@/lib/integrations'
 */

// Base
export { HttpClient, IntegrationError, requireEnv, optionalEnv } from './http-client'

// ReceitaWS -- CNPJ Verification
export { verifyCnpj, CnpjDataSchema } from './receitaws'
export type { CnpjData } from './receitaws'

// Resend -- Transactional Email
export { sendEmail, sendBatch } from './resend'
export type { EmailTemplate, EmailPayload, EmailResult } from './resend'

// Pagar.me -- Payment Processing
export {
  createPayment,
  getOrder,
  refundCharge,
  createRecipient,
  verifyWebhookSignature as verifyPagarmeWebhook,
  CreatePaymentSchema,
} from './pagarme'
export type { PaymentMethod, CreatePaymentInput, PaymentResult } from './pagarme'

// Clicksign -- Digital Signatures
export {
  createDocument,
  getDocumentStatus,
  cancelDocument,
  verifyWebhookHmac as verifyClicksignWebhook,
  CreateDocumentSchema,
} from './clicksign'
export type { CreateDocumentInput, DocumentResult } from './clicksign'

// Consultas Publicas -- Due Diligence & Cache
export {
  getCachedConsulta,
  setCachedConsulta,
  executarDueDiligence,
  limparCacheExpirado,
  calcularScoreRelius,
  PORTAIS_PUBLICOS,
  CACHE_TTL,
} from './consultas-publicas'
export type {
  ConsultaTipo,
  CadespData,
  CndData,
  CadinData,
  ContaFiscalData,
  DebitoEstadualData,
  DueDiligenceResult,
} from './consultas-publicas'

// e-CredAc -- Provider & Helpers
export {
  createEcredacProvider,
  registrarSaldoManual,
  atualizarProtocolo,
  verificarProcuracaoAtiva,
  listarOperacoesPendentes,
} from './ecredac-provider'
export type {
  EcredacSaldo,
  EcredacExtrato,
  TransferenciaParams,
  EcredacProtocolo,
  AceiteResult,
  EcredacStatus,
  IEcredacProvider,
} from './ecredac-provider'
