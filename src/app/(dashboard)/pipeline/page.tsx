'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL, formatDate, matchStatusConfig, transactionStatusConfig } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pipeline, PHASES } from '@/components/ui/pipeline'
import { CreditGauge } from '@/components/ui/credit-gauge'
import { ScoreBadge } from '@/components/ui/score-badge'
import { ExecutionChecklist } from '@/components/ui/execution-checklist'
import { SLATracker } from '@/components/ui/sla-tracker'
import type { ExecutionPlan, ExecutionTask } from '@/types/database'
import { GitMerge, ChevronRight, ArrowRight, FileText, Clock, X, Shield, ListChecks, BarChart3 } from 'lucide-react'

interface Deal {
  id: string
  phase: number
  title: string
  seller: string
  buyer: string
  amount: number
  discount: number
  status: string
  created_at: string
  credit_id?: string | null
  credit_score?: any
  match?: any
  transaction?: any
  phases: Record<number, { status: string; date: string | null; note: string }>
  credit_usage?: {
    total: number
    used: number
    reserved: number
    available: number
    expires_at: string
    last_used: string | null
  }
  match_type?: string
  compatibility_score?: number
  match_reason?: string
}

const PHASE_LABELS = [
  '', 'OriginaÃ§Ã£o', 'Matching', 'Acordo Comercial', 'VerificaÃ§Ã£o Fiscal',
  'Contrato & ProcuraÃ§Ã£o', 'TransferÃªncia e-CredAc', 'Aceite CessionÃ¡rio', 'ConclusÃ£o'
]

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [detailTab, setDetailTab] = useState<'info' | 'execution' | 'sla'>('info')
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlan | null>(null)
  const [executionTasks, setExecutionTasks] = useState<ExecutionTask[]>([])
  const [executionLoading, setExecutionLoading] = useState(false)

  useEffect(() => {
    loadDeals()
  }, [])

  async function loadDeals() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Check user role â procuradores see ALL matches
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('auth_user_id', user.id)
        .single()

      const isProcurador = profile?.role === 'procurador'

      // Company may not exist for procurador users
      const { data: company } = await supabase
        .from('companies').select('id').eq('auth_user_id', user.id).maybeSingle()

      if (!isProcurador && !company) {
        setLoading(false)
        return
      }

      // Get matches â procurador sees all, regular user sees own company's
      let matchesQuery = supabase
        .from('matches')
        .select(`
          *,
          seller_company:companies!matches_seller_company_id_fkey(id, nome_fantasia, razao_social),
          buyer_company:companies!matches_buyer_company_id_fkey(id, nome_fantasia, razao_social),
          listing:credit_listings(id, credit_type, origin, amount, credit_score)
        `)
        .order('created_at', { ascending: false })
        .limit(200)

      if (!isProcurador && company) {
        matchesQuery = matchesQuery.or(`seller_company_id.eq.${company.id},buyer_company_id.eq.${company.id}`)
      }

      const { data: matches } = await matchesQuery

      let txQuery = supabase.from('transactions').select('*')
      if (!isProcurador && company) {
        txQuery = txQuery.or(`seller_company_id.eq.${company.id},buyer_company_id.eq.${company.id}`)
      }
      const { data: transactions } = await txQuery

      // Build deals from matches + transactions
      const dealList: Deal[] = (matches || []).map((m: any) => {
        const tx = transactions?.find(t => t.match_id === m.id)
        const phase = computePhase(m, tx)

        return {
          id: m.id,
          phase,
          title: `${formatBRL(m.matched_amount)} â ${m.agreed_discount}% desc.`,
          seller: m.seller_company?.nome_fantasia || m.seller_company?.razao_social || 'Cedente',
          buyer: m.buyer_company?.nome_fantasia || m.buyer_company?.razao_social || 'CessionÃ¡rio',
          amount: m.matched_amount,
          discount: m.agreed_discount,
          status: m.status,
          created_at: m.created_at,
          credit_id: m.listing?.credit_id,
          credit_score: m.listing?.credit_score,
          match: m,
          transaction: tx,
          phases: buildPhaseHistory(m, tx),
          credit_usage: phase >= 7 ? {
            total: m.matched_amount,
            used: Math.round(m.matched_amount * 0.4),
            reserved: Math.round(m.matched_amount * 0.2),
            available: Math.round(m.matched_amount * 0.4),
            expires_at: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
            last_used: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          } : undefined,
          match_type: m.match_type,
          compatibility_score: m.compatibility_score,
          match_reason: m.match_reason,
        }
      })

      setDeals(dealList)
    } catch (err) {
      console.error('Erro ao carregar pipeline:', err)
    } finally {
      setLoading(false)
    }
  }

  function computePhase(match: any, tx: any): number {
    if (!match) return 1
    if (match.status === 'proposed') return 2
    if (match.status === 'confirmed' && !tx) return 3
    if (tx?.status === 'pending_payment') return 8
    if (tx?.nfe_key) return 7
    return Math.min(match.status === 'accepted_seller' || match.status === 'accepted_buyer' ? 3 : 2, 8)
  }

  function buildPhaseHistory(match: any, tx: any): Record<number, { status: string; date: string | null; note: string }> {
    const phases: Record<number, { status: string; date: string | null; note: string }> = {}
    const phase = computePhase(match, tx)

    for (let i = 1; i <= 8; i++) {
      if (i < phase) {
        phases[i] = { status: 'done', date: match.created_at, note: `${PHASE_LABELS[i]} concluÃ­da` }
      } else if (i === phase) {
        phases[i] = { status: 'current', date: null, note: `${PHASE_LABELS[i]} em andamento` }
      } else {
        phases[i] = { status: 'pending', date: null, note: `${PHASE_LABELS[i]} pendente` }
      }
    }
    return phases
  }

  // Load execution plan when a deal is selected
  async function loadExecutionPlan(matchId: string) {
    setExecutionLoading(true)
    try {
      const res = await fetch(`/api/execution?match_id=${matchId}`)
      const data = await res.json()
      setExecutionPlan(data.plan || null)
      setExecutionTasks(data.tasks || [])
    } catch {
      setExecutionPlan(null)
      setExecutionTasks([])
    } finally {
      setExecutionLoading(false)
    }
  }

  function selectDeal(deal: Deal) {
    setSelectedDeal(deal)
    setDetailTab('info')
    loadExecutionPlan(deal.id)
  }

  async function handleCreatePlan() {
    if (!selectedDeal) return
    setExecutionLoading(true)
    try {
      await fetch('/api/execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_plan', match_id: selectedDeal.id }),
      })
      await loadExecutionPlan(selectedDeal.id)
    } finally {
      setExecutionLoading(false)
    }
  }

  async function handleStartTask(taskId: string) {
    await fetch('/api/execution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start_task', task_id: taskId }),
    })
    if (selectedDeal) await loadExecutionPlan(selectedDeal.id)
  }

  async function handleCompleteTask(taskId: string, note?: string) {
    await fetch('/api/execution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete_task', task_id: taskId, note }),
    })
    if (selectedDeal) await loadExecutionPlan(selectedDeal.id)
  }

  async function handleBlockTask(taskId: string, reason: string) {
    await fetch('/api/execution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'block_task', task_id: taskId, reason }),
    })
    if (selectedDeal) await loadExecutionPlan(selectedDeal.id)
  }

  async function handleAddComment(taskId: string, content: string) {
    await fetch('/api/execution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_comment', task_id: taskId, content }),
    })
    if (selectedDeal) await loadExecutionPlan(selectedDeal.id)
  }

  // Group deals by phase for kanban view
  const dealsByPhase: Record<number, Deal[]> = {}
  for (let i = 1; i <= 8; i++) dealsByPhase[i] = []
  deals.forEach(d => {
    if (dealsByPhase[d.phase]) dealsByPhase[d.phase].push(d)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline</h1>
          <p className="text-slate-500 mt-1">Acompanhe todas as operaÃ§Ãµes em tempo real</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'kanban' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            Kanban
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            Lista
          </Button>
        </div>
      </div>

      {/* Phase summary */}
      <div className="grid grid-cols-8 gap-1.5">
        {Array.from({ length: 8 }, (_, i) => i + 1).map(phase => (
          <div key={phase} className="text-center p-2 rounded-xl bg-dark-700 border border-dark-500/40">
            <p className="text-lg font-bold text-brand-400">{dealsByPhase[phase]?.length || 0}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{PHASE_LABELS[phase]}</p>
          </div>
        ))}
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {Array.from({ length: 8 }, (_, i) => i + 1).map(phase => (
            <div key={phase} className="flex-shrink-0 w-64">
              <div className="bg-dark-600 rounded-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {PHASE_LABELS[phase]}
                  </h3>
                  <span className="text-xs font-bold text-brand-400 bg-brand-500/15 px-2 py-0.5 rounded-full">
                    {dealsByPhase[phase]?.length || 0}
                  </span>
                </div>
                <div className="space-y-2">
                  {dealsByPhase[phase]?.map(deal => (
                    <Card
                      key={deal.id}
                      className="p-3 cursor-pointer"
                      hover
                      onClick={() => selectDeal(deal)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        {deal.credit_id && (
                          <span className="font-mono text-[10px] font-bold text-brand-400 bg-brand-500/15 px-1.5 py-0.5 rounded border border-brand-500/25">
                            {deal.credit_id}
                          </span>
                        )}
                        {deal.credit_score && (
                          <ScoreBadge grade={deal.credit_score.grade} size="sm" />
                        )}
                      </div>
                      <p className="text-sm font-bold text-white">{formatBRL(deal.amount)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{deal.seller} â {deal.buyer}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant={deal.discount >= 15 ? 'success' : 'info'}>
                          {deal.discount}% desc.
                        </Badge>
                        <span className="text-[10px] text-slate-500">{formatDate(deal.created_at)}</span>
                      </div>
                    </Card>
                  ))}
                  {(!dealsByPhase[phase] || dealsByPhase[phase].length === 0) && (
                    <div className="py-4 text-center text-xs text-slate-500">Vazio</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-600/50 text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">Credit ID</th>
                <th className="px-4 py-3 text-left font-medium">Score</th>
                <th className="px-4 py-3 text-left font-medium">Cedente</th>
                <th className="px-4 py-3 text-left font-medium">CessionÃ¡rio</th>
                <th className="px-4 py-3 text-left font-medium">Valor</th>
                <th className="px-4 py-3 text-left font-medium">Desconto</th>
                <th className="px-4 py-3 text-left font-medium">Fase</th>
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-500/50">
              {deals.map(deal => (
                <tr key={deal.id} className="hover:bg-dark-600/50 cursor-pointer" onClick={() => selectDeal(deal)}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-bold text-brand-400 bg-brand-500/15 px-1.5 py-0.5 rounded border border-brand-500/25">
                      {deal.credit_id || `#${deal.id.slice(0, 8)}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {deal.credit_score ? (
                      <ScoreBadge grade={deal.credit_score.grade} size="sm" />
                    ) : (
                      <span className="text-xs text-slate-500">â</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{deal.seller}</td>
                  <td className="px-4 py-3 text-sm">{deal.buyer}</td>
                  <td className="px-4 py-3 text-sm font-bold">{formatBRL(deal.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="info">{deal.discount}%</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={deal.phase >= 7 ? 'success' : deal.phase >= 4 ? 'info' : 'warning'}>
                      {PHASE_LABELS[deal.phase]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{formatDate(deal.created_at)}</td>
                  <td className="px-4 py-3"><ChevronRight size={16} className="text-slate-500" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {deals.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <GitMerge size={32} className="mx-auto mb-2" />
              <p className="text-sm">Nenhuma operaÃ§Ã£o no pipeline</p>
            </div>
          )}
        </Card>
      )}

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedDeal(null)}>
          <div className="bg-dark-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-dark-500/50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">
                    {selectedDeal.credit_id || `OperaÃ§Ã£o #${selectedDeal.id.slice(0, 8)}`}
                  </h2>
                  {selectedDeal.credit_score && (
                    <ScoreBadge grade={selectedDeal.credit_score.grade} score={selectedDeal.credit_score.score} size="md" showScore />
                  )}
                </div>
                <p className="text-sm text-slate-400">{selectedDeal.seller} â {selectedDeal.buyer}</p>
              </div>
              <button onClick={() => setSelectedDeal(null)} className="p-2 rounded-xl hover:bg-dark-600/50">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Pipeline visualization */}
              <Pipeline
                currentPhase={selectedDeal.phase}
                phases={selectedDeal.phases}
              />

              {/* Tab navigation */}
              <div className="flex border-b border-dark-500/50">
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    detailTab === 'info'
                      ? 'border-brand-400 text-brand-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                  onClick={() => setDetailTab('info')}
                >
                  <FileText size={14} className="inline mr-1.5" />
                  Informacoes
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    detailTab === 'execution'
                      ? 'border-brand-400 text-brand-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                  onClick={() => setDetailTab('execution')}
                >
                  <ListChecks size={14} className="inline mr-1.5" />
                  ExecuÃ§Ã£o
                  {executionPlan && (
                    <span className="ml-1.5 text-[10px] font-bold bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded-full">
                      {executionPlan.overall_progress}%
                    </span>
                  )}
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    detailTab === 'sla'
                      ? 'border-brand-400 text-brand-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                  onClick={() => setDetailTab('sla')}
                >
                  <BarChart3 size={14} className="inline mr-1.5" />
                  SLA
                  {executionPlan && executionPlan.breached_slas > 0 && (
                    <span className="ml-1.5 text-[10px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
                      {executionPlan.breached_slas}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab: Info */}
              {detailTab === 'info' && (
                <>
                  {/* Deal info */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-dark-600/50">
                      <p className="text-xs text-slate-400">Valor do CrÃ©dito</p>
                      <p className="text-xl font-bold text-white">{formatBRL(selectedDeal.amount)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-dark-600/50">
                      <p className="text-xs text-slate-400">Desconto Acordado</p>
                      <p className="text-xl font-bold text-white">{selectedDeal.discount}%</p>
                    </div>
                    <div className="p-4 rounded-xl bg-dark-600/50">
                      <p className="text-xs text-slate-400">Valor Liquido</p>
                      <p className="text-xl font-bold text-emerald-400">
                        {formatBRL(selectedDeal.amount * (1 - selectedDeal.discount / 100))}
                      </p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <h3 className="text-sm font-bold text-white mb-3">HistÃ³rico</h3>
                    <div className="space-y-3">
                      {Object.entries(selectedDeal.phases)
                        .filter(([, v]) => v.status === 'done' || v.status === 'current')
                        .map(([k, v]) => (
                          <div key={k} className="flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              v.status === 'done' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-brand-500/20 text-brand-400'
                            }`}>
                              {v.status === 'done' ? 'â' : Number(k)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{v.note}</p>
                              {v.date && <p className="text-xs text-slate-500">{formatDate(v.date)}</p>}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Credit usage (if phase >= 7) */}
                  {selectedDeal.credit_usage && (
                    <div>
                      <h3 className="text-sm font-bold text-white mb-3">Monitoramento de Uso do CrÃ©dito</h3>
                      <CreditGauge
                        total={selectedDeal.credit_usage.total}
                        used={selectedDeal.credit_usage.used}
                        reserved={selectedDeal.credit_usage.reserved}
                        available={selectedDeal.credit_usage.available}
                        expiresAt={selectedDeal.credit_usage.expires_at}
                        lastUsed={selectedDeal.credit_usage.last_used}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    {selectedDeal.phase < 8 && (
                      <Button variant="primary">
                        <ArrowRight size={16} />
                        Avancar para {PHASE_LABELS[Math.min(selectedDeal.phase + 1, 8)]}
                      </Button>
                    )}
                    <Button variant="secondary">
                      <FileText size={16} />
                      Ver Documentos
                    </Button>
                  </div>
                </>
              )}

              {/* Tab: Execution Checklist */}
              {detailTab === 'execution' && (
                <ExecutionChecklist
                  plan={executionPlan}
                  tasks={executionTasks}
                  onStartTask={handleStartTask}
                  onCompleteTask={handleCompleteTask}
                  onBlockTask={handleBlockTask}
                  onAddComment={handleAddComment}
                  onCreatePlan={handleCreatePlan}
                  loading={executionLoading}
                  matchId={selectedDeal.id}
                />
              )}

              {/* Tab: SLA Tracker */}
              {detailTab === 'sla' && (
                executionPlan ? (
                  <SLATracker
                    plan={executionPlan}
                    tasks={executionTasks}
                  />
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Clock size={32} className="mx-auto mb-2" />
                    <p className="text-sm">Crie um plano de execuÃ§Ã£o para monitorar SLAs</p>
                    <Button variant="primary" className="mt-3" onClick={handleCreatePlan} disabled={executionLoading}>
                      {executionLoading ? 'Criando...' : 'Criar Plano'}
                    </Button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
