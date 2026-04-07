'use client'

import { useState, useCallback, useRef } from 'react'
import {
  FileUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileText,
  Shield,
  TrendingUp,
  Download,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────────
interface CruzamentoResult {
  id?: string
  chave: string
  status: string
  valorIcms?: number
  divergencia?: boolean
  errors?: string[]
  warnings?: string[]
}

interface ProcessingResult {
  total: number
  processados: number
  erros: number
  cruzamentos: CruzamentoResult[]
  resumo: {
    autorizadas: number
    canceladas: number
    denegadas: number
    naoEncontradas: number
    erroSefaz: number
    comDivergencia: number
    valorTotalIcms: number
  }
}

interface CruzamentoRow {
  id: string
  chave_nfe: string
  numero_nfe: string
  cnpj_emitente: string
  data_emissao: string
  valor_total: number
  valor_icms_declarado: number
  valor_icms_nfe: number
  sefaz_status: string
  divergencia_icms: boolean
  divergencia_detalhes: string | null
  natureza_operacao: string
  uf_emitente: string
  created_at: string
}

// ─── Constants ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  autorizada:      { label: 'Autorizada',      color: 'text-green-600 bg-green-50',  icon: CheckCircle2 },
  cancelada:       { label: 'Cancelada',       color: 'text-red-600 bg-red-50',      icon: XCircle },
  denegada:        { label: 'Denegada',        color: 'text-red-600 bg-red-50',      icon: XCircle },
  nao_encontrada:  { label: 'Não Encontrada',  color: 'text-yellow-600 bg-yellow-50', icon: AlertTriangle },
  pendente:        { label: 'Pendente',        color: 'text-gray-600 bg-gray-50',    icon: Clock },
  erro:            { label: 'Erro',            color: 'text-red-600 bg-red-50',      icon: XCircle },
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatCnpj(cnpj: string): string {
  if (!cnpj || cnpj.length !== 14) return cnpj || '-'
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

// ─── Upload Zone ────────────────────────────────────────────────────────────────
function UploadZone({
  onFilesSelected,
  isProcessing,
}: {
  onFilesSelected: (files: File[]) => void
  isProcessing: boolean
}) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files).filter(
        f => f.name.endsWith('.xml') || f.type === 'text/xml'
      )
      if (files.length > 0) onFilesSelected(files)
    },
    [onFilesSelected]
  )

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <FileUp className="w-12 h-12 mx-auto mb-3 text-gray-400" />
      <p className="text-lg font-medium text-gray-700">
        Arraste arquivos NF-e XML aqui
      </p>
      <p className="text-sm text-gray-500 mt-1">
        ou clique para selecionar. Aceita múltiplos arquivos .xml
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml"
        multiple
        className="hidden"
        onChange={e => {
          const files = Array.from(e.target.files || [])
          if (files.length > 0) onFilesSelected(files)
        }}
      />
    </div>
  )
}

// ─── Stats Cards ────────────────────────────────────────────────────────────────
function StatsCards({ summary }: { summary: ProcessingResult['resumo'] | null }) {
  if (!summary) return null

  const cards = [
    { label: 'Autorizadas', value: summary.autorizadas, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Divergências', value: summary.comDivergencia, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Canceladas/Denegadas', value: summary.canceladas + summary.denegadas, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'ICMS Total', value: formatCurrency(summary.valorTotalIcms), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.label} className={`${card.bg} rounded-xl p-4 flex items-center gap-3`}>
          <card.icon className={`w-8 h-8 ${card.color}`} />
          <div>
            <p className="text-sm text-gray-600">{card.label}</p>
            <p className={`text-xl font-bold ${card.color}`}>
              {typeof card.value === 'number' ? card.value : card.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Result Row ─────────────────────────────────────────────────────────────────
function ResultRow({ item }: { item: CruzamentoResult }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.erro
  const Icon = cfg.icon

  return (
    <div className="border rounded-lg mb-2 overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
        <span className="font-mono text-xs text-gray-600 truncate flex-1">
          {item.chave}
        </span>
        {item.valorIcms !== undefined && (
          <span className="text-sm font-medium text-gray-700">
            {formatCurrency(item.valorIcms)}
          </span>
        )}
        {item.divergencia && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
            Divergente
          </span>
        )}
      </div>
      {expanded && (
        <div className="px-3 pb-3 pt-1 bg-gray-50 text-sm">
          {item.errors?.map((e, i) => (
            <p key={i} className="text-red-600">&#x2022; {e}</p>
          ))}
          {item.warnings?.map((w, i) => (
            <p key={i} className="text-yellow-600">&#x2022; {w}</p>
          ))}
          {!item.errors?.length && !item.warnings?.length && (
            <p className="text-gray-500">NF-e processada com sucesso</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── History Table ──────────────────────────────────────────────────────────────
function HistoryTable({ rows }: { rows: CruzamentoRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum cruzamento encontrado</p>
        <p className="text-sm">Faça upload de arquivos NF-e XML para começar</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left py-2 px-3 font-medium">NF-e</th>
            <th className="text-left py-2 px-3 font-medium">Emitente</th>
            <th className="text-left py-2 px-3 font-medium">UF</th>
            <th className="text-right py-2 px-3 font-medium">Valor Total</th>
            <th className="text-right py-2 px-3 font-medium">ICMS</th>
            <th className="text-center py-2 px-3 font-medium">SEFAZ</th>
            <th className="text-center py-2 px-3 font-medium">Divergência</th>
            <th className="text-left py-2 px-3 font-medium">Data</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const cfg = STATUS_CONFIG[row.sefaz_status] || STATUS_CONFIG.pendente
            const Icon = cfg.icon
            return (
              <tr key={row.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-3">
                  <span className="font-mono text-xs">{row.numero_nfe || '-'}</span>
                </td>
                <td className="py-2 px-3 text-xs">{formatCnpj(row.cnpj_emitente)}</td>
                <td className="py-2 px-3 text-xs font-medium">{row.uf_emitente || '-'}</td>
                <td className="py-2 px-3 text-right">{formatCurrency(row.valor_total || 0)}</td>
                <td className="py-2 px-3 text-right font-medium">{formatCurrency(row.valor_icms_declarado || 0)}</td>
                <td className="py-2 px-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${cfg.color}`}>
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                </td>
                <td className="py-2 px-3 text-center">
                  {row.divergencia_icms ? (
                    <span className="text-yellow-600 text-xs font-medium" title={row.divergencia_detalhes || ''}>
                      Sim
                    </span>
                  ) : (
                    <span className="text-green-600 text-xs">OK</span>
                  )}
                </td>
                <td className="py-2 px-3 text-xs text-gray-500">
                  {new Date(row.created_at).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function NfeCruzamentoPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null)
  const [history, setHistory] = useState<CruzamentoRow[]>([])
  const [activeTab, setActiveTab] = useState<'upload' | 'historico'>('upload')
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  // Load history
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/nfe-cruzamento?limit=100')
      if (res.ok) {
        const data = await res.json()
        setHistory(data.data || [])
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    }
  }, [])

  // Handle file upload
  const handleFiles = useCallback(async (files: File[]) => {
    setIsProcessing(true)
    setProcessingResult(null)
    setProgress({ current: 0, total: files.length })

    try {
      // Read XML files
      const xmlPromises = files.map(file =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsText(file)
        })
      )
      const xmlFiles = await Promise.all(xmlPromises)

      // Send to API
      const res = await fetch('/api/nfe-cruzamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xmlFiles,
          companyId: 'current', // Will be resolved server-side
        }),
      })

      if (!res.ok) {
        throw new Error(`Erro ${res.status}: ${await res.text()}`)
      }

      const result: ProcessingResult = await res.json()
      setProcessingResult(result)
      setProgress({ current: result.processados + result.erros, total: files.length })

      // Refresh history
      await loadHistory()
    } catch (err) {
      console.error('Erro no processamento:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [loadHistory])

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            Cruzamento NF-e × SEFAZ
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Valide NF-e contra a SEFAZ e cruze com créditos ICMS
          </p>
        </div>
        <button
          onClick={loadHistory}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Stats */}
      {processingResult && <StatsCards summary={processingResult.resumo} />}

      {/* Tabs */}
      <div className="mt-6 border-b">
        <div className="flex gap-6">
          {[
            { id: 'upload' as const, label: 'Upload NF-e', icon: FileUp },
            { id: 'historico' as const, label: 'Histórico', icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id === 'historico') loadHistory()
              }}
              className={`flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <UploadZone onFilesSelected={handleFiles} isProcessing={isProcessing} />

            {/* Progress */}
            {isProcessing && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="text-sm font-medium text-blue-700">
                    Processando... {progress.current}/{progress.total}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 rounded-full h-2 transition-all"
                    style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Results */}
            {processingResult && (
              <div className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    Resultado do Cruzamento
                  </h3>
                  <span className="text-sm text-gray-500">
                    {processingResult.processados} processadas, {processingResult.erros} erros
                  </span>
                </div>
                <div className="space-y-1">
                  {processingResult.cruzamentos.map((item, i) => (
                    <ResultRow key={i} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="bg-white border rounded-xl overflow-hidden">
            <HistoryTable rows={history} />
          </div>
        )}
      </div>
    </div>
  )
}
