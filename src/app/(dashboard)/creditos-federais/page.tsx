'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Upload, FileText, CheckCircle, AlertTriangle, Clock,
  Loader2, TrendingUp, DollarSign, BarChart3, RefreshCw,
  ChevronRight, X, Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────

interface EfdUpload {
  id: string
  file_name: string
  cnpj: string
  periodo_inicio: string
  periodo_fim: string
  status: 'parsing' | 'parsed' | 'error'
  saldo_credor_pis: number
  saldo_credor_cofins: number
  created_at: string
}

interface ScoreFator {
  nome: string
  peso: number
  valor: number
  detalhe: string
}

interface UploadResult {
  sucesso: boolean
  upload_id: string
  resumo: {
    saldo_credor_pis: number
    saldo_credor_cofins: number
    saldo_credor_total: number
    qtd_nfe_entrada: number
    qtd_registros_c: number
    periodo: string
  }
  score_verificacao: {
    score: number
    nivel: 'baixo' | 'medio' | 'alto' | 'verificado'
    fatores: ScoreFator[]
    riscos: string[]
  }
  erros_parse: string[]
  mensagem: string
}

// ── Helpers ────────────────────────────────────────────────────

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPeriodo(inicio: string, fim: string) {
  const d = (s: string) => new Date(s).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
  return `${d(inicio)} – ${d(fim)}`
}

function scoreColor(nivel: string) {
  return nivel === 'verificado' ? 'text-emerald-400'
    : nivel === 'alto' ? 'text-brand-400'
    : nivel === 'medio' ? 'text-amber-400'
    : 'text-red-400'
}

function scoreBg(nivel: string) {
  return nivel === 'verificado' ? 'bg-emerald-500/20 border-emerald-500/30'
    : nivel === 'alto' ? 'bg-brand-600/20 border-brand-500/30'
    : nivel === 'medio' ? 'bg-amber-500/20 border-amber-500/30'
    : 'bg-red-500/20 border-red-500/30'
}

function statusBadge(status: EfdUpload['status']) {
  const map = {
    parsed: { label: 'Processado', cls: 'bg-emerald-500/20 text-emerald-400' },
    parsing: { label: 'Processando', cls: 'bg-amber-500/20 text-amber-400' },
    error: { label: 'Erro', cls: 'bg-red-500/20 text-red-400' },
  }
  const s = map[status]
  return <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', s.cls)}>{s.label}</span>
}

// ── Main Page ──────────────────────────────────────────────────

export default function CreditosFederaisPage() {
  const [uploads, setUploads] = useState<EfdUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadUploads() {
    try {
      const res = await fetch('/api/efd-upload')
      if (res.ok) {
        const data = await res.json()
        setUploads(data.uploads || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUploads() }, [])

  async function handleFile(file: File) {
    setUploading(true)
    setResult(null)
    setUploadError(null)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/efd-upload', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setUploadError(data.error || 'Erro ao processar EFD')
      } else {
        setResult(data)
        await loadUploads()
      }
    } catch {
      setUploadError('Erro de conexão. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const totalSaldo = uploads
    .filter(u => u.status === 'parsed')
    .reduce((s, u) => s + (u.saldo_credor_pis || 0) + (u.saldo_credor_cofins || 0), 0)

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/20 text-brand-400 border border-brand-500/30 font-medium">
              Trilho A
            </span>
            <span className="text-xs text-slate-500">PIS/COFINS Federal</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Créditos Federais</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Envie sua EFD-Contribuições e identifique créditos de PIS/COFINS para compensação via PER/DCOMP.
          </p>
        </div>
        <button
          onClick={loadUploads}
          className="p-2 rounded-xl bg-dark-700 border border-dark-500/30 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      {uploads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-dark-700/50 border border-dark-500/30">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-brand-400" />
              <span className="text-xs text-slate-500">Saldo Credor Total</span>
            </div>
            <p className="text-xl font-bold text-white">{formatBRL(totalSaldo)}</p>
            <p className="text-xs text-slate-500 mt-0.5">PIS + COFINS identificados</p>
          </div>
          <div className="p-4 rounded-2xl bg-dark-700/50 border border-dark-500/30">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500">EFDs enviadas</span>
            </div>
            <p className="text-xl font-bold text-white">{uploads.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">{uploads.filter(u => u.status === 'parsed').length} processadas</p>
          </div>
          <div className="p-4 rounded-2xl bg-dark-700/50 border border-dark-500/30 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-500">Status do Trilho</span>
            </div>
            <p className="text-sm font-semibold text-emerald-400">Ativo</p>
            <p className="text-xs text-slate-500 mt-0.5">Janela 2025–2026</p>
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200',
          dragOver
            ? 'border-brand-400 bg-brand-600/10'
            : 'border-dark-400/40 bg-dark-700/30 hover:border-brand-500/40 hover:bg-dark-700/50',
          uploading && 'pointer-events-none opacity-60'
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.efd"
          onChange={onFileChange}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
            <p className="text-sm text-slate-600 font-medium">Processando EFD-Contribuições...</p>
            <p className="text-xs text-slate-500">Analisando registros C100, M200 e M600</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-600/20 border border-brand-500/30">
              <Upload className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Arraste o arquivo EFD aqui ou <span className="text-brand-400">clique para selecionar</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Formatos aceitos: .txt ou .efd (SPED EFD-Contribuições) · Máx. 50MB
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Info className="w-3.5 h-3.5" />
              Arquivo gerado pelo SPED do PGDAS-D ou sistema contábil
            </div>
          </div>
        )}
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-300">Erro no processamento</p>
            <p className="text-xs text-red-400 mt-0.5">{uploadError}</p>
          </div>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload result */}
      {result && (
        <div className={cn('p-5 rounded-2xl border', scoreBg(result.score_verificacao.nivel))}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-white">EFD Processada</span>
              </div>
              <p className="text-xs text-slate-500">{result.mensagem}</p>
            </div>
            <div className="text-right">
              <p className={cn('text-2xl font-bold', scoreColor(result.score_verificacao.nivel))}>
                {result.score_verificacao.score}/100
              </p>
              <p className="text-xs text-slate-500 capitalize">Score {result.score_verificacao.nivel}</p>
            </div>
          </div>

          {/* Saldos */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-dark-700/50">
              <p className="text-xs text-slate-500 mb-0.5">Saldo PIS</p>
              <p className="text-sm font-semibold text-white">{formatBRL(result.resumo.saldo_credor_pis)}</p>
            </div>
            <div className="p-3 rounded-xl bg-dark-700/50">
              <p className="text-xs text-slate-500 mb-0.5">Saldo COFINS</p>
              <p className="text-sm font-semibold text-white">{formatBRL(result.resumo.saldo_credor_cofins)}</p>
            </div>
            <div className="p-3 rounded-xl bg-dark-700/50">
              <p className="text-xs text-slate-500 mb-0.5">Total</p>
              <p className="text-sm font-bold text-emerald-400">{formatBRL(result.resumo.saldo_credor_total)}</p>
            </div>
          </div>

          {/* Fatores de score */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Fatores de Verificação</p>
            {result.score_verificacao.fatores.map((f) => (
              <div key={f.nome} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600">{f.nome}</span>
                    <span className="text-xs text-slate-500">{f.valor}/{f.peso}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-dark-600">
                    <div
                      className={cn('h-full rounded-full transition-all', f.valor === f.peso ? 'bg-emerald-400' : f.valor > 0 ? 'bg-brand-400' : 'bg-red-400')}
                      style={{ width: `${(f.valor / f.peso) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Riscos */}
          {result.score_verificacao.riscos.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {result.score_verificacao.riscos.map((r) => (
                <div key={r} className="flex items-center gap-2 text-xs text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Uploads list */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 mb-3">
          EFDs Enviadas {uploads.length > 0 && <span className="text-slate-500">({uploads.length})</span>}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          </div>
        ) : uploads.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="p-3 rounded-2xl bg-dark-700/50 border border-dark-500/30">
              <BarChart3 className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Nenhuma EFD enviada ainda</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Envie sua primeira EFD-Contribuições para identificar créditos de PIS/COFINS
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {uploads.map((u) => {
              const saldo = (u.saldo_credor_pis || 0) + (u.saldo_credor_cofins || 0)
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-dark-700/50 border border-dark-500/30 hover:border-dark-400/50 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-dark-600 shrink-0">
                    {u.status === 'parsed' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : u.status === 'parsing' ? (
                      <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900 truncate">{u.file_name}</p>
                      {statusBadge(u.status)}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {u.cnpj} · {formatPeriodo(u.periodo_inicio, u.periodo_fim)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {u.status === 'parsed' && (
                      <>
                        <p className="text-sm font-semibold text-emerald-400">{formatBRL(saldo)}</p>
                        <p className="text-xs text-slate-500">saldo credor</p>
                      </>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-500 transition-colors shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
