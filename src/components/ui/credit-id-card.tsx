'use client'

import { useState } from 'react'
import { ScoreBadge, ScoreBar } from './score-badge'
import { formatBRL, creditTypeLabels, creditOriginLabels, creditScoreConfig, scoreComponentLabels, homologationConfig } from '@/lib/utils'
import type { CreditListing, CreditScore, RiskFactor } from '@/types/database'

interface CreditIdCardProps {
  listing: CreditListing
  score?: CreditScore | null
  compact?: boolean
  onClick?: () => void
}

export function CreditIdCard({ listing, score, compact = false, onClick }: CreditIdCardProps) {
  const [expanded, setExpanded] = useState(false)

  const gradeConfig = score ? creditScoreConfig[score.grade] : null
  const homologConfig = homologationConfig[listing.homologation_status]

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
        onClick={onClick}
      >
        {/* Score Badge */}
        {score && <ScoreBadge grade={score.grade} size="sm" />}

        {/* Credit ID */}
        <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
          {listing.credit_id || '—'}
        </span>

        {/* Type + Origin */}
        <span className="text-sm text-gray-700">
          {creditTypeLabels[listing.credit_type]} / {creditOriginLabels[listing.origin]}
        </span>

        {/* Amount */}
        <span className="ml-auto font-semibold text-sm">{formatBRL(listing.amount)}</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header com Grade */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            {/* Credit ID */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200">
                {listing.credit_id || 'Gerando...'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${homologConfig.badge}`}>
                {homologConfig.label}
              </span>
            </div>

            {/* Type + Origin */}
            <p className="text-sm text-gray-600 mt-1">
              {creditTypeLabels[listing.credit_type]} — {creditOriginLabels[listing.origin]}
            </p>
          </div>

          {/* Score Badge Grande */}
          {score && (
            <div className="flex flex-col items-center">
              <ScoreBadge grade={score.grade} score={score.score} size="lg" showScore />
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Valores */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-gray-500">Valor Total</p>
            <p className="font-semibold text-gray-900">{formatBRL(listing.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Disponivel</p>
            <p className="font-semibold text-gray-900">{formatBRL(listing.remaining_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Desconto</p>
            <p className="font-semibold text-gray-900">{listing.min_discount}% — {listing.max_discount}%</p>
          </div>
        </div>

        {/* Score Summary */}
        {score && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700">Qualidade do Credito</span>
              <button
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
              >
                {expanded ? 'Menos detalhes' : 'Ver detalhes'}
              </button>
            </div>

            {/* Mini score bar */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${score.score}%`, backgroundColor: gradeConfig?.color }}
              />
            </div>

            {/* Tempo estimado de homologacao */}
            {score.estimated_homologation_days !== null && score.estimated_homologation_days > 0 && (
              <p className="text-xs text-gray-500 mt-1.5">
                Homologacao estimada: <span className="font-medium">{score.estimated_homologation_days} dias</span>
              </p>
            )}
            {score.estimated_homologation_days === 0 && (
              <p className="text-xs text-emerald-600 mt-1.5 font-medium">
                Ja homologado pela SEFAZ
              </p>
            )}
          </div>
        )}

        {/* Expanded: Score Breakdown */}
        {expanded && score && (
          <div className="space-y-2 pt-2 border-t border-gray-100 animate-in slide-in-from-top-2">
            <ScoreBar label={scoreComponentLabels.sefaz_risk_score} value={score.sefaz_risk_score} />
            <ScoreBar label={scoreComponentLabels.homologation_score} value={score.homologation_score} />
            <ScoreBar label={scoreComponentLabels.maturity_score} value={score.maturity_score} />
            <ScoreBar label={scoreComponentLabels.origin_score} value={score.origin_score} />
            <ScoreBar label={scoreComponentLabels.documentation_score} value={score.documentation_score} />
            <ScoreBar label={scoreComponentLabels.historical_score} value={score.historical_score} />

            {/* Risk Factors */}
            {score.risk_factors && score.risk_factors.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-700 mb-1.5">Fatores de Risco</p>
                <div className="space-y-1">
                  {score.risk_factors.map((risk: RiskFactor, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-red-500 font-mono">{risk.impact > 0 ? '+' : ''}{risk.impact}</span>
                      <span className="text-gray-600">{risk.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {score.risk_factors && score.risk_factors.length === 0 && (
              <p className="text-xs text-emerald-600 mt-1">Nenhum fator de risco identificado</p>
            )}
          </div>
        )}
      </div>

      {/* Protocol e-CredAc */}
      {listing.e_credac_protocol && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Protocolo e-CredAc: <span className="font-mono font-medium">{listing.e_credac_protocol}</span>
          </p>
        </div>
      )}
    </div>
  )
}
