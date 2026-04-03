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
  medium: { label: 'Media', color: 'text-amber-700', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-800' },
  low: { label: 'Baixa', color: 'text-blue-700', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-800' },
}

// Credit type labels
export const creditTypeLabels: Record<string, string> = {
  acumulado: 'Acumulado',
  st: 'Subst. Tributaria',
  rural: 'Rural',
}

// Credit origin labels
export const creditOriginLabels: Record<string, string> = {
  exportacao: 'Exportacao',
  diferimento: 'Diferimento',
  aliquota_reduzida: 'Aliquota Reduzida',
  substituicao_tributaria: 'Subst. Tributaria',
}

// Homologation status
export const homologationConfig: Record<string, { label: string; badge: string }> = {
  pendente: { label: 'Pendente', badge: 'bg-gray-100 text-gray-800' },
  em_analise: { label: 'Em analise', badge: 'bg-amber-100 text-amber-800' },
  homologado: { label: 'Homologado', badge: 'bg-emerald-100 text-emerald-800' },
  rejeitado: { label: 'Rejeitado', badge: 'bg-red-100 text-red-800' },
}

// Match status
export const matchStatusConfig: Record<string, { label: string; badge: string }> = {
  proposed: { label: 'Proposto', badge: 'bg-amber-100 text-amber-800' },
  accepted_seller: { label: 'Aceito (cedente)', badge: 'bg-blue-100 text-blue-800' },
  accepted_buyer: { label: 'Aceito (cessionario)', badge: 'bg-blue-100 text-blue-800' },
  confirmed: { label: 'Confirmado', badge: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelado', badge: 'bg-red-100 text-red-800' },
  expired: { label: 'Expirado', badge: 'bg-gray-100 text-gray-800' },
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
