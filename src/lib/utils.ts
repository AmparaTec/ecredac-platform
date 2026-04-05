import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format BRL currency
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Format number with locale
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

// Format date
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

// Format CNPJ
export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '')
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
}

// Validate CNPJ
export function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return false
  if (/^(\d)\1+$/.test(digits)) return false

  let sum = 0
  let weight = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weight[i]
  let remainder = sum % 11
  const digit1 = remainder < 2 ? 0 : 11 - remainder

  sum = 0
  weight = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weight[i]
  remainder = sum % 11
  const digit2 = remainder < 2 ? 0 : 11 - remainder

  return parseInt(digits[12]) === digit1 && parseInt(digits[13]) === digit2
}

// CNPJ mask for input
export function cnpjMask(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18)
}

// Urgency label/color
export const urgencyConfig = {
  high: { label: 'Alta', color: 'text-red-700', bg: 'bg-red-50', badge: 'bg-red-100 text-red-800' },
  medium: { label: 'Média', color: 'text-amber-700', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-800' },
  low: { label: 'Baixa', color: 'text-blue-700', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-800' },
}

// Credit type labels
export const creditTypeLabels: Record<string, string> = {
  acumulado: 'Acumulado',
  st: 'Subst. Tributária',
  rural: 'Rural',
}

// Credit origin labels
export const creditOriginLabels: Record<string, string> = {
  exportacao: 'Exportação',
  diferimento: 'Diferimento',
  aliquota_reduzida: 'Alíquota Reduzida',
  substituicao_tributaria: 'Subst. Tributária',
}

// Homologation status
export const homologationConfig: Record<string, { label: string; badge: string }> = {
  pendente: { label: 'Pendente', badge: 'bg-gray-100 text-gray-800' },
  em_analise: { label: 'Em análise', badge: 'bg-amber-100 text-amber-800' },
  homologado: { label: 'Homologado', badge: 'bg-emerald-100 text-emerald-800' },
  rejeitado: { label: 'Rejeitado', badge: 'bg-red-100 text-red-800' },
}

// Match status
export const matchStatusConfig: Record<string, { label: string; badge: string }> = {
  proposed: { label: 'Proposto', badge: 'bg-amber-100 text-amber-800' },
  accepted_seller: { label: 'Aceito (cedente)', badge: 'bg-blue-100 text-blue-800' },
  accepted_buyer: { label: 'Aceito (cessionário)', badge: 'bg-blue-100 text-blue-800' },
  confirmed: { label: 'Confirmado', badge: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelado', badge: 'bg-red-100 text-red-800' },
  expired: { label: 'Expirado', badge: 'bg-gray-100 text-gray-800' },
}

// Credit Score config
export const creditScoreConfig: Record<string, { label: string; badge: string; color: string; description: string }> = {
  A: { label: 'A', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', color: '#059669', description: 'Excelente — baixo risco, alta liquidez' },
  B: { label: 'B', badge: 'bg-blue-100 text-blue-800 border-blue-300', color: '#2563eb', description: 'Bom — risco moderado, boa liquidez' },
  C: { label: 'C', badge: 'bg-amber-100 text-amber-800 border-amber-300', color: '#d97706', description: 'Regular — requer atencao, liquidez limitada' },
  D: { label: 'D', badge: 'bg-red-100 text-red-800 border-red-300', color: '#dc2626', description: 'Alto risco — liquidez muito baixa' },
}

// Score component labels
export const scoreComponentLabels: Record<string, string> = {
  sefaz_risk_score: 'Risco SEFAZ',
  homologation_score: 'Homologação',
  maturity_score: 'Maturidade',
  origin_score: 'Origem',
  documentation_score: 'Documentação',
  historical_score: 'Histórico',
}

// Market position config
export const marketPositionConfig: Record<string, { label: string; badge: string; icon: string; description: string }> = {
  premium: { label: 'Premium', badge: 'bg-purple-100 text-purple-800 border-purple-300', icon: '⭐', description: 'Preço acima do mercado — alta qualidade percebida' },
  acima_mercado: { label: 'Acima do Mercado', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: '↑', description: 'Preço levemente acima da média' },
  na_media: { label: 'Na Média', badge: 'bg-blue-100 text-blue-800 border-blue-300', icon: '≈', description: 'Preço alinhado com o mercado' },
  abaixo_mercado: { label: 'Abaixo do Mercado', badge: 'bg-amber-100 text-amber-800 border-amber-300', icon: '↓', description: 'Preço abaixo da média — venda mais rápida' },
}

// Confidence level config
export const confidenceConfig = (confidence: number) => {
  if (confidence >= 80) return { label: 'Alta', color: 'text-emerald-700', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-800' }
  if (confidence >= 60) return { label: 'Boa', color: 'text-blue-700', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-800' }
  if (confidence >= 40) return { label: 'Moderada', color: 'text-amber-700', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-800' }
  return { label: 'Baixa', color: 'text-red-700', bg: 'bg-red-50', badge: 'bg-red-100 text-red-800' }
}

// Format discount
export function formatDiscount(discount: number): string {
  return `${discount.toFixed(1)}%`
}

// Format price per real
export function formatPricePerReal(price: number): string {
  return `R$ ${price.toFixed(4)}`
}

// Execution task status config
export const executionTaskStatusConfig: Record<string, { label: string; badge: string; icon: string }> = {
  pending: { label: 'Pendente', badge: 'bg-gray-100 text-gray-700', icon: '○' },
  in_progress: { label: 'Em Andamento', badge: 'bg-blue-100 text-blue-800', icon: '◉' },
  completed: { label: 'Concluido', badge: 'bg-emerald-100 text-emerald-800', icon: '✓' },
  blocked: { label: 'Bloqueado', badge: 'bg-red-100 text-red-800', icon: '✕' },
  skipped: { label: 'Pulado', badge: 'bg-gray-100 text-gray-500', icon: '—' },
}

// SLA status config
export const slaStatusConfig: Record<string, { label: string; badge: string; color: string }> = {
  on_track: { label: 'No Prazo', badge: 'bg-emerald-100 text-emerald-800', color: '#059669' },
  at_risk: { label: 'Em Risco', badge: 'bg-amber-100 text-amber-800', color: '#d97706' },
  breached: { label: 'SLA Violado', badge: 'bg-red-100 text-red-800', color: '#dc2626' },
  completed: { label: 'Concluido', badge: 'bg-gray-100 text-gray-700', color: '#6b7280' },
}

// Responsible role config
export const responsibleRoleConfig: Record<string, { label: string; badge: string }> = {
  seller: { label: 'Cedente', badge: 'bg-purple-100 text-purple-800' },
  buyer: { label: 'Cessionário', badge: 'bg-indigo-100 text-indigo-800' },
  platform: { label: 'Plataforma', badge: 'bg-brand-100 text-brand-800' },
  sefaz: { label: 'SEFAZ', badge: 'bg-amber-100 text-amber-800' },
  legal: { label: 'Juridico', badge: 'bg-gray-100 text-gray-800' },
  financial: { label: 'Financeiro', badge: 'bg-emerald-100 text-emerald-800' },
}

// Phase names for execution
export const executionPhaseNames: Record<number, string> = {
  1: 'Originacao',
  2: 'Matching',
  3: 'Conclusao Comercial',
  4: 'Procuracao Digital',
  5: 'Contrato',
  6: 'Transferência SEFAZ',
  7: 'Uso do Crédito',
  8: 'Concluido',
}

// Format remaining time
export function formatTimeRemaining(deadline: string): string {
  const now = new Date()
  const dl = new Date(deadline)
  const diff = dl.getTime() - now.getTime()
  if (diff <= 0) return 'Vencido'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return `${Math.floor(diff / (1000 * 60))}min`
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

// Transaction status
export const transactionStatusConfig: Record<string, { label: string; badge: string }> = {
  pending_payment: { label: 'Ag. Pagamento', badge: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Pago', badge: 'bg-blue-100 text-blue-800' },
  transferring: { label: 'Transferindo', badge: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Concluido', badge: 'bg-emerald-100 text-emerald-800' },
  disputed: { label: 'Em disputa', badge: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelado', badge: 'bg-gray-100 text-gray-800' },
}
