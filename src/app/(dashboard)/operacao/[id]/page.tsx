'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import {
  CheckCircle, Circle, Clock, Lock, Upload, FileText,
  DollarSign, Shield, Eye, AlertTriangle, ArrowRight,
  ChevronDown, ChevronUp, User, Calendar, Hash
} from 'lucide-react'
import { cn, formatBRL } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────

interface Marco {
  id: string
  numero: number
  titulo: string
  descricao: string
  status: 'pendente' | 'em_andamento' | 'concluido' | 'bloqueado'
  protocolo_sefaz: string | null
  data_inicio: string | null
  data_conclusao: string | null
  prazo_limite: string | null
  atualizado_por: string | null
  role_atualizador: string | null
  evidencias: Evidencia[]
}

interface Evidencia {
  id: string
  nome_arquivo: string
  tipo_arquivo: string
  tamanho_bytes: number
  storage_path: string
  role_uploader: string
  descricao: string
  created_at: string
}

interface EscrowParcela {
  id: string
  numero_parcela: number
  percentual: number
  valor_centavos: number
  marco_liberacao: number
  status: 'aguardando' | 'liberavel' | 'processando' | 'pago' | 'cancelado'
  pago_em: string | null
}

interface AuditEntry {
  id: string
  user_name: string
  user_role: string
  acao: string
  descricao: string
  marco_numero: number | null
  created_at: string
}

interface OperacaoData {
  transaction: {
    id: string
    status: string
    credit_amount: number
    discount_applied: number
    total_payment: number
    vendedor: { razao_social: string; cnpj: string }
    comprador: { razao_social: string; cnpj: string }
    created_at: string
  }
  marcos: Marco[]
  escrow: EscrowParcela[]
  audit_log: AuditEntry[]
  marco_atual: number
  user_role: 'vendedor' | 'comprador' | 'intermediario'
}

// ─── Status Icons & Colors ─────────────────────────────

const statusConfig = {
  pendente: { icon: Circle, color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/30', label: 'Pendente' },
  em_andamento: { icon: Clock, color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/30', label: 'Em Andamento' },
  concluido: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Concluído' },
  bloqueado: { icon: Lock, color: 'text-danger-400', bg: 'bg-danger-500/10', border: 'border-danger-500/30', label: 'Bloqueado' },
}

const escrowStatusConfig = {
  aguardando: { color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Aguardando marco' },
  liberavel: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Liberável' },
  processando: { color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Processando' },
  pago: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Pago' },
  cancelado: { color: 'text-danger-400', bg: 'bg-danger-500/10', label: 'Cancelado' },
}

const roleLabels: Record<string, string> = {
  vendedor: 'Cedente',
  comprador: 'Cessionário',
  intermediario: 'Intermediário',
  sistema: 'Sistema',
}

// ─── Component ─────────────────────────────────────────

export default function OperacaoPage() {
  const params = useParams()
  const transactionId = params.id as string

  const [data, setData] = useState<OperacaoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedMarco, setExpandedMarco] = useState<number | null>(null)
  const [showAudit, setShowAudit] = useState(false)
  const [initLoading, setInitLoading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/operacao?transaction_id=${transactionId}`)
      if (!res.ok) throw new Error('Erro ao carregar operação')
      const json = await res.json()
      setData(json)

      // Auto-expand current marco
      if (json.marco_atual) setExpandedMarco(json.marco_atual)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [transactionId])

  useEffect(() => { fetchData() }, [fetchData])

  async function initMarcos() {
    setInitLoading(true)
    try {
      await fetch('/api/operacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init_marcos', transaction_id: transactionId }),
      })
      await fetch('/api/operacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init_escrow', transaction_id: transactionId }),
      })
      await fetchData()
    } catch {
      // handle
    } finally {
      setInitLoading(false)
    }
  }

  async function updateMarco(numero: number, status: string, protocolo?: string) {
    await fetch('/api/operacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_marco',
        transaction_id: transactionId,
        marco_numero: numero,
        status,
        protocolo_sefaz: protocolo,
      }),
    })
    await fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400 mt-3">Carregando operação...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={32} className="text-danger-400 mx-auto mb-3" />
        <p className="text-white font-medium">Erro ao carregar operação</p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
      </div>
    )
  }

  const { transaction, marcos, escrow, audit_log, marco_atual, user_role } = data
  const progress = marcos.filter(m => m.status === 'concluido').length
  const totalMarcos = marcos.length || 9
  const progressPct = Math.round((progress / totalMarcos) * 100)

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Shield size={20} className="text-brand-400" />
          <h1 className="text-xl font-bold text-white">Acompanhamento da Operação</h1>
          <span className={cn(
            'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full',
            user_role === 'vendedor' ? 'bg-blue-500/10 text-blue-400' :
            user_role === 'comprador' ? 'bg-purple-500/10 text-purple-400' :
            'bg-amber-500/10 text-amber-400'
          )}>
            Visão {roleLabels[user_role]}
          </span>
        </div>
        <p className="text-sm text-slate-400">
          <Eye size={14} className="inline mr-1" />
          Visibilidade total. Acesso zero.
        </p>
      </div>

      {/* ── Resumo ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Valor do Crédito</p>
          <p className="text-lg font-bold text-white">{formatBRL(transaction.credit_amount)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Deságio</p>
          <p className="text-lg font-bold text-brand-400">{transaction.discount_applied}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Valor da Operação</p>
          <p className="text-lg font-bold text-emerald-400">{formatBRL(transaction.total_payment)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Progresso</p>
          <div className="flex items-center gap-3">
            <p className="text-lg font-bold text-white">{progress}/{totalMarcos}</p>
            <div className="flex-1 h-2 bg-dark-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Partes ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <User size={18} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Cedente (Vendedor)</p>
            <p className="text-sm font-medium text-white">{transaction.vendedor?.razao_social || '—'}</p>
            <p className="text-xs text-slate-500">{transaction.vendedor?.cnpj || ''}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <User size={18} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Cessionário (Comprador)</p>
            <p className="text-sm font-medium text-white">{transaction.comprador?.razao_social || '—'}</p>
            <p className="text-xs text-slate-500">{transaction.comprador?.cnpj || ''}</p>
          </div>
        </Card>
      </div>

      {/* ── Marcos (Pipeline) ──────────────────── */}
      {marcos.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-white font-medium mb-2">Marcos ainda não iniciados</p>
          <p className="text-sm text-slate-400 mb-4">Crie os marcos da jornada de confiança para acompanhar esta operação</p>
          {(user_role === 'intermediario' || user_role === 'vendedor') && (
            <button
              onClick={initMarcos}
              disabled={initLoading}
              className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {initLoading ? 'Criando...' : 'Iniciar Jornada de Confiança'}
            </button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield size={14} className="text-brand-400" />
            Jornada de Confiança — Marcos da Operação
          </h2>

          {marcos.map((marco) => {
            const config = statusConfig[marco.status]
            const StatusIcon = config.icon
            const isExpanded = expandedMarco === marco.numero
            const isCurrent = marco.numero === marco_atual
            const canUpdate = user_role !== 'comprador'

            return (
              <Card
                key={marco.id}
                className={cn(
                  'overflow-hidden transition-all',
                  isCurrent && 'ring-1 ring-brand-500/40'
                )}
              >
                {/* Marco header */}
                <button
                  onClick={() => setExpandedMarco(isExpanded ? null : marco.numero)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-dark-700/30 transition-colors"
                >
                  {/* Status icon + line */}
                  <div className="relative flex flex-col items-center">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', config.bg, 'border', config.border)}>
                      <StatusIcon size={16} className={config.color} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Marco {marco.numero}</span>
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', config.bg, config.color)}>
                        {config.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 animate-pulse">
                          ATUAL
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-white mt-0.5">{marco.titulo}</p>
                    {marco.data_conclusao && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Concluído em {new Date(marco.data_conclusao).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>

                  {/* Evidence count */}
                  {marco.evidencias.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <FileText size={12} />
                      {marco.evidencias.length}
                    </span>
                  )}

                  {/* Protocolo SEFAZ */}
                  {marco.protocolo_sefaz && (
                    <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                      <Hash size={12} />
                      {marco.protocolo_sefaz}
                    </span>
                  )}

                  {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-dark-500/30 pt-3 ml-12">
                    <p className="text-xs text-slate-400 mb-3">{marco.descricao}</p>

                    {/* Evidências */}
                    {marco.evidencias.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Evidências Documentais</p>
                        <div className="space-y-1.5">
                          {marco.evidencias.map(ev => (
                            <div key={ev.id} className="flex items-center gap-2 p-2 rounded-lg bg-dark-700/50 text-xs">
                              <FileText size={14} className="text-brand-400 shrink-0" />
                              <span className="text-white font-medium truncate">{ev.nome_arquivo}</span>
                              <span className="text-slate-500">por {roleLabels[ev.role_uploader]}</span>
                              <span className="text-slate-600 ml-auto">
                                {new Date(ev.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions (vendedor/intermediário only) */}
                    {canUpdate && marco.status !== 'concluido' && (
                      <div className="flex items-center gap-2 mt-3">
                        {marco.status === 'pendente' && (
                          <button
                            onClick={() => updateMarco(marco.numero, 'em_andamento')}
                            className="px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-medium hover:bg-brand-500/20 transition-colors"
                          >
                            Iniciar Marco
                          </button>
                        )}
                        {marco.status === 'em_andamento' && (
                          <button
                            onClick={() => updateMarco(marco.numero, 'concluido')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                          >
                            <CheckCircle size={12} className="inline mr-1" />
                            Concluir Marco
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Escrow / Pagamentos ────────────────── */}
      {escrow.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <DollarSign size={14} className="text-yellow-400" />
            Escrow — Parcelas de Pagamento
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {escrow.map(p => {
              const cfg = escrowStatusConfig[p.status]
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400">Parcela {p.numero_parcela}</span>
                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-white">{formatBRL(p.valor_centavos / 100)}</p>
                  <p className="text-xs text-slate-500 mt-1">{p.percentual}% do total</p>
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
                    <ArrowRight size={10} />
                    Libera no Marco {p.marco_liberacao}
                  </div>
                  {p.pago_em && (
                    <p className="text-[10px] text-emerald-400 mt-1">
                      Pago em {new Date(p.pago_em).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Trilha de Auditoria ────────────────── */}
      {audit_log.length > 0 && (
        <div>
          <button
            onClick={() => setShowAudit(!showAudit)}
            className="flex items-center gap-2 text-sm font-bold text-white mb-3 hover:text-brand-400 transition-colors"
          >
            <Calendar size={14} className="text-slate-400" />
            Trilha de Auditoria ({audit_log.length})
            {showAudit ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showAudit && (
            <Card className="p-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {audit_log.map(entry => (
                  <div key={entry.id} className="flex items-start gap-3 text-xs p-2 rounded-lg hover:bg-dark-700/30">
                    <span className="text-[10px] text-slate-600 whitespace-nowrap mt-0.5">
                      {new Date(entry.created_at).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    <span className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0',
                      entry.user_role === 'vendedor' ? 'bg-blue-500/10 text-blue-400' :
                      entry.user_role === 'comprador' ? 'bg-purple-500/10 text-purple-400' :
                      entry.user_role === 'sistema' ? 'bg-slate-500/10 text-slate-400' :
                      'bg-amber-500/10 text-amber-400'
                    )}>
                      {roleLabels[entry.user_role]}
                    </span>
                    <span className="text-slate-300">{entry.descricao}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
