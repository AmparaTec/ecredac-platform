'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  formatBRL, formatDiscount, creditTypeLabels, creditOriginLabels,
  creditScoreConfig, fallbackScoreConfig
} from '@/lib/utils'
import type { MarketBenchmark, CreditScoreGrade } from '@/types/database'
import { BarChart3, TrendingUp, TrendingDown, Minus, Droplets, Clock } from 'lucide-react'

interface MarketBenchmarkCardProps {
  benchmarks: MarketBenchmark[]
  selectedType?: string
  selectedOrigin?: string
  compact?: boolean
}

export function MarketBenchmarkCard({
  benchmarks,
  selectedType,
  selectedOrigin,
  compact = false,
}: MarketBenchmarkCardProps) {
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)

  // Filtrar benchmarks relevantes
  const filtered = benchmarks.filter(b => {
    if (selectedType && b.credit_type !== selectedType) return false
    if (selectedOrigin && b.origin !== selectedOrigin) return false
    if (selectedGrade && b.credit_grade !== selectedGrade) return false
    return true
  })

  // Benchmark geral (sem grade) e por grade
  const generalBenchmark = filtered.find(b => !b.credit_grade)
  const gradeBenchmarks = filtered.filter(b => b.credit_grade)

  if (filtered.length === 0) {
    return (
      <Card className="p-5 text-center">
        <BarChart3 size={24} className="mx-auto text-slate-600 mb-2" />
        <p className="text-sm text-slate-500">Nenhum benchmark disponível</p>
        <p className="text-xs text-slate-500">Dados de mercado serao gerados conforme transações ocorrerem</p>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-600/50 border border-dark-500/50">
        <BarChart3 size={16} className="text-slate-500 flex-shrink-0" />
        <div className="flex-1 flex items-center gap-4 text-xs">
          <span className="text-slate-500">
            Média mercado: <strong className="text-white">{formatDiscount(generalBenchmark?.avg_discount || 0)}</strong>
          </span>
          <span className="text-slate-500">
            Faixa: <strong>{formatDiscount(generalBenchmark?.min_discount || 0)} — {formatDiscount(generalBenchmark?.max_discount || 0)}</strong>
          </span>
          <span className="text-slate-500">
            Vol: <strong>{formatBRL(generalBenchmark?.total_volume || 0)}</strong>
          </span>
          {generalBenchmark?.discount_trend !== 0 && (
            <span className={`flex items-center gap-0.5 font-medium ${
              (generalBenchmark?.discount_trend || 0) < 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {(generalBenchmark?.discount_trend || 0) < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
              {Math.abs(generalBenchmark?.discount_trend || 0).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-dark-600 flex items-center justify-center">
              <BarChart3 size={18} className="text-slate-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Benchmark de Mercado</h3>
              <p className="text-[10px] text-slate-500">
                {selectedType ? creditTypeLabels[selectedType] : 'Todos'} · {selectedOrigin ? creditOriginLabels[selectedOrigin] : 'Todas origens'}
              </p>
            </div>
          </div>
          {generalBenchmark && (
            <span className="text-xs text-slate-500">
              {generalBenchmark.transaction_count} transacoes · {generalBenchmark.sample_size} amostras
            </span>
          )}
        </div>

        {/* Grade filter pills */}
        <div className="flex gap-1.5 mb-3">
          <button
            onClick={() => setSelectedGrade(null)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              !selectedGrade ? 'bg-dark-800 text-white' : 'bg-dark-600 text-slate-400 hover:bg-dark-500'
            }`}
          >
            Todos
          </button>
          {(['A', 'B', 'C', 'D'] as CreditScoreGrade[]).map(grade => {
            const cfg = creditScoreConfig[grade] || fallbackScoreConfig
            const hasBenchmark = gradeBenchmarks.some(b => b.credit_grade === grade)
            return (
              <button
                key={grade}
                onClick={() => setSelectedGrade(selectedGrade === grade ? null : grade)}
                disabled={!hasBenchmark}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedGrade === grade
                    ? `${cfg.badge} border`
                    : hasBenchmark
                    ? 'bg-dark-600 text-slate-400 hover:bg-dark-500'
                    : 'bg-dark-600/50 text-slate-600 cursor-not-allowed'
                }`}
              >
                Score Relius {grade}
              </button>
            )
          })}
        </div>

        {/* Benchmark table */}
        <div className="space-y-2">
          {(selectedGrade ? gradeBenchmarks.filter(b => b.credit_grade === selectedGrade) : gradeBenchmarks.length > 0 ? gradeBenchmarks : [generalBenchmark]).filter(Boolean).map((bm) => {
            if (!bm) return null
            const gradeConfig = bm.credit_grade ? (creditScoreConfig[bm.credit_grade] || fallbackScoreConfig) : null
            return (
              <div key={bm.id} className="p-3 rounded-xl bg-dark-600/50 border border-dark-500/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {gradeConfig ? (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${gradeConfig.badge}`}>
                        {bm.credit_grade}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-500">Geral</span>
                    )}
                    <span className="text-xs text-slate-500">{bm.transaction_count} transacoes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {bm.discount_trend !== 0 && (
                      <span className={`flex items-center gap-0.5 text-xs font-medium ${
                        bm.discount_trend < 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {bm.discount_trend < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                        {Math.abs(bm.discount_trend).toFixed(1)}% tendencia
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Média</p>
                    <p className="font-bold text-white">{formatDiscount(bm.avg_discount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Min — Max</p>
                    <p className="font-medium">{formatDiscount(bm.min_discount)} — {formatDiscount(bm.max_discount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Volume</p>
                    <p className="font-medium">{formatBRL(bm.total_volume)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 flex items-center gap-0.5"><Clock size={10} /> Dias p/ vender</p>
                    <p className="font-medium">{bm.avg_days_to_sell ? `${bm.avg_days_to_sell.toFixed(0)} dias` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 flex items-center gap-0.5"><Droplets size={10} /> Liquidez</p>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 bg-dark-500 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${bm.liquidity_score}%` }}
                        />
                      </div>
                      <span className="font-medium text-[10px]">{bm.liquidity_score.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
