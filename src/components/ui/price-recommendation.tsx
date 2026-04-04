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
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
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
      <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <Target size={18} className="text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-blue-600 font-medium">Desconto Recomendado</p>
          <p className="text-lg font-bold text-blue-900">{formatDiscount(rec.recommended_discount)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Valor liquido est.</p>
          <p className="text-sm font-bold text-emerald-600">{formatBRL(netValue)}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${posConfig.badge}`}>
          {posConfig.icon} {posConfig.label}
        </span>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden border-blue-200 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Target size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Precificacao Inteligente</h3>
              <p className="text-[10px] text-gray-500">Recomendacao baseada em dados de mercado</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${posConfig.badge}`}>
              {posConfig.icon} {posConfig.label}
            </span>
            {onRecalculate && (
              <button
                onClick={onRecalculate}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                title="Recalcular"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Main recommendation */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="p-3 rounded-xl bg-white border border-blue-100">
            <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold mb-1">Desconto Recomendado</p>
            <p className="text-2xl font-bold text-blue-900">{formatDiscount(rec.recommended_discount)}</p>
            <p className="text-xs text-gray-500">
              Faixa: {formatDiscount(rec.discount_range_low)} — {formatDiscount(rec.discount_range_high)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-emerald-100">
            <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold mb-1">Valor Liquido Est.</p>
            <p className="text-2xl font-bold text-emerald-700">{formatBRL(netValue)}</p>
            <p className="text-xs text-gray-500">
              {formatBRL(rangeNetLow)} — {formatBRL(rangeNetHigh)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-gray-100">
            <p className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-1">Preco por R$1</p>
            <p className="text-2xl font-bold text-gray-900">{formatPricePerReal(rec.recommended_price_per_real)}</p>
            <p className="text-xs text-gray-500">por real de credito</p>
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
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50">
              <Clock size={12} className="text-gray-500" />
              <span className="text-xs font-medium text-gray-600">
                ~{rec.estimated_days_to_sell} dias para vender
              </span>
            </div>
          )}

          {/* Sell probability */}
          {rec.sell_probability_7d > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50">
              <Zap size={12} className="text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">
                {rec.sell_probability_7d.toFixed(0)}% em 7 dias
              </span>
            </div>
          )}
        </div>

        {/* Comparison with current price */}
        {currentDiscount && (
          <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-amber-600" />
              <span className="text-xs font-medium text-amber-800">
                Comparacao com seu preco atual:
              </span>
            </div>
            <div className="mt-1.5 flex gap-4 text-xs">
              <span className="text-gray-600">
                Seu desconto: <strong>{formatDiscount(currentDiscount.min)} — {formatDiscount(currentDiscount.max)}</strong>
              </span>
              <span className="text-gray-600">
                Recomendado: <strong className="text-blue-700">{formatDiscount(rec.recommended_discount)}</strong>
              </span>
              {rec.recommended_discount < currentDiscount.min ? (
                <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                  <TrendingUp size={12} /> Pode reduzir desconto
                </span>
              ) : rec.recommended_discount > currentDiscount.max ? (
                <span className="text-red-700 font-medium flex items-center gap-0.5">
                  <TrendingDown size={12} /> Considere aumentar desconto
                </span>
              ) : (
                <span className="text-emerald-700 font-medium">Preco adequado</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expandable factors */}
      <div className="border-t border-blue-100">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50/50 transition-all"
        >
          <span>{rec.factors?.length || 0} fatores analisados</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expanded && rec.factors && (
          <div className="px-5 pb-4 space-y-2">
            {rec.factors.map((factor: PriceFactor, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-gray-100">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  factor.impact < 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : factor.impact > 0
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {factor.impact > 0 ? '+' : ''}{factor.impact.toFixed(1)}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-900">{factor.name.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-gray-500">{factor.desc}</p>
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
            <div className="mt-2 p-3 rounded-lg bg-gray-50">
              <p className="text-xs font-bold text-gray-700 mb-2">Probabilidade de Venda</p>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">7 dias</span>
                    <span className="font-medium">{rec.sell_probability_7d.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${rec.sell_probability_7d}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">30 dias</span>
                    <span className="font-medium">{rec.sell_probability_30d.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
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
