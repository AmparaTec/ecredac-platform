'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreBadge } from '@/components/ui/score-badge'
import {
  formatBRL, formatDiscount, formatPricePerReal,
  marketPositionConfig, confidenceConfig
} from '@/lib/utils'
import type { PriceRecommendation as PriceRec, PriceFactor, MarketPosition } from '@/types/database'
import {
  TrendingUp, TrendingDown, Target, Clock, Zap,
  ChevronDown, ChevronUp, BarChart3, Shield, RefreshCw
} from 'lucide-react'

interface PriceRecommendationProps {
  recommendation: PriceRec | null
  listingAmount: number
  currentDiscount?: { min: number; max: number }
  onRecalculate?: () => void
  loading?: boolean
  compact?: boolean
}

export function PriceRecommendationCard({
  recommendation,
  listingAmount,
  currentDiscount,
  onRecalculate,
  loading = false,
  compact = false,
}: PriceRecommendationProps) {
  const [expanded, setExpanded] = useState(false)
  const rec = recommendation

  if (!rec && !loading) return null

  if (loading) {
    return (
      <Card className="p-5 animate-pulse">
        <div className="h-4 bg-dark-500 rounded w-1/3 mb-3" />
        <div className="h-8 bg-dark-500 rounded w-1/2 mb-2" />
        <div className="h-3 bg-dark-500 rounded w-2/3" />
      </Card>
    )
  }

  if (!rec) return null

  const posConfig = marketPositionConfig[rec.vs_market_position] || marketPositionConfig.na_media
  const confConfig = confidenceConfig(rec.confidence)
  const netValue = listingAmount * (1 - rec.recommended_discount / 100)
  const rangeNetLow = listingAmount * (1 - rec.discount_range_high / 100)
  const rangeNetHigh = listingAmount * (1 - rec.discount_range_low / 100)

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-500/25">
        <Target size={18} className="text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-blue-600 font-medium">Desconto Recomendado</p>
          <p className="text-lg font-bold text-blue-300">{formatDiscount(rec.recommended_discount)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Valor liquido est.</p>
          <p className="text-sm font-bold text-emerald-600">{formatBRL(netValue)}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${posConfig.badge}`}>
          {posConfig.icon} {posConfig.label}
        </span>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden border-blue-500/25 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Target size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Precificacao Inteligente</h3>
              <p className="text-[10px] text-slate-500">Recomendacao baseada em dados de mercado</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${posConfig.badge}`}>
              {posConfig.icon} {posConfig.label}
            </span>
            {onRecalculate && (
              <button
                onClick={onRecalculate}
                className="p-1.5 rounded-lg hover:bg-dark-600 text-slate-500 hover:text-slate-400 transition-all"
                title="Recalcular"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Main recommendation */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="p-3 rounded-xl bg-dark-700 border border-blue-500/20">
            <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold mb-1">Desconto Recomendado</p>
            <p className="text-2xl font-bold text-blue-300">{formatDiscount(rec.recommended_discount)}</p>
            <p className="text-xs text-slate-500">
              Faixa: {formatDiscount(rec.discount_range_low)} — {formatDiscount(rec.discount_range_high)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-dark-700 border border-emerald-500/20">
            <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold mb-1">Valor Liquido Est.</p>
            <p className="text-2xl font-bold text-emerald-400">{formatBRL(netValue)}</p>
            <p className="text-xs text-slate-500">
              {formatBRL(rangeNetLow)} — {formatBRL(rangeNetHigh)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-dark-700 border border-dark-500/40">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Preço por R$1</p>
            <p className="text-2xl font-bold text-white">{formatPricePerReal(rec.recommended_price_per_real)}</p>
            <p className="text-xs text-slate-500">por real de crédito</p>
          </div>
        </div>

        {/* Quick metrics row */}
        <div className="flex gap-2 mb-1">
          {/* Confidence */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${confConfig.bg}`}>
            <Shield size={12} className={confConfig.color} />
            <span className={`text-xs font-medium ${confConfig.color}`}>
              Confianca: {confConfig.label} ({rec.confidence.toFixed(0)}%)
            </span>
          </div>

          {/* Time to sell */}
          {rec.estimated_days_to_sell && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-dark-600/50">
              <Clock size={12} className="text-slate-500" />
              <span className="text-xs font-medium text-slate-400">
                ~{rec.estimated_days_to_sell} dias para vender
              </span>
            </div>
          )}

          {/* Sell probability */}
          {rec.sell_probability_7d > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15">
              <Zap size={12} className="text-emerald-600" />
              <span className="text-xs font-medium text-emerald-400">
                {rec.sell_probability_7d.toFixed(0)}% em 7 dias
              </span>
            </div>
          )}
        </div>

        {/* Comparison with current price */}
        {currentDiscount && (
          <div className="mt-3 p-3 rounded-lg bg-amber-500/15 border border-amber-500/25">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-amber-600" />
              <span className="text-xs font-medium text-amber-300">
                Comparacao com seu preco atual:
              </span>
            </div>
            <div className="mt-1.5 flex gap-4 text-xs">
              <span className="text-slate-400">
                Seu desconto: <strong>{formatDiscount(currentDiscount.min)} — {formatDiscount(currentDiscount.max)}</strong>
              </span>
              <span className="text-slate-400">
                Recomendado: <strong className="text-blue-700">{formatDiscount(rec.recommended_discount)}</strong>
              </span>
              {rec.recommended_discount < currentDiscount.min ? (
                <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                  <TrendingUp size={12} /> Pode reduzir desconto
                </span>
              ) : rec.recommended_discount > currentDiscount.max ? (
                <span className="text-red-400 font-medium flex items-center gap-0.5">
                  <TrendingDown size={12} /> Considere aumentar desconto
                </span>
              ) : (
                <span className="text-emerald-400 font-medium">Preço adequado</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expandable factors */}
      <div className="border-t border-blue-500/20">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-500/15/50 transition-all"
        >
          <span>{rec.factors?.length || 0} fatores analisados</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expanded && rec.factors && (
          <div className="px-5 pb-4 space-y-2">
            {rec.factors.map((factor: PriceFactor, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-dark-700 border border-dark-500/40">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  factor.impact < 0
                    ? 'bg-emerald-100 text-emerald-400'
                    : factor.impact > 0
                    ? 'bg-red-100 text-red-400'
                    : 'bg-dark-600 text-slate-300'
                }`}>
                  {factor.impact > 0 ? '+' : ''}{factor.impact.toFixed(1)}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-white">{factor.name.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-slate-500">{factor.desc}</p>
                </div>
                <div className="flex items-center gap-1">
                  {factor.impact < 0 ? (
                    <TrendingDown size={12} className="text-emerald-500" />
                  ) : factor.impact > 0 ? (
                    <TrendingUp size={12} className="text-red-500" />
                  ) : null}
                </div>
              </div>
            ))}

            {/* Sell probability breakdown */}
            <div className="mt-2 p-3 rounded-lg bg-dark-600/50">
              <p className="text-xs font-bold text-slate-300 mb-2">Probabilidade de Venda</p>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">7 dias</span>
                    <span className="font-medium">{rec.sell_probability_7d.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-dark-500 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500/150 transition-all"
                      style={{ width: `${rec.sell_probability_7d}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">30 dias</span>
                    <span className="font-medium">{rec.sell_probability_30d.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-dark-500 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500/150 transition-all"
                      style={{ width: `${rec.sell_probability_30d}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
