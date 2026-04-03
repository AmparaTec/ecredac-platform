'use client'

import { cn } from '@/lib/utils'

const PHASES = [
  { n: 1, label: 'Originacao', icon: '⭐' },
  { n: 2, label: 'Matching', icon: '🔗' },
  { n: 3, label: 'Conclusao Comercial', icon: '✅' },
  { n: 4, label: 'Procuracao Digital', icon: '📝' },
  { n: 5, label: 'Contrato', icon: '📄' },
  { n: 6, label: 'Transferencia', icon: '🔄' },
  { n: 7, label: 'Uso do Credito', icon: '📊' },
  { n: 8, label: 'Concluido', icon: '🏆' },
]

interface PipelineProps {
  currentPhase: number
  phases: Record<number, { status: string; date: string | null; note: string }>
  className?: string
}

export function Pipeline({ currentPhase, phases, className }: PipelineProps) {
  return (
    <div className={cn('flex gap-0.5 overflow-x-auto', className)}>
      {PHASES.map((ph) => {
        const ps = phases[ph.n]
        const status = ps?.status || (ph.n < currentPhase ? 'done' : ph.n === currentPhase ? 'current' : 'pending')

        return (
          <div
            key={ph.n}
            className={cn(
              'pipeline-step flex-1 min-w-[100px]',
              status,
              ph.n === 1 && 'rounded-l-xl',
              ph.n === 8 && 'rounded-r-xl'
            )}
            title={ps?.note || ph.label}
          >
            <span className="block text-lg">{ph.icon}</span>
            <span className="block text-[10px] uppercase tracking-wider mt-0.5">{ph.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export { PHASES }
