'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquarePlus, Bug, Lightbulb, ThumbsUp, MessageCircle,
  RefreshCw, Filter, CheckCircle2, Clock, AlertCircle
} from 'lucide-react'

type FeedbackType = 'bug' | 'melhoria' | 'elogio' | 'outro'
type FeedbackStatus = 'novo' | 'em_analise' | 'resolvido' | 'descartado'

interface Feedback {
  id: string
  type: FeedbackType
  message: string
  page: string | null
  status: FeedbackStatus
  created_at: string
  user_id: string | null
  user_agent: string | null
}

const typeConfig: Record<FeedbackType, { label: string; icon: React.ReactNode; color: string }> = {
  bug:      { label: 'Bug',      icon: <Bug size={13} />,          color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  melhoria: { label: 'Melhoria', icon: <Lightbulb size={13} />,    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  elogio:   { label: 'Elogio',   icon: <ThumbsUp size={13} />,     color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  outro:    { label: 'Outro',    icon: <MessageCircle size={13} />, color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
}

const statusConfig: Record<FeedbackStatus, { label: string; color: string }> = {
  novo:       { label: 'Novo',       color: 'text-brand-400 bg-brand-500/10 border-brand-500/20' },
  em_analise: { label: 'Em análise', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  resolvido:  { label: 'Resolvido',  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  descartado: { label: 'Descartado', color: 'text-slate-500 bg-slate-700/30 border-slate-600/20' },
}

const statusOptions: FeedbackStatus[] = ['novo', 'em_analise', 'resolvido', 'descartado']

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatPage(page: string | null) {
  if (!page) return '—'
  return page.replace('/dashboard/', '/').replace('/dashboard', '/painel') || '/'
}

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterType !== 'all') params.set('type', filterType)
      params.set('limit', '100')

      const res = await fetch(`/api/feedback?${params}`)
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Erro ao carregar feedbacks')
        return
      }
      const data = await res.json()
      setFeedbacks(data.feedbacks ?? [])
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterType])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, status: FeedbackStatus) {
    setUpdating(id)
    try {
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status } : f))
      }
    } finally {
      setUpdating(null)
    }
  }

  // Contadores por tipo e status
  const counts = feedbacks.reduce((acc, f) => {
    acc[f.type] = (acc[f.type] ?? 0) + 1
    acc[f.status] = (acc[f.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col gap-4 p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquarePlus size={20} className="text-brand-400" />
            Gestão de Feedback
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {feedbacks.length} registro{feedbacks.length !== 1 ? 's' : ''} encontrado{feedbacks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg border border-dark-500/50 bg-dark-700 text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50"
          title="Recarregar"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-4 gap-2 flex-shrink-0">
        {[
          { key: 'novo', label: 'Novos', color: 'text-brand-400' },
          { key: 'em_analise', label: 'Em Análise', color: 'text-amber-400' },
          { key: 'resolvido', label: 'Resolvidos', color: 'text-emerald-400' },
          { key: 'descartado', label: 'Descartados', color: 'text-slate-500' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
            className={`rounded-xl border p-3 text-left transition-all ${
              filterStatus === key
                ? 'border-brand-500/40 bg-brand-500/5'
                : 'border-dark-500/50 bg-dark-700/60 hover:border-dark-400/50'
            }`}
          >
            <div className={`text-2xl font-bold ${color}`}>{counts[key] ?? 0}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
          </button>
        ))}
      </div>

      {/* Filtros por tipo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Filter size={13} className="text-slate-600" />
        <span className="text-[11px] text-slate-600">Tipo:</span>
        {['all', 'bug', 'melhoria', 'elogio', 'outro'].map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              filterType === t
                ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                : 'bg-dark-700/60 text-slate-500 border border-dark-500/30 hover:text-slate-600'
            }`}
          >
            {t === 'all' ? 'Todos' : typeConfig[t as FeedbackType]?.label ?? t}
            {t !== 'all' && counts[t] ? ` (${counts[t]})` : ''}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-dark-500 scrollbar-track-transparent space-y-2 pr-1">
        {loading && (
          <div className="flex items-center justify-center h-40 text-slate-600">
            <RefreshCw size={18} className="animate-spin mr-2" />
            Carregando...
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={16} />
            {error}
            {error.includes('negado') && (
              <span className="ml-1 text-xs text-slate-500">— Esta página é exclusiva para titulares.</span>
            )}
          </div>
        )}

        {!loading && !error && feedbacks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-slate-600 text-sm gap-2">
            <MessageSquarePlus size={28} className="opacity-30" />
            Nenhum feedback encontrado
          </div>
        )}

        {!loading && !error && feedbacks.map((fb) => {
          const tc = typeConfig[fb.type]
          const sc = statusConfig[fb.status]
          return (
            <div
              key={fb.id}
              className="rounded-xl border border-dark-500/50 bg-dark-700/60 p-3.5 hover:border-dark-400/50 transition-all"
            >
              <div className="flex items-start gap-3">
                {/* Ícone tipo */}
                <div className={`flex-shrink-0 mt-0.5 flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium ${tc.color}`}>
                  {tc.icon}
                  {tc.label}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 leading-snug">{fb.message}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-600">{formatDate(fb.created_at)}</span>
                    {fb.page && (
                      <span className="text-[10px] text-slate-600 font-mono bg-dark-600/50 px-1.5 py-0.5 rounded">
                        {formatPage(fb.page)}
                      </span>
                    )}
                    {!fb.user_id && (
                      <span className="text-[10px] text-slate-600 italic">anônimo</span>
                    )}
                  </div>
                </div>

                {/* Status dropdown */}
                <div className="flex-shrink-0 relative">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium ${sc.color}`}>
                    {fb.status === 'resolvido' && <CheckCircle2 size={11} />}
                    {fb.status === 'em_analise' && <Clock size={11} />}
                    {fb.status === 'novo' && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />}
                    {sc.label}
                  </div>

                  {/* Ações rápidas */}
                  <div className="flex items-center gap-1 mt-1.5 justify-end">
                    {statusOptions
                      .filter(s => s !== fb.status)
                      .map(s => {
                        const nextSc = statusConfig[s]
                        return (
                          <button
                            key={s}
                            onClick={() => updateStatus(fb.id, s)}
                            disabled={updating === fb.id}
                            title={`Marcar como "${nextSc.label}"`}
                            className={`px-1.5 py-0.5 rounded text-[10px] transition-all hover:opacity-100 opacity-50 hover:opacity-80 ${nextSc.color} border`}
                          >
                            {updating === fb.id ? '…' : nextSc.label}
                          </button>
                        )
                      })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
