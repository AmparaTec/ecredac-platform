'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL, formatDate, matchStatusConfig, transactionStatusConfig } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pipeline, PHASES } from '@/components/ui/pipeline'
import { CreditGauge } from '@/components/ui/credit-gauge'
import { GitMerge, ChevronRight, ArrowRight, FileText, Clock, X } from 'lucide-react'

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
}

const PHASE_LABELS = [
  '', 'Originacao', 'Matching', 'Conclusao Comercial', 'Procuracao Digital',
  'Contrato', 'Transferencia', 'Uso do Credito', 'Concluido'
]

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  useEffect(() => {
    loadDeals()
  }, [])

  async function loadDeals() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: company } = await supabase
      .from('companies').select('id').eq('auth_user_id', user.id).single()
    if (!company) return

    // Get matches with transactions
    const { data: matches } = await supabase
      .from('matches')
      .select(`
        *,
        seller_company:companies!seller_company_id(id, nome_fantasia, razao_social),
        buyer_company:companies!buyer_company_id(id, nome_fantasia, razao_social),
        listing:credit_listings(*),
        request:credit_requests(*)
      `)
      .or(`seller_company_id.eq.${company.id},buyer_company_id.eq.${company.id}`)
      .order('created_at', { ascending: false })

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .or(`seller_company_id.eq.${company.id},buyer_company_id.eq.${company.id}`)

    // Build deals from matches + transactions
    const dealList: Deal[] = (matches || []).map((m: any) => {
      const tx = transactions?.find(t => t.match_id === m.id)
      const phase = computePhase(m, tx)

      return {
        id: m.id,
        phase,
        title: `${formatBRL(m.matched_amount)} — ${m.agreed_discount}% desc.`,
        seller: m.seller_company?.nome_fantasia || m.seller_company?.razao_social || 'Cedente',
        buyer: m.buyer_company?.nome_fantasia || m.buyer_company?.razao_social || 'Cessionario',
        amount: m.matched_amount,
        discount: m.agreed_discount,
        status: m.status,
        created_at: m.created_at,
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
      }
    })

    setDeals(dealList)
    setLoading(false)
  }

  function computePhase(match: any, tx: any): number {
    if (!match) return 1
    if (match.status === 'proposed') return 2
    if (match.status === 'confirmed' && !tx) return 3
    if (tx?.status === 'pending_payment') return 4
    if (tx?.contract_signed_at && tx?.status === 'paid') return 5
    if (tx?.status === 'transferring') return 6
    if (tx?.status === 'completed') return 8
    if (tx?.nfe_key) return 7
    return Math.min(match.status === 'accepted_seller' || match.status === 'accepted_buyer' ? 3 : 2, 8)
  }

  function buildPhaseHistory(match: any, tx: any): Record<number, { status: string; date: string | null; note: string }> {
    const phases: Record<number, { status: string; date: string | null; note: string }> = {}
    const phase = computePhase(match, tx)

    for (let i = 1; i <= 8; i++) {
      if (i < phase) {
        phases[i] = { status: 'done', date: match.created_at, note: `${PHASE_LABELS[i]} concluida` }
      } else if (i === phase) {
        phases[i] = { status: 'current', date: null, note: `${PHASE_LABELS[i]} em andamento` }
      } else {
        phases[i] = { status: 'pending', date: null, note: `${PHASE_LABELS[i]} pendente` }
      }
    }
    return phases
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
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-gray-500 mt-1">Acompanhe todas as operacoes em tempo real</p>
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
          <div key={phase} className="text-center p-2 rounded-xl bg-white border border-gray-100">
            <p className="text-lg font-bold text-brand-600">{dealsByPhase[phase]?.length || 0}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{PHASE_LABELS[phase]}</p>
          </div>
        ))}
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {Array.from({ length: 8 }, (_, i) => i + 1).map(phase => (
            <div key={phase} className="flex-shrink-0 w-64">
              <div className="bg-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {PHASE_LABELS[phase]}
                  </h3>
                  <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                    {dealsByPhase[phase]?.length || 0}
                  </span>
                </div>
                <div className="space-y-2">
                  {dealsByPhase[phase]?.map(deal => (
                    <Card
                      key={deal.id}
                      className="p-3 cursor-pointer"
                      hover
                      onClick={() => setSelectedDeal(deal)}
                    >
                      <p className="text-sm font-bold text-gray-900">{formatBRL(deal.amount)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{deal.seller} → {deal.buyer}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant={deal.discount >= 15 ? 'success' : 'info'}>
                          {deal.discount}% desc.
                        </Badge>
                        <span className="text-[10px] text-gray-400">{formatDate(deal.created_at)}</span>
                      </div>
                    </Card>
                  ))}
                  {(!dealsByPhase[phase] || dealsByPhase[phase].length === 0) && (
                    <div className="py-4 text-center text-xs text-gray-400">Vazio</div>
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
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">Operacao</th>
                <th className="px-4 py-3 text-left font-medium">Cedente</th>
                <th className="px-4 py-3 text-left font-medium">Cessionario</th>
                <th className="px-4 py-3 text-left font-medium">Valor</th>
                <th className="px-4 py-3 text-left font-medium">Desconto</th>
                <th className="px-4 py-3 text-left font-medium">Fase</th>
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deals.map(deal => (
                <tr key={deal.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedDeal(deal)}>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-brand-600">#{deal.id.slice(0, 8)}</span>
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
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(deal.created_at)}</td>
                  <td className="px-4 py-3"><ChevronRight size={16} className="text-gray-400" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {deals.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <GitMerge size={32} className="mx-auto mb-2" />
              <p className="text-sm">Nenhuma operacao no pipeline</p>
            </div>
          )}
        </Card>
      )}

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedDeal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Operacao #{selectedDeal.id.slice(0, 8)}</h2>
                <p className="text-sm text-gray-500">{selectedDeal.seller} → {selectedDeal.buyer}</p>
              </div>
              <button onClick={() => setSelectedDeal(null)} className="p-2 rounded-xl hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Pipeline visualization */}
              <Pipeline
                currentPhase={selectedDeal.phase}
                phases={selectedDeal.phases}
              />

              {/* Deal info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-500">Valor do Credito</p>
                  <p className="text-xl font-bold">{formatBRL(selectedDeal.amount)}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-500">Desconto Acordado</p>
                  <p className="text-xl font-bold">{selectedDeal.discount}%</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-500">Valor Liquido</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {formatBRL(selectedDeal.amount * (1 - selectedDeal.discount / 100))}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Historico</h3>
                <div className="space-y-3">
                  {Object.entries(selectedDeal.phases)
                    .filter(([, v]) => v.status === 'done' || v.status === 'current')
                    .map(([k, v]) => (
                      <div key={k} className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          v.status === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-100 text-brand-700'
                        }`}>
                          {v.status === 'done' ? '✓' : Number(k)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{v.note}</p>
                          {v.date && <p className="text-xs text-gray-400">{formatDate(v.date)}</p>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Credit usage (if phase >= 7) */}
              {selectedDeal.credit_usage && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Monitoramento de Uso do Credito</h3>
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
