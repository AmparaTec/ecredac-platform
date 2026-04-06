'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Shield, Upload, FileText, Check, X, AlertTriangle, Clock,
  ChevronDown, ChevronUp, Loader2, Trash2, Send, Building2, User
} from 'lucide-react'
import { cn } from '@/lib/utils'

type KycStatus = 'pendente' | 'em_analise' | 'aprovado' | 'reprovado' | 'expirado'
type DocStatus = 'enviado' | 'aprovado' | 'reprovado' | 'expirado'

interface KycProfile {
  id: string
  status: KycStatus
  razao_social: string
  cnpj: string
  inscricao_estadual: string
  endereco_completo: string
  cep: string
  cidade: string
  uf: string
  nome_representante: string
  cpf_representante: string
  cargo_representante: string
  faturamento_anual_declarado: number | null
  setor_atividade: string
  cnae_principal: string
  pep: boolean
  pep_descricao: string
  risk_score: number
  rejection_reason: string | null
  reviewed_at: string | null
  expires_at: string | null
}

interface KycDocument {
  id: string
  doc_type: string
  status: DocStatus
  file_name: string
  file_size: number
  rejection_reason: string | null
  created_at: string
}

const DOC_TYPES = [
  { value: 'contrato_social', label: 'Contrato Social / Ato Constitutivo', required: true },
  { value: 'cartao_cnpj', label: 'Cartão CNPJ', required: true },
  { value: 'inscricao_estadual', label: 'Inscrição Estadual', required: true },
  { value: 'comprovante_endereco', label: 'Comprovante de Endereço', required: true },
  { value: 'documento_identidade_socio', label: 'Documento do Sócio/Representante (RG/CNH)', required: true },
  { value: 'certidao_negativa_federal', label: 'Certidão Negativa Federal', required: false },
  { value: 'certidao_negativa_estadual', label: 'Certidão Negativa Estadual', required: false },
  { value: 'certidao_negativa_municipal', label: 'Certidão Negativa Municipal', required: false },
  { value: 'balanco_patrimonial', label: 'Balanço Patrimonial', required: false },
  { value: 'dre', label: 'DRE — Demonstração de Resultado', required: false },
  { value: 'procuracao', label: 'Procuração (se aplicável)', required: false },
  { value: 'outro', label: 'Outro Documento', required: false },
]

const STATUS_CONFIG: Record<KycStatus, { label: string; color: string; icon: typeof Check }> = {
  pendente: { label: 'Pendente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Clock },
  em_analise: { label: 'Em Análise', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: Check },
  reprovado: { label: 'Reprovado', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: X },
  expirado: { label: 'Expirado', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: AlertTriangle },
}

export default function KYCPage() {
  const [kyc, setKyc] = useState<KycProfile | null>(null)
  const [documents, setDocuments] = useState<KycDocument[]>([])
  const [company, setCompany] = useState<Record<string, string> | null>(null)
  const [companyId, setCompanyId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedDocType, setSelectedDocType] = useState('contrato_social')

  // Form fields
  const [form, setForm] = useState({
    razao_social: '',
    cnpj: '',
    inscricao_estadual: '',
    endereco_completo: '',
    cep: '',
    cidade: '',
    uf: '',
    nome_representante: '',
    cpf_representante: '',
    cargo_representante: '',
    faturamento_anual_declarado: '',
    setor_atividade: '',
    cnae_principal: '',
    pep: false,
    pep_descricao: '',
  })

  const fetchKyc = useCallback(async () => {
    try {
      const res = await fetch('/api/compliance/kyc')
      const data = await res.json()
      setKyc(data.kyc)
      setDocuments(data.documents || [])
      setCompany(data.company)
      setCompanyId(data.companyId)

      // Pré-preencher formulário
      if (data.kyc) {
        setForm({
          razao_social: data.kyc.razao_social || data.company?.legal_name || '',
          cnpj: data.kyc.cnpj || data.company?.cnpj || '',
          inscricao_estadual: data.kyc.inscricao_estadual || data.company?.inscricao_estadual || '',
          endereco_completo: data.kyc.endereco_completo || '',
          cep: data.kyc.cep || data.company?.address_zip || '',
          cidade: data.kyc.cidade || data.company?.address_city || '',
          uf: data.kyc.uf || data.company?.address_state || '',
          nome_representante: data.kyc.nome_representante || '',
          cpf_representante: data.kyc.cpf_representante || '',
          cargo_representante: data.kyc.cargo_representante || '',
          faturamento_anual_declarado: data.kyc.faturamento_anual_declarado?.toString() || '',
          setor_atividade: data.kyc.setor_atividade || '',
          cnae_principal: data.kyc.cnae_principal || '',
          pep: data.kyc.pep || false,
          pep_descricao: data.kyc.pep_descricao || '',
        })
      } else if (data.company) {
        setForm(f => ({
          ...f,
          razao_social: data.company.legal_name || '',
          cnpj: data.company.cnpj || '',
          inscricao_estadual: data.company.inscricao_estadual || '',
          cep: data.company.address_zip || '',
          cidade: data.company.address_city || '',
          uf: data.company.address_state || '',
        }))
      }
    } catch {
      setError('Erro ao carregar dados KYC')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKyc() }, [fetchKyc])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/compliance/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          faturamento_anual_declarado: form.faturamento_anual_declarado
            ? parseFloat(form.faturamento_anual_declarado)
            : null,
        }),
      })
      const data = await res.json()
      if (data.kyc) {
        setKyc(data.kyc)
        setSuccess('Dados salvos com sucesso!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Erro ao salvar')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    if (!kyc) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/compliance/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kyc_id: kyc.id, action: 'submit' }),
      })
      const data = await res.json()
      if (data.ok) {
        setKyc({ ...kyc, status: 'em_analise' })
        setSuccess('KYC enviado para análise!')
      } else {
        setError(data.error || 'Erro ao submeter')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !kyc) return
    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('doc_type', selectedDocType)
    formData.append('kyc_profile_id', kyc.id)

    try {
      const res = await fetch('/api/compliance/kyc/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.document) {
        setDocuments(prev => [data.document, ...prev])
        setSuccess('Documento enviado!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Erro ao enviar documento')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setUploading(false)
      e.target.value = '' // reset file input
    }
  }

  async function handleDeleteDoc(docId: string) {
    try {
      const res = await fetch('/api/compliance/kyc/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: docId }),
      })
      const data = await res.json()
      if (data.ok) {
        setDocuments(prev => prev.filter(d => d.id !== docId))
      }
    } catch {
      setError('Erro ao remover documento')
    }
  }

  const requiredDocs = DOC_TYPES.filter(d => d.required)
  const uploadedTypes = new Set(documents.filter(d => d.status !== 'reprovado').map(d => d.doc_type))
  const missingRequired = requiredDocs.filter(d => !uploadedTypes.has(d.value))
  const canSubmit = kyc && kyc.status === 'pendente' && missingRequired.length === 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-brand-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Shield size={28} className="text-brand-400" />
            Verificação KYC
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Know Your Customer — Preencha os dados e envie a documentação para verificação.
          </p>
        </div>
        {kyc && (
          <div className={cn(
            'px-4 py-2 rounded-xl border text-sm font-bold flex items-center gap-2',
            STATUS_CONFIG[kyc.status].color
          )}>
            {(() => { const Icon = STATUS_CONFIG[kyc.status].icon; return <Icon size={14} /> })()}
            {STATUS_CONFIG[kyc.status].label}
          </div>
        )}
      </div>

      {/* Rejection reason */}
      {kyc?.status === 'reprovado' && kyc.rejection_reason && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-400 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-400">KYC Reprovado</p>
            <p className="text-sm text-slate-300 mt-1">{kyc.rejection_reason}</p>
            <p className="text-xs text-slate-500 mt-2">Corrija os dados e documentos, depois reenvie para análise.</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2 text-sm text-emerald-400">
          <Check size={14} /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* === SEÇÃO 1: Dados Cadastrais === */}
      <div className="bg-dark-800/50 border border-dark-500/30 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full flex items-center justify-between p-5 hover:bg-dark-700/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Building2 size={18} className="text-brand-400" />
            <span className="text-sm font-bold text-white">Dados Cadastrais da Empresa</span>
            {kyc && <span className="text-xs text-slate-500">({kyc.razao_social || 'Incompleto'})</span>}
          </div>
          {showForm ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {showForm && (
          <div className="p-5 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Razão Social *</label>
                <input value={form.razao_social} onChange={e => setForm({ ...form, razao_social: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CNPJ *</label>
                <input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inscrição Estadual</label>
                <input value={form.inscricao_estadual} onChange={e => setForm({ ...form, inscricao_estadual: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CNAE Principal</label>
                <input value={form.cnae_principal} onChange={e => setForm({ ...form, cnae_principal: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Endereço Completo *</label>
              <input value={form.endereco_completo} onChange={e => setForm({ ...form, endereco_completo: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CEP</label>
                <input value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cidade</label>
                <input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">UF</label>
                <input value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value })} maxLength={2}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all uppercase" />
              </div>
            </div>

            {/* Representante Legal */}
            <div className="pt-3 border-t border-dark-500/30">
              <div className="flex items-center gap-2 mb-3">
                <User size={14} className="text-brand-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Representante Legal</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Nome Completo *</label>
                  <input value={form.nome_representante} onChange={e => setForm({ ...form, nome_representante: e.target.value })}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">CPF *</label>
                  <input value={form.cpf_representante} onChange={e => setForm({ ...form, cpf_representante: e.target.value })}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Cargo</label>
                  <input value={form.cargo_representante} onChange={e => setForm({ ...form, cargo_representante: e.target.value })}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all" />
                </div>
              </div>
            </div>

            {/* PEP */}
            <div className="pt-3 border-t border-dark-500/30">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.pep} onChange={e => setForm({ ...form, pep: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-500 bg-dark-600 text-brand-500 focus:ring-brand-500" />
                <span className="text-sm text-white">Pessoa Politicamente Exposta (PEP) — algum sócio ou representante é PEP?</span>
              </label>
              {form.pep && (
                <input value={form.pep_descricao} onChange={e => setForm({ ...form, pep_descricao: e.target.value })}
                  placeholder="Descreva o vínculo político..."
                  className="mt-2 w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all" />
              )}
            </div>

            {/* Faturamento */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Setor de Atividade</label>
                <input value={form.setor_atividade} onChange={e => setForm({ ...form, setor_atividade: e.target.value })}
                  placeholder="Ex: Indústria, Comércio, Serviços..."
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Faturamento Anual (R$)</label>
                <input value={form.faturamento_anual_declarado} onChange={e => setForm({ ...form, faturamento_anual_declarado: e.target.value })}
                  type="number" placeholder="0.00"
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all" />
              </div>
            </div>

            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Salvando...' : 'Salvar Dados'}
            </button>
          </div>
        )}
      </div>

      {/* === SEÇÃO 2: Documentos === */}
      <div className="bg-dark-800/50 border border-dark-500/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-brand-400" />
            <span className="text-sm font-bold text-white">Documentos</span>
          </div>
          <span className="text-xs text-slate-500">
            {documents.length} enviado{documents.length !== 1 ? 's' : ''}
            {missingRequired.length > 0 && ` · ${missingRequired.length} obrigatório${missingRequired.length !== 1 ? 's' : ''} faltando`}
          </span>
        </div>

        {/* Required docs checklist */}
        {missingRequired.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-400 mb-2">Documentos obrigatórios pendentes:</p>
            <div className="space-y-1">
              {missingRequired.map(d => (
                <div key={d.value} className="flex items-center gap-2 text-xs text-slate-400">
                  <X size={10} className="text-red-400" />
                  {d.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload area */}
        {kyc && ['pendente', 'reprovado'].includes(kyc.status) && (
          <div className="flex items-center gap-3">
            <select value={selectedDocType} onChange={e => setSelectedDocType(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl bg-dark-600 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all">
              {DOC_TYPES.map(d => (
                <option key={d.value} value={d.value}>
                  {d.label} {d.required ? '*' : ''}
                </option>
              ))}
            </select>
            <label className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all',
              uploading ? 'bg-dark-600 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white'
            )}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Enviando...' : 'Enviar'}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
        )}

        {/* Document list */}
        {documents.length > 0 && (
          <div className="space-y-2">
            {documents.map(doc => {
              const docLabel = DOC_TYPES.find(d => d.value === doc.doc_type)?.label || doc.doc_type
              return (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-dark-700/30 rounded-xl border border-dark-500/20">
                  <FileText size={16} className="text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{docLabel}</p>
                    <p className="text-xs text-slate-500">{doc.file_name} · {(doc.file_size / 1024).toFixed(0)} KB</p>
                    {doc.rejection_reason && (
                      <p className="text-xs text-red-400 mt-1">Motivo: {doc.rejection_reason}</p>
                    )}
                  </div>
                  <span className={cn(
                    'text-xs font-bold px-2 py-1 rounded-lg',
                    doc.status === 'aprovado' ? 'text-emerald-400 bg-emerald-500/10' :
                    doc.status === 'reprovado' ? 'text-red-400 bg-red-500/10' :
                    doc.status === 'expirado' ? 'text-slate-400 bg-slate-500/10' :
                    'text-blue-400 bg-blue-500/10'
                  )}>
                    {doc.status === 'enviado' ? 'Pendente' : doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                  </span>
                  {['enviado', 'reprovado'].includes(doc.status) && (
                    <button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 rounded-lg hover:bg-dark-600 text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* === BOTÃO SUBMETER === */}
      {kyc && kyc.status === 'pendente' && (
        <div className="flex items-center justify-between p-5 bg-dark-800/50 border border-dark-500/30 rounded-2xl">
          <div>
            <p className="text-sm font-bold text-white">Pronto para enviar?</p>
            <p className="text-xs text-slate-400 mt-1">
              {canSubmit
                ? 'Todos os documentos obrigatórios foram enviados. Clique para submeter à análise.'
                : `Faltam ${missingRequired.length} documento(s) obrigatório(s).`}
            </p>
          </div>
          <button onClick={handleSubmit} disabled={!canSubmit || submitting}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all',
              canSubmit ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-dark-600 text-slate-500 cursor-not-allowed'
            )}>
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {submitting ? 'Enviando...' : 'Submeter para Análise'}
          </button>
        </div>
      )}

      {kyc?.status === 'em_analise' && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 text-center">
          <Clock size={24} className="text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-blue-400">KYC em Análise</p>
          <p className="text-xs text-slate-400 mt-1">
            Seus dados e documentos estão sendo analisados pela equipe de compliance. Você será notificado quando o processo for concluído.
          </p>
        </div>
      )}

      {kyc?.status === 'aprovado' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-center">
          <Check size={24} className="text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-emerald-400">KYC Aprovado</p>
          <p className="text-xs text-slate-400 mt-1">
            Sua empresa está verificada e habilitada para operar na plataforma.
            {kyc.expires_at && ` Validade: ${new Date(kyc.expires_at).toLocaleDateString('pt-BR')}`}
          </p>
        </div>
      )}
    </div>
  )
}
