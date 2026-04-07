/**
 * Pricing Engine — Desconto por Prazo + Risco + Volume
 *
 * Calcula o preço recomendado (price_per_real) baseado em:
 * - Prazo até vencimento (desconto maior para prazos longos)
 * - Score de verificação (desconto menor para créditos verificados)
 * - Volume de crédito (escala de volume)
 */

export interface PricingInput {
  amount: number              // Valor total do crédito em reais
  credit_type: string         // 'PIS' | 'COFINS' | 'ICMS' | 'IPI'
  score: number               // 0-100 (score de verificação)
  period: string              // '2025-01' formato YYYY-MM
}

export interface PricingOutput {
  recommended_discount: number  // % (0-100)
  price_per_real: number        // 0.0-1.0 (quanto pagar por real de crédito)
  confidence: number            // 0-100 (confiança no preço)
  factors: PricingFactor[]
  benchmarks_used: string
}

export interface PricingFactor {
  name: string
  weight: number              // peso relativo
  value: number               // valor extraído do input
  discount_contribution: number // quanto % contribui para desconto
  reasoning: string
}

// ════════════════════════════════════════════════════════════════
// Tabelas de Referência (market_benchmarks)
// ════════════════════════════════════════════════════════════════

// Fator 1: PRAZO ATÉ VENCIMENTO
const PRAZO_DISCOUNTS: Record<string, number> = {
  '0-30':    0.05,   // 5% desconto — muito curto
  '30-90':   0.10,   // 10% desconto — curto
  '90-180':  0.20,   // 20% desconto
  '180-365': 0.35,   // 35% desconto
  '365+':    0.50,   // 50% desconto — muito longo
}

// Fator 2: SCORE DE VERIFICAÇÃO
const SCORE_ADJUSTMENTS: Record<string, number> = {
  'baixo':       0.40,   // -40% (alto risco, alto desconto)
  'medio':       0.20,   // -20%
  'alto':        0.05,   // -5% (baixo desconto, crédito bom)
  'verificado':  0.00,   // 0% (sem desconto adicional)
}

// Fator 3: VOLUME DE CRÉDITO (escala)
const VOLUME_SCALES: Record<string, number> = {
  'pequeno':  0.15,    // R$ 0-50k: -15% desconto
  'medio':    0.08,    // R$ 50k-200k: -8% desconto
  'grande':   0.03,    // R$ 200k-500k: -3% desconto
  'extra':    0.00,    // R$ 500k+: 0% desconto
}

// Fator 4: TIPO DE CRÉDITO (risco inerente)
const CREDIT_TYPE_RISK: Record<string, number> = {
  'PIS':       0.25,   // Risco médio-baixo
  'COFINS':    0.25,   // Risco médio-baixo
  'ICMS':      0.10,   // Risco muito baixo (mais fácil comprovar)
  'IPI':       0.30,   // Risco médio (mais questionado pela RFB)
}

// ════════════════════════════════════════════════════════════════

function getScoreLevel(score: number): 'baixo' | 'medio' | 'alto' | 'verificado' {
  if (score >= 85) return 'verificado'
  if (score >= 65) return 'alto'
  if (score >= 40) return 'medio'
  return 'baixo'
}

function getPrazoDays(period: string): number {
  // period é '2025-01' — calcular dias até hoje
  try {
    const [year, month] = period.split('-').map(Number)
    const periodDate = new Date(year, month - 1, 1)
    const today = new Date()
    const days = Math.floor((today.getTime() - periodDate.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  } catch {
    return 90 // default
  }
}

function getPrazoRange(days: number): string {
  if (days <= 30) return '0-30'
  if (days <= 90) return '30-90'
  if (days <= 180) return '90-180'
  if (days <= 365) return '180-365'
  return '365+'
}

function getVolumeCategory(amount: number): string {
  if (amount <= 50000) return 'pequeno'
  if (amount <= 200000) return 'medio'
  if (amount <= 500000) return 'grande'
  return 'extra'
}

export function calcularPrecificacao(
  listing: PricingInput,
  benchmarks?: Record<string, any>
): PricingOutput {
  const factors: PricingFactor[] = []
  let totalDiscount = 0
  let totalWeight = 0

  // ──── Fator 1: Prazo até Vencimento ────
  const prazoDays = getPrazoDays(listing.period)
  const prazoRange = getPrazoRange(prazoDays)
  const prazoDiscount = PRAZO_DISCOUNTS[prazoRange] || 0.30

  factors.push({
    name: 'Prazo até vencimento',
    weight: 30,
    value: prazoDays,
    discount_contribution: prazoDiscount * 100,
    reasoning: `${prazoDays} dias (${prazoRange})`
  })
  totalDiscount += prazoDiscount * 30
  totalWeight += 30

  // ──── Fator 2: Score de Verificação ────
  const scoreLevel = getScoreLevel(listing.score)
  const scoreAdjustment = SCORE_ADJUSTMENTS[scoreLevel] || 0.20

  factors.push({
    name: 'Score de verificação',
    weight: 35,
    value: listing.score,
    discount_contribution: scoreAdjustment * 100,
    reasoning: `Score ${listing.score}/100 (${scoreLevel})`
  })
  totalDiscount += scoreAdjustment * 35
  totalWeight += 35

  // ──── Fator 3: Volume de Crédito ────
  const volumeCategory = getVolumeCategory(listing.amount)
  const volumeDiscount = VOLUME_SCALES[volumeCategory] || 0.08

  factors.push({
    name: 'Volume de crédito',
    weight: 20,
    value: listing.amount,
    discount_contribution: volumeDiscount * 100,
    reasoning: `R$ ${listing.amount.toLocaleString('pt-BR')} (${volumeCategory})`
  })
  totalDiscount += volumeDiscount * 20
  totalWeight += 20

  // ──── Fator 4: Tipo de Crédito ────
  const creditTypeRisk = CREDIT_TYPE_RISK[listing.credit_type] || 0.25

  factors.push({
    name: 'Tipo de crédito (risco)',
    weight: 15,
    value: 0, // não é numérico
    discount_contribution: creditTypeRisk * 100,
    reasoning: listing.credit_type
  })
  totalDiscount += creditTypeRisk * 15
  totalWeight += 15

  // ──── Calcular discount final ────
  const recommended_discount = (totalDiscount / totalWeight) * 100

  // ──── Price per real ────
  // Se discount = 30%, então price_per_real = 0.70 (paga 70% do valor)
  const price_per_real = 1 - (recommended_discount / 100)

  // ──── Confidence score ────
  // Maior score + volume + prazo longo = maior confiança
  const confidence = Math.min(100, Math.max(
    40,
    listing.score * 0.5 +
    Math.min(50, (listing.amount / 500000) * 25) +
    (prazoDays / 365) * 20
  ))

  return {
    recommended_discount: Math.round(recommended_discount * 100) / 100,
    price_per_real: Math.round(price_per_real * 10000) / 10000,
    confidence: Math.round(confidence),
    factors,
    benchmarks_used: benchmarks ? 'custom' : 'default'
  }
}

/**
 * Batch pricing para múltiplos créditos
 */
export function calcularPrecificacaoBatch(
  listings: PricingInput[]
): PricingOutput[] {
  return listings.map(listing => calcularPrecificacao(listing))
}
