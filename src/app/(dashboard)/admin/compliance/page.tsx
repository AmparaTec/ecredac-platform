'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Shield, AlertTriangle, Check, X, Clock, Eye, ChevronDown, ChevronUp,
  Loader2, Search, Filter, Building2, FileText, Gavel, RefreshCw,
  ArrowUpRight, UserCheck, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ==================== TYPES ====================

type Tab = 'kyc' | 'pld' | 'audit'

interface KycEntry {
  id: string
  company_id: string
  status: string
  razao_social: string
  cnpj: string
  risk_score: number
  pep: boolean
  total_docs: number
  docs_aprovados: number
  docs_reprovados: number
  docs_pendentes: number
  created_at: string
  reviewed_at: string | null
}

interface PldAlert {
  id: string
  alert_type: string
  severity: string
  status: string
  title: string
  description: string
  trigger_data: Record<string, unknown>
  created_at: string
  resolved_at: string | null
  resolution_notes: string | null
  companies?: { legal_name: string; cnpj: string }
  transactions?: { credit_value: number; discount_percentage: number }
}

// ==================== HELPERS ====================

const SEVERITY_COLORS: Record<string, string> = {
  critico: 'text-red-500 bg-red-500/10 border-red-500/30',
  alto: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medio: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  baixo: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
}

const STATUS_COLORS: Record<string, string> = {
  aberto: 'text-red-400',
  em_analise: 'text-amber-400',
  resolvido: 'text-emerald-400',
  falso_positivo: 'text-slate-400',
  escalado: 'text-purple-400',
}

const KYC_STATUS_COLORS: Record<string, string> = {
  pendente: 'text-amber-400 bg-amber-500/10',
  em_analise: 'text-blue-400 bg-blue-500/10',
  aprovado: 'text-emerald-400 bg-emerald-500/10',
  reprovado: 'text-red-400 bg-red-500/10',
  expirado: 'text-slate-400 bg-slate-500/10',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

// ==================== MAIN COMPONENT ====================

export default function AdminCompliancePage() {
  const [tab, setTab] = useState<Tab>('kyc')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-3">
          <Shield size={28} className="text-brand-400" />
          Painel de Compliance
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Gerenciamento de KYC, alertas PLD/AML e trilha de auditoria.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800/50 p-1 rounded-xl border border-dark-500/30 w-fit">
        {([
          { id: 'kyc' as Tab, label: 'KYC', icon: UserCheck },
          { id: 'pld' as Tab, label: 'PLD/AML', icon: AlertTriangle },
          { id: 'audit' as Tab, label: 'Auditoria', icon: Eye },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all',
              tab === t.id
                ? 'bg-brand-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-dark-600'
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'kyc' && <KycTab />}
      {tab === 'pld' && <PldTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  )
}

// ==================== KYC TAB ====================

function KycTab() {
  const [entries, setEntries] = useState<KycEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('em_analise')
  const [selectedKyc, setSelectedKyc] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const fetchKyc = useCallback(async () => {
    setLoading(true)
    try {
      // Use admin endpoint — fetches all KYC profiles via view
      const res = await fetch(`/api/compliance/kyc/admin?status=${filter}`)
      const data = await res.json()
      setEntries(data.entries || [])
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchKyc() }, [fetchKyc])

  async function handleAction(kycId: string, action: 'approve' | 'reject') {
    setActionLoading(true)
    try {
      const res = await fetch('/api/compliance/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kyc_id: kycId,
          action,
          reason: action === 'reject' ? rejectionReason : undefined,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setEntries(prev => prev.filter(e => e.id !== kycId))
        setSelectedKyc(null)
        setRejectionReason('')
      }
    } catch {
      // silencioso
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <Filter size={14} className="text-slate-400" />
        {['em_analise', 'pendente', 'aprovado', 'reprovado', 'expirado'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              filter === s ? 'bg-brand-500 text-white' : 'bg-dark-700 text-slate-400 hover:text-white'
            )}
          >
            {s === 'em_analise' ? 'Em Análise' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-brand-400" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Nenhum registro KYC com status &quot;{filter}&quot;
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.id} className="bg-dark-800/50 border border-dark-500/30 rounded-xl">
              <div className="flex items-center gap-4 p-4">
                <Building2 size={18} className="text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{entry.razao_social || 'Sem razão social'}</p>
                  <p className="text-xs text-slate-500">CNPJ: {entry.cnpj || '—'} · Score: {entry.risk_score}</p>
                </div>
                <div className="flex items-center gap-3">
                  {entry.pep && (
                    <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">PEP</span>
                  )}
                  <span className={cn('text-xs font-bold px-2 py-1 rounded-lg', KYC_STATUS_COLORS[entry.status])}>
                    {entry.status === 'em_analise' ? 'Em Análise' : entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {entry.docs_pendentes} pendente{entry.docs_pendentes !== 1 ? 's' : ''} · {entry.docs_aprovados} ok
                  </span>
                  <button
                    onClick={() => setSelectedKyc(selectedKyc === entry.id ? null : entry.id)}
                    className="p-1.5 rounded-lg hover:bg-dark-600 text-slate-400"
                  >
                    {selectedKyc === entry.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {selectedKyc === entry.id && (
                <div className="border-t border-dark-500/20 p-4 space-y-4">
                  {/* Detalhes */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-slate-500">Docs Enviados:</span> <span className="text-white font-bold">{entry.total_docs}</span></div>
                    <div><span className="text-slate-500">Aprovados:</span> <span className="text-emerald-400 font-bold">{entry.docs_aprovados}</span></div>
                    <div><span className="text-slate-500">Reprovados:</span> <span className="text-red-400 font-bold">{entry.docs_reprovados}</span></div>
                    <div><span className="text-slate-500">Pendentes:</span> <span className="text-amber-400 font-bold">{entry.docs_pendentes}</span></div>
                  </div>

                  {/* Ações */}
                  {entry.status === 'em_analise' && (
                    <div className="flex items-center gap-3 pt-3 border-t border-dark-500/20">
                      <button
                        onClick={() => handleAction(entry.id, 'approve')}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                      >
                        <Check size={14} /> Aprovar
                      </button>
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                          placeholder="Motivo da reprovação..."
                          className="flex-1 px-3 py-2 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm"
                        />
                        <button
                          onClick={() => handleAction(entry.id, 'reject')}
                          disabled={actionLoading || !rejectionReason.trim()}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                        >
                          <X size={14} /> Reprovar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== PLD TAB ====================

function PldTab() {
  const [alerts, setAlerts] = useState<PldAlert[]>([])
  const [summary, setSummary] = useState({ total: 0, abertos: 0, em_analise: 0, criticos: 0, altos: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter) params.set('status', filter)
      const res = await fetch(`/api/compliance/pld?${params.toString()}`)
      const data = await res.json()
      setAlerts(data.alerts || [])
      setSummary(data.summary || { total: 0, abertos: 0, em_analise: 0, criticos: 0, altos: 0 })
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  async function handleAction(alertId: string, action: string) {
    setActionLoading(true)
    try {
      await fetch('/api/compliance/pld', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId, action, notes }),
      })
      setNotes('')
      setSelectedAlert(null)
      fetchAlerts()
    } catch {
      // silencioso
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: summary.total, color: 'text-white' },
          { label: 'Abertos', value: summary.abertos, color: 'text-red-400' },
          { label: 'Em Análise', value: summary.em_analise, color: 'text-amber-400' },
          { label: 'Críticos', value: summary.criticos, color: 'text-red-500' },
          { label: 'Alta Severidade', value: summary.altos, color: 'text-orange-400' },
        ].map(card => (
          <div key={card.label} className="bg-dark-800/50 border border-dark-500/30 rounded-xl p-3 text-center">
            <p className={cn('text-xl font-black', card.color)}>{card.value}</p>
            <p className="text-xs text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter size={14} className="text-slate-400" />
        {[
          { value: '', label: 'Todos' },
          { value: 'aberto', label: 'Abertos' },
          { value: 'em_analise', label: 'Em Análise' },
          { value: 'escalado', label: 'Escalados' },
          { value: 'resolvido', label: 'Resolvidos' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              filter === f.value ? 'bg-brand-500 text-white' : 'bg-dark-700 text-slate-400 hover:text-white'
            )}
          >
            {f.label}
          </button>
        ))}
        <button onClick={fetchAlerts} className="ml-auto p-1.5 rounded-lg hover:bg-dark-600 text-slate-400">
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-brand-400" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          <Shield size={32} className="mx-auto mb-2 text-slate-600" />
          Nenhum alerta PLD encontrado
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => (
            <div key={alert.id} className={cn(
              'border rounded-xl overflow-hidden',
              SEVERITY_COLORS[alert.severity] || 'border-dark-500/30'
            )}>
              <button
                onClick={() => setSelectedAlert(selectedAlert === alert.id ? null : alert.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <AlertCircle size={16} className={STATUS_COLORS[alert.status]} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{alert.title}</p>
                  <p className="text-xs text-slate-500">
                    {alert.companies?.legal_name || '—'} ·{' '}
                    {alert.transactions?.credit_value ? formatCurrency(alert.transactions.credit_value) : ''} ·{' '}
                    {new Date(alert.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className={cn('text-xs font-bold uppercase', STATUS_COLORS[alert.status])}>
                  {alert.status.replace('_', ' ')}
                </span>
                <span className={cn(
                  'text-xs font-bold px-2 py-1 rounded-lg',
                  SEVERITY_COLORS[alert.severity]
                )}>
                  {alert.severity.toUpperCase()}
                </span>
              </button>

              {selectedAlert === alert.id && (
                <div className="border-t border-dark-500/20 p-4 space-y-3">
                  <p className="text-sm text-slate-300">{alert.description}</p>

                  {alert.trigger_data && Object.keys(alert.trigger_data).length > 0 && (
                    <div className="bg-dark-800/50 rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-400 mb-1">Dados do Gatilho:</p>
                      <pre className="text-xs text-slate-300 overflow-x-auto">
                        {JSON.stringify(alert.trigger_data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {alert.resolution_notes && (
                    <p className="text-xs text-slate-400">
                      Resolução: {alert.resolution_notes}
                      {alert.resolved_at && ` (${new Date(alert.resolved_at).toLocaleDateString('pt-BR')})`}
                    </p>
                  )}

                  {['aberto', 'em_analise'].includes(alert.status) && (
                    <div className="flex items-center gap-2 pt-2 border-t border-dark-500/20">
                      <input
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Observações..."
                        className="flex-1 px-3 py-2 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm"
                      />
                      {alert.status === 'aberto' && (
                        <button
                          onClick={() => handleAction(alert.id, 'analisar')}
                          disabled={actionLoading}
                          className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                        >
                          Analisar
                        </button>
                      )}
                      <button
                        onClick={() => handleAction(alert.id, 'resolver')}
                        disabled={actionLoading}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        Resolver
                      </button>
                      <button
                        onClick={() => handleAction(alert.id, 'falso_positivo')}
                        disabled={actionLoading}
                        className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        Falso +
                      </button>
                      <button
                        onClick={() => handleAction(alert.id, 'escalar')}
                        disabled={actionLoading}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        <ArrowUpRight size={12} className="inline mr-1" />
                        COAF
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== AUDIT TAB ====================

function AuditTab() {
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/compliance/audit?page=${page}&search=${encodeURIComponent(search)}`)
      const data = await res.json()
      setLogs(data.logs || [])
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por ação, entidade, usuário..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-dark-700 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all"
          />
        </div>
        <button onClick={fetchLogs} className="p-2 rounded-xl bg-dark-700 border border-dark-500/50 text-slate-400 hover:text-white transition-all">
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-brand-400" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">Nenhum log de auditoria encontrado</div>
      ) : (
        <>
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-dark-800/30 rounded-xl border border-dark-500/10 text-xs">
                <span className="text-slate-600 font-mono w-40 flex-shrink-0">
                  {new Date(log.created_at as string).toLocaleString('pt-BR')}
                </span>
                <span className={cn(
                  'font-bold px-2 py-0.5 rounded w-32 text-center flex-shrink-0',
                  (log.action as string)?.includes('approved') || (log.action as string)?.includes('aceito')
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : (log.action as string)?.includes('rejected') || (log.action as string)?.includes('reprovado')
                    ? 'text-red-400 bg-red-500/10'
                    : 'text-blue-400 bg-blue-500/10'
                )}>
                  {(log.action as string) || '—'}
                </span>
                <span className="text-slate-300 flex-1 truncate">{(log.description as string) || '—'}</span>
                <span className="text-slate-600 font-mono">{((log.entity_type as string) || '—').substring(0, 20)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-dark-700 text-slate-400 text-xs disabled:opacity-30"
            >
              Anterior
            </button>
            <span className="text-xs text-slate-500">Página {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={logs.length < 50}
              className="px-3 py-1.5 rounded-lg bg-dark-700 text-slate-400 text-xs disabled:opacity-30"
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </div>
  )
}
