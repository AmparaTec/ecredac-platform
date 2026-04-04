'use client'

import { useState } from 'react'
import { cn, executionTaskStatusConfig, responsibleRoleConfig, executionPhaseNames, formatTimeRemaining, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ExecutionPlan, ExecutionTask, ExecutionComment, ExecutionTaskStatus, ResponsibleRole } from '@/types/database'
import {
  CheckCircle2, Circle, PlayCircle, Ban, SkipForward,
  ChevronDown, ChevronRight, Clock, AlertTriangle,
  MessageSquare, Send, User, Shield, FileText
} from 'lucide-react'

// ============================================
// ExecutionChecklist — Checklist interativo por fase
// ============================================

interface ExecutionChecklistProps {
  plan: ExecutionPlan | null
  tasks: ExecutionTask[]
  onStartTask: (taskId: string) => Promise<void>
  onCompleteTask: (taskId: string, note?: string) => Promise<void>
  onBlockTask: (taskId: string, reason: string) => Promise<void>
  onAddComment: (taskId: string, content: string) => Promise<void>
  onCreatePlan?: () => Promise<void>
  loading?: boolean
  matchId?: string
}

const STATUS_ICONS: Record<ExecutionTaskStatus, React.ReactNode> = {
  pending: <Circle size={18} className="text-gray-400" />,
  in_progress: <PlayCircle size={18} className="text-blue-600 animate-pulse" />,
  completed: <CheckCircle2 size={18} className="text-emerald-600" />,
  blocked: <Ban size={18} className="text-red-600" />,
  skipped: <SkipForward size={18} className="text-gray-400" />,
}

export function ExecutionChecklist({
  plan,
  tasks,
  onStartTask,
  onCompleteTask,
  onBlockTask,
  onAddComment,
  onCreatePlan,
  loading = false,
  matchId,
}: ExecutionChecklistProps) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(plan?.current_phase || null)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [completionNote, setCompletionNote] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [commentText, setCommentText] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // No plan yet — offer to create
  if (!plan) {
    return (
      <Card className="p-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mb-3">
          <FileText size={24} className="text-brand-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">Plano de Execucao</h3>
        <p className="text-xs text-gray-500 mb-4">
          Nenhum plano de execucao foi criado para esta operacao.
        </p>
        {onCreatePlan && (
          <Button variant="primary" onClick={onCreatePlan} disabled={loading}>
            {loading ? 'Criando...' : 'Criar Plano de Execucao'}
          </Button>
        )}
      </Card>
    )
  }

  // Group tasks by phase
  const tasksByPhase: Record<number, ExecutionTask[]> = {}
  tasks.forEach(t => {
    if (!tasksByPhase[t.phase]) tasksByPhase[t.phase] = []
    tasksByPhase[t.phase].push(t)
  })

  // Get unique phases in order
  const phases = Object.keys(tasksByPhase).map(Number).sort((a, b) => a - b)

  // Phase completion stats
  function phaseStats(phase: number) {
    const phaseTasks = tasksByPhase[phase] || []
    const total = phaseTasks.length
    const completed = phaseTasks.filter(t => t.status === 'completed' || t.status === 'skipped').length
    const blocked = phaseTasks.filter(t => t.status === 'blocked').length
    const inProgress = phaseTasks.filter(t => t.status === 'in_progress').length
    return { total, completed, blocked, inProgress, pct: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }

  async function handleAction(taskId: string, action: () => Promise<void>) {
    setActionLoading(taskId)
    try {
      await action()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Plan summary bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Execucao</span>
          <Badge variant={plan.overall_sla_status === 'on_track' ? 'success' : plan.overall_sla_status === 'breached' ? 'danger' : 'warning'}>
            {plan.completed_tasks}/{plan.total_tasks} tarefas
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {plan.blocked_tasks > 0 && (
            <Badge variant="danger">
              <AlertTriangle size={10} className="mr-1" />
              {plan.blocked_tasks} bloqueada{plan.blocked_tasks > 1 ? 's' : ''}
            </Badge>
          )}
          {plan.breached_slas > 0 && (
            <Badge variant="danger">
              <Clock size={10} className="mr-1" />
              {plan.breached_slas} SLA violado{plan.breached_slas > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500"
          style={{ width: `${plan.overall_progress}%` }}
        />
      </div>

      {/* Phase accordion */}
      {phases.map(phase => {
        const stats = phaseStats(phase)
        const isExpanded = expandedPhase === phase
        const isDone = stats.pct === 100
        const isCurrent = phase === plan.current_phase
        const hasBlocked = stats.blocked > 0

        return (
          <Card key={phase} className={cn(
            'overflow-hidden transition-all',
            isCurrent && 'ring-2 ring-brand-200',
            hasBlocked && 'ring-2 ring-red-200'
          )}>
            {/* Phase header */}
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedPhase(isExpanded ? null : phase)}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                  isDone ? 'bg-emerald-100 text-emerald-700' :
                  isCurrent ? 'bg-brand-100 text-brand-700' :
                  hasBlocked ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-500'
                )}>
                  {isDone ? '✓' : phase}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900">
                    {executionPhaseNames[phase] || `Fase ${phase}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats.completed}/{stats.total} concluida{stats.total > 1 ? 's' : ''}
                    {stats.inProgress > 0 && ` · ${stats.inProgress} em andamento`}
                    {stats.blocked > 0 && ` · ${stats.blocked} bloqueada${stats.blocked > 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Mini progress */}
                <div className="w-20 bg-gray-100 rounded-full h-1.5 hidden sm:block">
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      isDone ? 'bg-emerald-500' : hasBlocked ? 'bg-red-400' : 'bg-brand-500'
                    )}
                    style={{ width: `${stats.pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-500">{stats.pct}%</span>
                {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
              </div>
            </button>

            {/* Task list */}
            {isExpanded && (
              <div className="border-t border-gray-100">
                {(tasksByPhase[phase] || []).map((task, idx) => {
                  const isTaskExpanded = expandedTask === task.id
                  const isLoading = actionLoading === task.id
                  const statusCfg = executionTaskStatusConfig[task.status]
                  const roleCfg = responsibleRoleConfig[task.responsible]
                  const slaUrgent = task.sla_status === 'at_risk' || task.sla_status === 'breached'

                  return (
                    <div key={task.id} className={cn(
                      'border-b border-gray-50 last:border-b-0',
                      task.status === 'blocked' && 'bg-red-50/50',
                      task.status === 'in_progress' && 'bg-blue-50/30'
                    )}>
                      {/* Task row */}
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                        onClick={() => setExpandedTask(isTaskExpanded ? null : task.id)}
                      >
                        {/* Status icon */}
                        <div className="flex-shrink-0">
                          {STATUS_ICONS[task.status]}
                        </div>

                        {/* Task info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              'text-sm font-medium truncate',
                              task.status === 'completed' && 'line-through text-gray-400',
                              task.status === 'blocked' && 'text-red-700'
                            )}>
                              {task.task_name}
                            </p>
                            {task.sla_critical && (
                              <span title="SLA Critico"><Shield size={12} className="text-amber-500 flex-shrink-0" /></span>
                            )}
                          </div>
                          {task.task_description && (
                            <p className="text-xs text-gray-400 truncate">{task.task_description}</p>
                          )}
                        </div>

                        {/* Responsible */}
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0', roleCfg?.badge)}>
                          {roleCfg?.label || task.responsible}
                        </span>

                        {/* SLA indicator */}
                        {task.sla_deadline && task.status !== 'completed' && task.status !== 'skipped' && (
                          <span className={cn(
                            'text-[10px] font-mono flex-shrink-0',
                            slaUrgent ? 'text-red-600 font-bold' : 'text-gray-400'
                          )}>
                            <Clock size={10} className="inline mr-0.5" />
                            {formatTimeRemaining(task.sla_deadline)}
                          </span>
                        )}

                        {/* Comments count */}
                        {task.comments && task.comments.length > 0 && (
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            <MessageSquare size={10} className="inline mr-0.5" />
                            {task.comments.length}
                          </span>
                        )}

                        <ChevronRight size={14} className={cn(
                          'text-gray-300 transition-transform flex-shrink-0',
                          isTaskExpanded && 'rotate-90'
                        )} />
                      </div>

                      {/* Expanded task detail */}
                      {isTaskExpanded && (
                        <div className="px-4 pb-4 pl-11 space-y-3">
                          {/* Task meta */}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className={cn('px-2 py-0.5 rounded-full', statusCfg?.badge)}>
                              {statusCfg?.label}
                            </span>
                            {task.sla_deadline && (
                              <span className="text-gray-500">
                                Prazo: {formatDate(task.sla_deadline)}
                              </span>
                            )}
                            {task.completed_at && (
                              <span className="text-emerald-600">
                                Concluido: {formatDate(task.completed_at)}
                              </span>
                            )}
                            {task.completed_by && (
                              <span className="text-gray-500">
                                <User size={10} className="inline mr-0.5" />
                                {task.completed_by}
                              </span>
                            )}
                          </div>

                          {/* Blocked reason */}
                          {task.status === 'blocked' && task.blocked_reason && (
                            <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                              <AlertTriangle size={12} className="inline mr-1" />
                              {task.blocked_reason}
                            </div>
                          )}

                          {/* Completion note */}
                          {task.completion_note && (
                            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
                              {task.completion_note}
                            </div>
                          )}

                          {/* Comments */}
                          {task.comments && task.comments.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-gray-600">Comentarios</p>
                              {task.comments.map((c: ExecutionComment) => (
                                <div key={c.id} className="p-2 rounded-lg bg-gray-50 text-xs">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-gray-700">{c.author_name || 'Anonimo'}</span>
                                    <span className="text-gray-400">{formatDate(c.created_at)}</span>
                                  </div>
                                  <p className="text-gray-600">{c.content}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2">
                            {task.status === 'pending' && (
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={isLoading}
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  handleAction(task.id, () => onStartTask(task.id))
                                }}
                              >
                                <PlayCircle size={14} />
                                {isLoading ? 'Iniciando...' : 'Iniciar'}
                              </Button>
                            )}

                            {task.status === 'in_progress' && (
                              <>
                                <div className="flex-1 min-w-0">
                                  <input
                                    type="text"
                                    placeholder="Nota de conclusao (opcional)"
                                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
                                    value={completionNote}
                                    onChange={e => setCompletionNote(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                  />
                                </div>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={isLoading}
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation()
                                    handleAction(task.id, async () => {
                                      await onCompleteTask(task.id, completionNote || undefined)
                                      setCompletionNote('')
                                    })
                                  }}
                                >
                                  <CheckCircle2 size={14} />
                                  {isLoading ? 'Concluindo...' : 'Concluir'}
                                </Button>
                              </>
                            )}

                            {(task.status === 'pending' || task.status === 'in_progress') && (
                              <div className="flex gap-1 items-center">
                                <input
                                  type="text"
                                  placeholder="Motivo do bloqueio"
                                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none w-36"
                                  value={blockReason}
                                  onChange={e => setBlockReason(e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                />
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={isLoading || !blockReason}
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation()
                                    handleAction(task.id, async () => {
                                      await onBlockTask(task.id, blockReason)
                                      setBlockReason('')
                                    })
                                  }}
                                >
                                  <Ban size={14} className="text-red-500" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Comment input */}
                          <div className="flex gap-2 items-center pt-1">
                            <input
                              type="text"
                              placeholder="Adicionar comentario..."
                              className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
                              value={expandedTask === task.id ? commentText : ''}
                              onChange={e => setCommentText(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && commentText.trim()) {
                                  e.stopPropagation()
                                  handleAction(task.id, async () => {
                                    await onAddComment(task.id, commentText)
                                    setCommentText('')
                                  })
                                }
                              }}
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={!commentText.trim() || isLoading}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation()
                                handleAction(task.id, async () => {
                                  await onAddComment(task.id, commentText)
                                  setCommentText('')
                                })
                              }}
                            >
                              <Send size={14} />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
