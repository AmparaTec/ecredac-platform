'use client'

import { creditScoreConfig, fallbackScoreConfig } from '@/lib/utils'
import type { CreditScoreGrade } from '@/types/database'

interface ScoreBadgeProps {
  grade?: CreditScoreGrade | null
  score?: number | null
  size?: 'sm' | 'md' | 'lg'
  showScore?: boolean
  showLabel?: boolean
}

export function ScoreBadge({ grade, score, size = 'md', showScore = false, showLabel = false }: ScoreBadgeProps) {
  const config = grade ? (creditScoreConfig[grade] || fallbackScoreConfig) : fallbackScoreConfig
  const displayGrade = grade || '—'

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-lg',
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-lg border-2 font-bold flex items-center justify-center ${config.badge}`}
        title={`Score Relius\u2122: ${config.description}`}
      >
        {displayGrade}
      </div>
      {showScore && score != null && (
        <span className="text-xs text-slate-500 font-medium">{score.toFixed(0)}/100</span>
      )}
      {showScore && score == null && grade == null && (
        <span className="text-xs text-slate-500 font-medium">Pendente</span>
      )}
      {showLabel && (
        <span className="text-xs text-slate-500">{config.description}</span>
      )}
    </div>
  )
}

interface ScoreBarProps {
  label: string
  value: number
  maxValue?: number
  color?: string
}

export function ScoreBar({ label, value, maxValue = 100, color }: ScoreBarProps) {
  const percentage = Math.min((value / maxValue) * 100, 100)
  const barColor = color || (percentage >= 80 ? '#059669' : percentage >= 60 ? '#2563eb' : percentage >= 40 ? '#d97706' : '#dc2626')

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-medium text-white">{value.toFixed(0)}</span>
      </div>
      <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

