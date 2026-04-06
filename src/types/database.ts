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
  credit_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined
  company?: Company
  credit_score?: CreditScore
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
// Credit Score Types
// ============================================

export type CreditScoreGrade = 'A' | 'B' | 'C' | 'D'

export interface CreditScore {
  id: string
  listing_id: string
  score: number
  grade: CreditScoreGrade
  sefaz_risk_score: number
  homologation_score: number
  maturity_score: number
  origin_score: number
  documentation_score: number
  historical_score: number
  risk_factors: RiskFactor[]
  estimated_homologation_days: number | null
  algorithm_version: string
  calculated_at: string
  expires_at: string
  created_at: string
  updated_at: string
}

export interface RiskFactor {
  factor: string
  impact: number
  description: string
}

export interface CreditScoreBreakdown {
  score: number
  grade: CreditScoreGrade
  sefaz_risk: number
  homologation: number
  maturity: number
  origin_quality: number
  documentation: number
  historical: number
  risk_factors: RiskFactor[]
  est_homologation_days: number
}

export interface PriceHistory {
  id: string
  listing_id: string | null
  transaction_id: string | null
  credit_type: CreditType
  origin: CreditOrigin
  amount: number
  discount_applied: number
  price_per_real: number
  credit_score: number | null
  credit_grade: CreditScoreGrade | null
  region: string | null
  recorded_at: string
}

// ============================================
// Pricing Types (Sprint 2)
// ============================================

export type MarketPosition = 'abaixo_mercado' | 'na_media' | 'acima_mercado' | 'premium'

export interface PriceFactor {
  name: string
  impact: number
  desc: string
}

export interface PriceRecommendation {
  id: string
  listing_id: string
  recommended_discount: number
  discount_range_low: number
  discount_range_high: number
  recommended_price_per_real: number
  confidence: number
  factors: PriceFactor[]
  vs_market_avg: number
  vs_market_position: MarketPosition
  estimated_days_to_sell: number | null
  sell_probability_7d: number
  sell_probability_30d: number
  algorithm_version: string
  calculated_at: string
  expires_at: string
  created_at: string
  updated_at: string
}

export interface MarketBenchmark {
  id: string
  credit_type: CreditType
  origin: CreditOrigin
  credit_grade: CreditScoreGrade | null
  avg_discount: number
  min_discount: number
  max_discount: number
  median_discount: number
  stddev_discount: number
  total_volume: number
  transaction_count: number
  discount_trend: number
  volume_trend: number
  avg_days_to_sell: number | null
  liquidity_score: number
  period_start: string
  period_end: string
  sample_size: number
  confidence_level: number
  created_at: string
  updated_at: string
}

export interface PriceRecommendationResult {
  listing_id: string
  recommended_discount: number
  discount_range: { low: number; high: number }
  price_per_real: number
  confidence: number
  factors: PriceFactor[]
  market_position: MarketPosition
  vs_market_avg: number
  estimated_days_to_sell: number
  sell_probability: { '7d': number; '30d': number }
  data_points: {
    history_transactions: number
    supply_count: number
    demand_count: number
    supply_volume: number
    demand_volume: number
  }
  algorithm_version: string
}

// ============================================
// Active Matching Types (Sprint 3)
// ============================================

export type BidStatus = 'active' | 'won' | 'outbid' | 'expired' | 'cancelled'
export type AlertChannel = 'in_app' | 'email' | 'both'
export type AuctionStatus = 'open' | 'closed' | 'cancelled' | 'no_bids'
export type BidStrategy = 'fixed' | 'market' | 'aggressive'
export type AlertType = 'credit' | 'demand'

export interface MatchAlert {
  id: string
  company_id: string
  name: string
  active: boolean
  alert_type: AlertType
  credit_types: CreditType[] | null
  origins: CreditOrigin[] | null
  min_amount: number | null
  max_amount: number | null
  min_grade: CreditScoreGrade | null
  max_discount: number | null
  min_discount: number | null
  channel: AlertChannel
  matches_found: number
  last_triggered_at: string | null
  max_triggers: number | null
  created_at: string
  updated_at: string
}

export interface AutoBidRule {
  id: string
  company_id: string
  name: string
  active: boolean
  credit_types: CreditType[] | null
  origins: CreditOrigin[] | null
  min_grade: CreditScoreGrade | null
  min_amount: number | null
  max_amount: number | null
  homologation_required: boolean
  bid_strategy: BidStrategy
  fixed_discount: number | null
  market_offset: number | null
  max_bid_discount: number
  min_bid_discount: number
  max_total_exposure: number | null
  max_single_bid: number | null
  max_bids_per_day: number
  current_exposure: number
  bids_today: number
  total_bids: number
  total_won: number
  total_volume_won: number
  created_at: string
  updated_at: string
}

export interface SilentAuction {
  id: string
  listing_id: string
  seller_company_id: string
  status: AuctionStatus
  min_discount: number
  reserve_discount: number | null
  starts_at: string
  ends_at: string
  extended_until: string | null
  winning_bid_id: string | null
  final_discount: number | null
  total_bids: number
  unique_bidders: number
  auto_extend: boolean
  auto_extend_minutes: number
  visible_bid_count: boolean
  visible_time_remaining: boolean
  created_at: string
  updated_at: string
  // Joined
  listing?: CreditListing
  winning_bid?: AuctionBid
}

export interface AuctionBid {
  id: string
  auction_id: string
  bidder_company_id: string
  bid_discount: number
  bid_amount: number
  status: BidStatus
  is_auto_bid: boolean
  auto_bid_rule_id: string | null
  placed_at: string
  outbid_at: string | null
  won_at: string | null
  created_at: string
  updated_at: string
  // Joined
  bidder_company?: Company
}

// ============================================
// Guided Execution Types (Sprint 4)
// ============================================

export type ExecutionTaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped'
export type SLAStatus = 'on_track' | 'at_risk' | 'breached' | 'completed'
export type ResponsibleRole = 'seller' | 'buyer' | 'platform' | 'sefaz' | 'legal' | 'financial'

export interface ExecutionTemplate {
  id: string
  phase: number
  phase_name: string
  task_order: number
  task_name: string
  task_description: string | null
  responsible: ResponsibleRole
  sla_hours: number
  sla_critical: boolean
  required: boolean
  depends_on_task: number | null
  requires_document: boolean
  document_type: string | null
  auto_complete_condition: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface ExecutionPlan {
  id: string
  match_id: string
  current_phase: number
  overall_progress: number
  overall_sla_status: SLAStatus
  started_at: string
  estimated_completion: string | null
  completed_at: string | null
  total_tasks: number
  completed_tasks: number
  blocked_tasks: number
  breached_slas: number
  created_at: string
  updated_at: string
  // Joined
  tasks?: ExecutionTask[]
  match?: Match
}

export interface ExecutionTask {
  id: string
  plan_id: string
  template_id: string | null
  phase: number
  task_order: number
  task_name: string
  task_description: string | null
  status: ExecutionTaskStatus
  responsible: ResponsibleRole
  assigned_company_id: string | null
  assigned_user_name: string | null
  sla_hours: number
  sla_deadline: string | null
  sla_status: SLAStatus
  sla_breached_at: string | null
  started_at: string | null
  completed_at: string | null
  completed_by: string | null
  completion_note: string | null
  blocked_reason: string | null
  blocked_at: string | null
  document_id: string | null
  document_url: string | null
  required: boolean
  sla_critical: boolean
  created_at: string
  updated_at: string
  // Joined
  comments?: ExecutionComment[]
}

export interface ExecutionComment {
  id: string
  task_id: string
  company_id: string | null
  author_name: string | null
  content: string
  created_at: string
}

// ============================================
// User Roles & Commission Types (Sprint 6)
// ============================================

export type UserRole = 'titular' | 'representante' | 'procurador'
export type ProcuradorStatus = 'pending' | 'active' | 'suspended' | 'inactive'
export type ProcuradorTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
export type CommissionStatus = 'pending' | 'earned' | 'processing' | 'paid' | 'cancelled'

export interface UserProfile {
  id: string
  auth_user_id: string
  full_name: string
  cpf: string | null
  phone: string | null
  email: string
  role: UserRole
  avatar_url: string | null
  referral_code: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CompanyMember {
  id: string
  company_id: string
  user_profile_id: string
  role: UserRole
  can_list_credits: boolean
  can_request_credits: boolean
  can_approve_matches: boolean
  can_sign_contracts: boolean
  can_view_financials: boolean
  can_manage_team: boolean
  active: boolean
  invited_by: string | null
  accepted_at: string | null
  power_of_attorney_url: string | null
  power_of_attorney_valid_until: string | null
  created_at: string
  updated_at: string
  // Joined
  company?: Company
  user_profile?: UserProfile
}

export interface ProcuradorProfile {
  id: string
  user_profile_id: string
  office_name: string
  office_cnpj: string | null
  office_crc: string | null
  office_oab: string | null
  specialty: string | null
  status: ProcuradorStatus
  tier: ProcuradorTier
  approved_at: string | null
  custom_commission_pct: number | null
  total_companies: number
  total_volume_intermediated: number
  total_commissions_earned: number
  total_commissions_paid: number
  current_month_volume: number
  bank_name: string | null
  bank_agency: string | null
  bank_account: string | null
  bank_account_type: string | null
  pix_key: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined
  user_profile?: UserProfile
}

export interface ReferralInvite {
  id: string
  procurador_id: string
  invited_email: string | null
  invited_cnpj: string | null
  invited_company_name: string | null
  referral_code: string
  invite_url: string | null
  status: string
  accepted_at: string | null
  accepted_by: string | null
  company_id: string | null
  expires_at: string
  created_at: string
  updated_at: string
}

export interface Commission {
  id: string
  procurador_id: string
  transaction_id: string | null
  company_id: string
  transaction_value: number
  commission_pct: number
  commission_value: number
  commission_type: string
  status: CommissionStatus
  paid_at: string | null
  payment_reference: string | null
  reference_month: string | null
  created_at: string
  updated_at: string
  // Joined
  company?: Company
  transaction?: Transaction
}

export interface CommissionTier {
  id: string
  tier: ProcuradorTier
  min_monthly_volume: number
  max_monthly_volume: number | null
  commission_pct: number
  activation_bonus: number
  benefits: Record<string, boolean>
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
