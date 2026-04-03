// ============================================
// E-CREDac — Database Types
// ============================================

export type CompanyTier = 'free' | 'premium'
export type CompanyType = 'seller' | 'buyer' | 'both'
export type SefazStatus = 'regular' | 'irregular' | 'suspended' | 'pending'

export type CreditType = 'acumulado' | 'st' | 'rural'
export type CreditOrigin = 'exportacao' | 'diferimento' | 'aliquota_reduzida' | 'substituicao_tributaria'
export type HomologationStatus = 'pendente' | 'em_analise' | 'homologado' | 'rejeitado'
export type ListingStatus = 'draft' | 'active' | 'matched' | 'sold' | 'expired' | 'cancelled'

export type RequestUrgency = 'low' | 'medium' | 'high'
export type RequestStatus = 'active' | 'matched' | 'fulfilled' | 'expired' | 'cancelled'

export type MatchStatus = 'proposed' | 'accepted_seller' | 'accepted_buyer' | 'confirmed' | 'cancelled' | 'expired'

export type TransactionStatus = 'pending_payment' | 'paid' | 'transferring' | 'completed' | 'disputed' | 'cancelled'
export type PaymentMethod = 'pix' | 'ted' | 'boleto'
export type PaymentStatus = 'pending' | 'processing' | 'confirmed' | 'failed' | 'refunded'

// ============================================
// Table Row Types
// ============================================

export interface Company {
  id: string
  auth_user_id: string | null
  cnpj: string
  razao_social: string
  nome_fantasia: string | null
  inscricao_estadual: string | null
  sefaz_status: SefazStatus
  sefaz_verified_at: string | null
  email: string
  phone: string | null
  address: Record<string, string>
  tier: CompanyTier
  type: CompanyType
  verified: boolean
  verified_at: string | null
  lgpd_consent: boolean
  lgpd_consent_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreditListing {
  id: string
  company_id: string
  credit_type: CreditType
  origin: CreditOrigin
  amount: number
  remaining_amount: number
  min_discount: number
  max_discount: number
  e_credac_protocol: string | null
  homologation_status: HomologationStatus
  homologation_date: string | null
  status: ListingStatus
  published_at: string | null
  expires_at: string | null
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined
  company?: Company
}

export interface CreditRequest {
  id: string
  company_id: string
  amount_needed: number
  remaining_needed: number
  max_discount_accepted: number
  urgency: RequestUrgency
  icms_due_date: string | null
  preferred_credit_types: CreditType[] | null
  preferred_origins: CreditOrigin[] | null
  status: RequestStatus
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined
  company?: Company
}

export interface Match {
  id: string
  listing_id: string
  request_id: string
  seller_company_id: string
  buyer_company_id: string
  matched_amount: number
  agreed_discount: number
  platform_fee_pct: number
  total_payment: number
  platform_fee: number
  net_to_seller: number
  match_score: number | null
  status: MatchStatus
  seller_accepted_at: string | null
  buyer_accepted_at: string | null
  confirmed_at: string | null
  expires_at: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined
  seller_company?: Company
  buyer_company?: Company
  listing?: CreditListing
  request?: CreditRequest
}

export interface Transaction {
  id: string
  match_id: string
  seller_company_id: string
  buyer_company_id: string
  credit_amount: number
  discount_applied: number
  total_payment: number
  platform_fee: number
  net_to_seller: number
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  payment_confirmed_at: string | null
  payment_reference: string | null
  nfe_key: string | null
  nfe_cfop: string | null
  contract_clicksign_key: string | null
  contract_signed_at: string | null
  contract_url: string | null
  status: TransactionStatus
  completed_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined
  seller_company?: Company
  buyer_company?: Company
  match?: Match
}

export interface Notification {
  id: string
  company_id: string
  type: string
  title: string
  body: string | null
  read: boolean
  read_at: string | null
  reference_type: string | null
  reference_id: string | null
  created_at: string
}

// ============================================
// API Types
// ============================================

export interface CnpjVerifyResponse {
  valid: boolean
  cnpj: string
  razao_social: string
  nome_fantasia: string
  situacao: string // 'ATIVA', 'BAIXADA', etc.
  type: string
  abertura: string
  atividade_principal: { code: string; text: string }[]
  endereco: {
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    municipio: string
    uf: string
    cep: string
  }
}

export interface MatchingResult {
  match_id: string
  listing_id: string
  request_id: string
  matched_amount: number
  agreed_discount: number
  match_score: number
}

export interface DashboardStats {
  total_listings_volume: number
  total_requests_volume: number
  total_transacted: number
  total_platform_fees: number
  active_listings: number
  active_requests: number
  pending_matches: number
  completed_transactions: number
}
