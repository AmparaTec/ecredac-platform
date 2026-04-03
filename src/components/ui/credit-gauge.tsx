'use client'

import { cn, formatBRL } from '@/lib/utils'

interface CreditGaugeProps {
  total: number
  used: number
  reserved: number
  available: number
  expiresAt: string
  lastUsed?: string | null
  className?: string
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function pct(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

export function CreditGauge({
  total, used, reserved, available, expiresAt, lastUsed, className
}: CreditGaugeProps) {
  const days = daysUntil(expiresAt)
  const usedPct = pct(used, total)
  const reservedPct = pct(reserved, total)
  const availablePct = pct(available, total)

  const urgencyClass = days < 30 ? 'text-red-700 bg-red-50 border-red-200'
    : days < 90 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-blue-700 bg-blue-50 border-blue-200'

  return (
    <div className={cn('space-y-4', className)}>
      {/* Alert bar */}
      <div className={cn('flex items-center gap-2 p-3 rounded-xl border text-sm font-medium', urgencyClass)}>
        <span>⚠️</span>
        <span>
          {days < 30 ? 'URGENTE: ' : ''}
          Credito expira em <strong>{days} dias</strong>.{' '}
          {formatBRL(available)} ainda disponiveis.
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-gray-50">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-bold">{formatBRL(total)}</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50">
          <p className="text-xs text-gray-500">Utilizado</p>
          <p className="text-lg font-bold text-emerald-600">{formatBRL(used)}</p>
          <p className="text-xs font-semibold text-emerald-600">{usedPct}%</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-50">
          <p className="text-xs text-gray-500">Reservado</p>
          <p className="text-lg font-bold text-amber-600">{formatBRL(reserved)}</p>
          <p className="text-xs font-semibold text-amber-600">{reservedPct}%</p>
        </div>
        <div className="p-3 rounded-xl bg-blue-50">
          <p className="text-xs text-gray-500">Disponivel</p>
          <p className="text-lg font-bold text-blue-600">{formatBRL(available)}</p>
          <p className="text-xs font-semibold text-blue-600">{availablePct}%</p>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="h-6 flex rounded-lg overflow-hidden">
        <div className="bg-emerald-500 transition-all" style={{ width: `${usedPct}%` }} title={`Utilizado: ${usedPct}%`} />
        <div className="bg-amber-400 transition-all" style={{ width: `${reservedPct}%` }} title={`Reservado: ${reservedPct}%`} />
        <div className="bg-blue-400 transition-all" style={{ width: `${availablePct}%` }} title={`Disponivel: ${availablePct}%`} />
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Utilizado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Reservado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-400" /> Disponivel
        </span>
      </div>

      {lastUsed && (
        <p className="text-xs text-gray-400">
          Ultima utilizacao: {new Date(lastUsed).toLocaleDateString('pt-BR')}
        </p>
      )}
    </div>
  )
}
