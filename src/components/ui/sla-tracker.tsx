'use client'

import { cn, slaStatusConfig, responsibleRoleConfig, executionPhaseNames, formatTimeRemaining, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ExecutionPlan, ExecutionTask } from '@/types/database'
import { Clock, AlertTriangle, CheckCircle2, Shield, TrendingUp, BarChart3 } from 'lucide-react'

// ============================================
// SLATracker — Monitoramento de SLA por fase
// ============================================

interface SLATrackerProps {
  plan: ExecutionPlan
  tasks: ExecutionTask[]
}

interface PhaseSLASummary {
  phase: number
  totalTasks: number
  completedTasks: number
  blockedTasks: number
  onTrack: number
  atRisk: number
  breached: number
  avgCompletionHours: number | null
  criticalTasks: ExecutionTask[]
}

export function SLATracker({ plan, tasks }: SLATrackerProps) {
  // Build per-phase SLA summary
  const phaseSummaries: PhaseSLASummary[] = []
  const phaseSet = new Set(tasks.map(t => t.phase))
  const phases = Array.from(phaseSet).sort((a, b) => a - b)

  phases.forEach(phase => {
    const phaseTasks = tasks.filter(t => t.phase === phase)
    const completedTasks = phaseTasks.filter(t => t.status === 'completed' || t.status === 'skipped')
    const blockedTasks = phaseTasks.filter(t => t.status === 'blocked')
    const onTrack = phaseTasks.filter(t => t.sla_status === 'on_track').length
    const atRisk = phaseTasks.filter(t => t.sla_status === 'at_risk').length
    const breached = phaseTasks.filter(t => t.sla_status === 'breached').length
    const criticalTasks = phaseTasks.filter(t =>
      t.sla_critical && (t.sla_status === 'at_risk' || t.sla_status === 'breached')
    )

    // Calculate avg completion time for completed tasks
    let avgCompletionHours: number | null = null
    const completedWithTimes = completedTasks.filter(t => t.started_at && t.completed_at)
    if (completedWithTimes.length > 0) {
      const totalHours = completedWithTimes.reduce((sum, t) => {
        const start = new Date(t.started_at!).getTime()
        const end = new Date(t.completed_at!).getTime()
        return sum + (end - start) / (1000 * 60 * 60)
      }, 0)
      avgCompletionHours = Math.round(totalHours / completedWithTimes.length)
    }

    phaseSummaries.push({
      phase,
      totalTasks: phaseTasks.length,
      completedTasks: completedTasks.length,
      blockedTasks: blockedTasks.length,
      onTrack,
      atRisk,
      breached,
      avgCompletionHours,
      criticalTasks,
    })
  })

  // Global stats
  const totalBreached = tasks.filter(t => t.sla_status === 'breached').length
  const totalAtRisk = tasks.filter(t => t.sla_status === 'at_risk').length
  const totalOnTrack = tasks.filter(t => t.sla_status === 'on_track').length
  const totalCompleted = tasks.filter(t => t.sla_status === 'completed').length

  // Upcoming deadlines (next 24h)
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const upcomingDeadlines = tasks
    .filter(t =>
      t.sla_deadline &&
      t.status !== 'completed' &&
      t.status !== 'skipped' &&
      new Date(t.sla_deadline) <= in24h &&
      new Date(t.sla_deadline) > now
    )
    .sort((a, b) => new Date(a.sla_deadline!).getTime() - new Date(b.sla_deadline!).getTime())

  return (
    <div className="space-y-4">
      {/* SLA Overview Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-center">
          <CheckCircle2 size={16} className="mx-auto text-emerald-400 mb-1" />
          <p className="text-lg font-bold text-emerald-400">{totalOnTrack + totalCompleted}</p>
          <p className="text-[10px] text-emerald-400 uppercase tracking-wider">No Prazo</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/25 text-center">
          <Clock size={16} className="mx-auto text-amber-400 mb-1" />
          <p className="text-lg font-bold text-amber-400">{totalAtRisk}</p>
          <p className="text-[10px] text-amber-400 uppercase tracking-wider">Em Risco</p>
        </div>
        <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/25 text-center">
          <AlertTriangle size={16} className="mx-auto text-red-400 mb-1" />
          <p className="text-lg font-bold text-red-400">{totalBreached}</p>
          <p className="text-[10px] text-red-400 uppercase tracking-wider">Violados</p>
        </div>
        <div className="p-3 rounded-xl bg-dark-600/50 border border-dark-500/40 text-center">
          <BarChart3 size={16} className="mx-auto text-slate-400 mb-1" />
          <p className="text-lg font-bold text-slate-300">{plan.overall_progress}%</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Progresso</p>
        </div>
      </div>

      {/* Upcoming Deadlines Alert */}
      {upcomingDeadlines.length > 0 && (
        <Card className="p-4 border-amber-200 bg-amber-500/15/50">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-amber-400" />
            <span className="text-xs font-bold text-amber-800">Prazos nas proximas 24h</span>
          </div>
          <div className="space-y-2">
            {upcomingDeadlines.map(task => {
              const roleCfg = responsibleRoleConfig[task.responsible]
              return (
                <div key={task.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {task.sla_critical && <Shield size={10} className="text-red-500" />}
                    <span className="font-medium text-white">{task.task_name}</span>
                    <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-semibold', roleCfg?.badge)}>
                      {roleCfg?.label}
                    </span>
                  </div>
                  <span className="font-mono text-amber-400 font-bold">
                    {formatTimeRemaining(task.sla_deadline!)}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Phase-by-Phase SLA Breakdown */}
      <div className="space-y-2">
        {phaseSummaries.map(summary => {
          const isCurrentPhase = summary.phase === plan.current_phase
          const hasCritical = summary.criticalTasks.length > 0

          return (
            <Card key={summary.phase} className={cn(
              'p-3',
              isCurrentPhase && 'ring-1 ring-brand-200'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                    summary.completedTasks === summary.totalTasks
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : isCurrentPhase
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-dark-600 text-slate-500'
                  )}>
                    {summary.completedTasks === summary.totalTasks ? '✓' : summary.phase}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {executionPhaseNames[summary.phase] || `Fase ${summary.phase}`}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {summary.completedTasks}/{summary.totalTasks} tarefas
                      {summary.avgCompletionHours !== null && ` · Média: ${summary.avgCompletionHours}h`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* SLA mini indicators */}
                  {summary.onTrack > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                      {summary.onTrack}
                    </span>
                  )}
                  {summary.atRisk > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                      {summary.atRisk}
                    </span>
                  )}
                  {summary.breached > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">
                      {summary.breached}
                    </span>
                  )}

                  {/* Phase progress bar */}
                  <div className="w-16 bg-dark-600 rounded-full h-1.5 ml-2">
                    <div
                      className={cn(
                        'h-1.5 rounded-full transition-all',
                        summary.breached > 0 ? 'bg-red-500/150' :
                        summary.atRisk > 0 ? 'bg-amber-500/150' :
                        summary.completedTasks === summary.totalTasks ? 'bg-emerald-500/150' :
                        'bg-brand-500'
                      )}
                      style={{ width: `${summary.totalTasks > 0 ? Math.round((summary.completedTasks / summary.totalTasks) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Critical task alerts */}
              {hasCritical && (
                <div className="mt-2 pt-2 border-t border-dark-500/40 space-y-1">
                  {summary.criticalTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle size={10} className={
                          task.sla_status === 'breached' ? 'text-red-500' : 'text-amber-500'
                        } />
                        <span className="font-medium text-slate-300">{task.task_name}</span>
                        <span className={cn(
                          'px-1 py-0.5 rounded font-semibold',
                          task.sla_status === 'breached' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                        )}>
                          {task.sla_status === 'breached' ? 'VIOLADO' : 'EM RISCO'}
                        </span>
                      </div>
                      {task.sla_deadline && (
                        <span className="font-mono text-slate-500">{formatTimeRemaining(task.sla_deadline)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Estimated completion */}
      {plan.estimated_completion && (
        <div className="flex items-center justify-between px-2 text-xs text-slate-500">
          <span>
            <TrendingUp size={12} className="inline mr-1" />
            Conclusao estimada: <strong>{formatDate(plan.estimated_completion)}</strong>
          </span>
          {plan.started_at && (
            <span>Inicio: {formatDate(plan.started_at)}</span>
          )}
        </div>
      )}
    </div>
  )
}
