'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  User, Building2, Mail, Phone, MapPin, FileText,
  Shield, Save, CheckCircle, AlertTriangle, Loader2,
  Lock, Bell, CreditCard, ChevronRight, ToggleLeft, ToggleRight,
  Key, SlidersHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrilhoTab } from '@/components/perfil/trilho-tab'

/* ── Types ─────────────────────────────────────────────────────── */

interface AddressFields {
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

interface NotifSettings {
  email_matching: boolean
  email_operacoes: boolean
  email_newsletter: boolean
  whatsapp_matching: boolean
  whatsapp_operacoes: boolean
}

interface ProfileData {
  // Conta
  full_name: string
  email: string
  phone: string
  cpf: string
  role: string
  // Dados pessoais (metadata)
  rg_numero: string
  rg_orgao: string
  rg_data_emissao: string
  data_nascimento: string
  estado_civil: string
  nacionalidade: string
  pep: boolean
  // Endereço pessoal (metadata.address)
  address: AddressFields
  // Empresa
  razao_social: string
  nome_fantasia: string
  cnpj: string
  inscricao_estadual: string
  company_phone: string
  company_email: string
  company_address: AddressFields
  // Notificações (metadata.notifications)
  notifications: NotifSettings
}

const EMPTY_ADDRESS: AddressFields = {
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: ''
}

const EMPTY_NOTIF: NotifSettings = {
  email_matching: true, email_operacoes: true, email_newsletter: false,
  whatsapp_matching: false, whatsapp_operacoes: false
}

type Tab = 'conta' | 'pessoal' | 'endereco' | 'empresa' | 'seguranca' | 'notificacoes' | 'trilho'

/* ── Helpers ────────────────────────────────────────────────────── */

function maskCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

function maskCEP(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d{1,3})/, '$1-$2')
}

/* ── Sub-components ─────────────────────────────────────────────── */

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-600">{hint}</p>}
    </div>
  )
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full px-3 py-2.5 rounded-xl bg-dark-700 border border-dark-500/50 text-sm text-white',
        'placeholder-slate-600 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
}

function SaveBar({ saving, saved, onSave }: { saving: boolean; saved: boolean; onSave: () => void }) {
  return (
    <div className="flex items-center justify-end pt-4 border-t border-dark-600/50">
      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-sm font-medium transition-all shadow-lg shadow-brand-600/25"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle size={15} /> : <Save size={15} />}
        {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar alterações'}
      </button>
    </div>
  )
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-3 px-4 rounded-xl bg-dark-700/50 hover:bg-dark-700 border border-dark-500/30 transition-all text-left"
    >
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      {checked
        ? <ToggleRight size={22} className="text-brand-400 flex-shrink-0" />
        : <ToggleLeft size={22} className="text-slate-600 flex-shrink-0" />}
    </button>
  )
}

/* ── Address block (reusable) ───────────────────────────────────── */

function AddressBlock({ values, onChange }: {
  values: AddressFields
  onChange: (v: Partial<AddressFields>) => void
}) {
  const [fetchingCep, setFetchingCep] = useState(false)

  async function fillCep(rawCep: string) {
    const cep = rawCep.replace(/\D/g, '')
    if (cep.length !== 8) return
    setFetchingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        onChange({
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          uf: data.uf || '',
        })
      }
    } finally {
      setFetchingCep(false)
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="CEP">
        <div className="relative">
          <Input
            value={values.cep}
            placeholder="00000-000"
            onChange={e => {
              const v = maskCEP(e.target.value)
              onChange({ cep: v })
            }}
            onBlur={e => fillCep(e.target.value)}
          />
          {fetchingCep && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-brand-400" />
          )}
        </div>
      </Field>

      <Field label="Logradouro" >
        <Input value={values.logradouro} placeholder="Rua, Av., etc." onChange={e => onChange({ logradouro: e.target.value })} />
      </Field>

      <Field label="Número">
        <Input value={values.numero} placeholder="123" onChange={e => onChange({ numero: e.target.value })} />
      </Field>

      <Field label="Complemento">
        <Input value={values.complemento} placeholder="Apto, Sala..." onChange={e => onChange({ complemento: e.target.value })} />
      </Field>

      <Field label="Bairro">
        <Input value={values.bairro} placeholder="Bairro" onChange={e => onChange({ bairro: e.target.value })} />
      </Field>

      <Field label="Cidade">
        <Input value={values.cidade} placeholder="Cidade" onChange={e => onChange({ cidade: e.target.value })} />
      </Field>

      <Field label="UF">
        <Input value={values.uf} placeholder="SP" maxLength={2} onChange={e => onChange({ uf: e.target.value.toUpperCase() })} />
      </Field>
    </div>
  )
}

/* ── Main page ──────────────────────────────────────────────────── */

export default function PerfilPage() {
  const [activeTab, setActiveTab] = useState<Tab>('conta')
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '', email: '', phone: '', cpf: '', role: '',
    rg_numero: '', rg_orgao: '', rg_data_emissao: '', data_nascimento: '',
    estado_civil: '', nacionalidade: 'Brasileira', pep: false,
    address: { ...EMPTY_ADDRESS },
    razao_social: '', nome_fantasia: '', cnpj: '', inscricao_estadual: '',
    company_phone: '', company_email: '',
    company_address: { ...EMPTY_ADDRESS },
    notifications: { ...EMPTY_NOTIF },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  /* Fetch existing data */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) return
        const data = await res.json()
        const meta = data.profile?.metadata || {}
        const compAddr = data.company?.address || {}

        setProfile(prev => ({
          ...prev,
          full_name: data.profile?.full_name || '',
          email: data.profile?.email || '',
          phone: data.profile?.phone || '',
          cpf: data.profile?.cpf || '',
          role: data.profile?.role || '',
          // metadata fields
          rg_numero: meta.rg_numero || '',
          rg_orgao: meta.rg_orgao || '',
          rg_data_emissao: meta.rg_data_emissao || '',
          data_nascimento: meta.data_nascimento || '',
          estado_civil: meta.estado_civil || '',
          nacionalidade: meta.nacionalidade || 'Brasileira',
          pep: meta.pep || false,
          address: meta.address || { ...EMPTY_ADDRESS },
          notifications: meta.notifications || { ...EMPTY_NOTIF },
          // company
          razao_social: data.company?.razao_social || '',
          nome_fantasia: data.company?.nome_fantasia || '',
          cnpj: data.company?.cnpj || '',
          inscricao_estadual: data.company?.inscricao_estadual || '',
          company_phone: data.company?.phone || '',
          company_email: data.company?.email || '',
          company_address: {
            cep: compAddr.cep || '',
            logradouro: compAddr.logradouro || '',
            numero: compAddr.numero || '',
            complemento: compAddr.complemento || '',
            bairro: compAddr.bairro || '',
            cidade: compAddr.cidade || '',
            uf: compAddr.uf || '',
          },
        }))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  /* Per-tab save */
  async function saveTab() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      let body: Record<string, unknown> = {}

      switch (activeTab) {
        case 'conta':
          body = {
            profile: {
              full_name: profile.full_name,
              phone: profile.phone,
              cpf: profile.cpf,
            }
          }
          break
        case 'pessoal':
          body = {
            profile: {
              metadata: {
                rg_numero: profile.rg_numero,
                rg_orgao: profile.rg_orgao,
                rg_data_emissao: profile.rg_data_emissao,
                data_nascimento: profile.data_nascimento,
                estado_civil: profile.estado_civil,
                nacionalidade: profile.nacionalidade,
                pep: profile.pep,
              }
            }
          }
          break
        case 'endereco':
          body = {
            profile: { metadata: { address: profile.address } }
          }
          break
        case 'empresa':
          body = {
            company: {
              nome_fantasia: profile.nome_fantasia,
              phone: profile.company_phone,
              email: profile.company_email,
              address: profile.company_address,
            }
          }
          break
        case 'notificacoes':
          body = {
            profile: { metadata: { notifications: profile.notifications } }
          }
          break
        default:
          return
      }

      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Erro ao salvar')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  async function sendResetEmail() {
    setResetLoading(true)
    try {
      await fetch('/api/auth/send-reset-email', { method: 'POST' })
      setResetSent(true)
    } finally {
      setResetLoading(false)
    }
  }

  function upd(field: keyof ProfileData, value: unknown) {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  /* ── Tabs config ── */
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'conta',        label: 'Conta',          icon: User },
    { id: 'pessoal',      label: 'Dados Pessoais', icon: FileText },
    { id: 'endereco',     label: 'Endereço',       icon: MapPin },
    { id: 'empresa',      label: 'Empresa',        icon: Building2 },
    { id: 'trilho',       label: 'Trilho',         icon: Train },
    { id: 'seguranca',    label: 'Segurança',      icon: Shield },
    { id: 'notificacoes', label: 'Notificações',   icon: Bell },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-brand-400" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SlidersHorizontal size={22} className="text-brand-400" />
          Configurações
        </h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie sua conta, dados pessoais e preferências</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar tabs — desktop */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <nav className="space-y-0.5 sticky top-20">
            {tabs.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                    activeTab === t.id
                      ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20'
                      : 'text-slate-400 hover:bg-dark-700 hover:text-white border border-transparent'
                  )}
                >
                  <Icon size={16} />
                  {t.label}
                  {activeTab === t.id && <ChevronRight size={14} className="ml-auto" />}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Mobile tabs — horizontal scroll */}
        <div className="lg:hidden -mx-3 px-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {tabs.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all',
                    activeTab === t.id
                      ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                      : 'text-slate-400 bg-dark-700 border border-dark-500/30'
                  )}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-dark-800 rounded-2xl border border-dark-500/40 p-5 lg:p-6 space-y-5">

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertTriangle size={15} />
                {error}
              </div>
            )}

            {/* ── TAB: Conta ── */}
            {activeTab === 'conta' && (
              <>
                <div>
                  <h2 className="text-base font-semibold text-white mb-4">Informações da Conta</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nome completo">
                      <Input value={profile.full_name} placeholder="Seu nome" onChange={e => upd('full_name', e.target.value)} />
                    </Field>
                    <Field label="E-mail" hint="Não é possível alterar o e-mail. Entre em contato com o suporte.">
                      <Input value={profile.email} disabled />
                    </Field>
                    <Field label="Telefone / WhatsApp">
                      <Input
                        value={profile.phone}
                        placeholder="(11) 99999-9999"
                        onChange={e => upd('phone', maskPhone(e.target.value))}
                      />
                    </Field>
                    <Field label="CPF" hint="Usado para verificação de identidade (KYC).">
                      <Input
                        value={profile.cpf}
                        placeholder="000.000.000-00"
                        onChange={e => upd('cpf', maskCPF(e.target.value))}
                      />
                    </Field>
                  </div>
                </div>
                <SaveBar saving={saving} saved={saved} onSave={saveTab} />
              </>
            )}

            {/* ── TAB: Dados Pessoais ── */}
            {activeTab === 'pessoal' && (
              <>
                <div>
                  <h2 className="text-base font-semibold text-white mb-1">Dados Pessoais</h2>
                  <p className="text-xs text-slate-500 mb-4">Informações exigidas para verificação KYC e assinatura de contratos.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Field label="Data de Nascimento">
                      <Input type="date" value={profile.data_nascimento} onChange={e => upd('data_nascimento', e.target.value)} />
                    </Field>
                    <Field label="Nacionalidade">
                      <Input value={profile.nacionalidade} placeholder="Brasileira" onChange={e => upd('nacionalidade', e.target.value)} />
                    </Field>
                    <Field label="Estado Civil">
                      <select
                        value={profile.estado_civil}
                        onChange={e => upd('estado_civil', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-dark-700 border border-dark-500/50 text-sm text-white focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                      >
                        <option value="">Selecione...</option>
                        <option value="solteiro">Solteiro(a)</option>
                        <option value="casado">Casado(a)</option>
                        <option value="uniao_estavel">União Estável</option>
                        <option value="divorciado">Divorciado(a)</option>
                        <option value="viuvo">Viúvo(a)</option>
                      </select>
                    </Field>
                    <Field label="RG — Número">
                      <Input value={profile.rg_numero} placeholder="00.000.000-0" onChange={e => upd('rg_numero', e.target.value)} />
                    </Field>
                    <Field label="RG — Órgão Emissor">
                      <Input value={profile.rg_orgao} placeholder="SSP/SP" onChange={e => upd('rg_orgao', e.target.value)} />
                    </Field>
                    <Field label="RG — Data de Emissão">
                      <Input type="date" value={profile.rg_data_emissao} onChange={e => upd('rg_data_emissao', e.target.value)} />
                    </Field>
                  </div>

                  {/* PEP */}
                  <div className="mt-5 p-4 rounded-xl bg-dark-700/50 border border-dark-500/30">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.pep}
                        onChange={e => upd('pep', e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-brand-500 rounded"
                      />
                      <div>
                        <p className="text-sm font-medium text-white">Sou Pessoa Politicamente Exposta (PEP)</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Inclui agentes públicos, dirigentes de partidos, executivos de estatais e seus familiares diretos.
                          Declaração obrigatória por exigência do COAF (Res. CVM 50/2021).
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
                <SaveBar saving={saving} saved={saved} onSave={saveTab} />
              </>
            )}

            {/* ── TAB: Endereço ── */}
            {activeTab === 'endereco' && (
              <>
                <div>
                  <h2 className="text-base font-semibold text-white mb-1">Endereço Pessoal</h2>
                  <p className="text-xs text-slate-500 mb-4">Preencha o CEP para auto-completar os demais campos.</p>
                  <AddressBlock
                    values={profile.address}
                    onChange={v => upd('address', { ...profile.address, ...v })}
                  />
                </div>
                <SaveBar saving={saving} saved={saved} onSave={saveTab} />
              </>
            )}

            {/* ── TAB: Empresa ── */}
            {activeTab === 'empresa' && (
              <>
                <div>
                  <h2 className="text-base font-semibold text-white mb-4">Dados da Empresa</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <Field label="Razão Social" hint="Não editável — altere via suporte.">
                      <Input value={profile.razao_social} disabled />
                    </Field>
                    <Field label="Nome Fantasia">
                      <Input value={profile.nome_fantasia} placeholder="Nome Fantasia" onChange={e => upd('nome_fantasia', e.target.value)} />
                    </Field>
                    <Field label="CNPJ" hint="Não editável após o cadastro.">
                      <Input value={profile.cnpj} disabled />
                    </Field>
                    <Field label="Inscrição Estadual" hint="Não editável — altere via suporte.">
                      <Input value={profile.inscricao_estadual} disabled />
                    </Field>
                    <Field label="Telefone Empresarial">
                      <Input value={profile.company_phone} placeholder="(11) 3000-0000" onChange={e => upd('company_phone', maskPhone(e.target.value))} />
                    </Field>
                    <Field label="E-mail Empresarial">
                      <Input value={profile.company_email} placeholder="contato@empresa.com.br" type="email" onChange={e => upd('company_email', e.target.value)} />
                    </Field>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Endereço da Empresa</h3>
                  <AddressBlock
                    values={profile.company_address}
                    onChange={v => upd('company_address', { ...profile.company_address, ...v })}
                  />
                </div>
                <SaveBar saving={saving} saved={saved} onSave={saveTab} />
              </>
            )}

            {/* ── TAB: Segurança ── */}
            {activeTab === 'seguranca' && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-white">Segurança da Conta</h2>

                <div className="p-4 rounded-xl bg-dark-700/50 border border-dark-500/30">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-600/15 flex items-center justify-center flex-shrink-0">
                      <Key size={18} className="text-brand-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Redefinir Senha</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Enviaremos um link seguro para o seu e-mail cadastrado para que você possa criar uma nova senha.
                      </p>
                      {resetSent ? (
                        <div className="mt-3 flex items-center gap-2 text-sm text-green-400">
                          <CheckCircle size={15} />
                          Link enviado! Verifique sua caixa de entrada.
                        </div>
                      ) : (
                        <button
                          onClick={sendResetEmail}
                          disabled={resetLoading}
                          className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-600 hover:bg-dark-500 border border-dark-400/40 text-sm text-white transition-all disabled:opacity-60"
                        >
                          {resetLoading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                          Enviar link de redefinição
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-dark-700/50 border border-dark-500/30">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-600/15 flex items-center justify-center flex-shrink-0">
                      <Shield size={18} className="text-accent-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Sessões Ativas</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Gerencie os dispositivos conectados à sua conta.
                        Em caso de acesso suspeito, redefina sua senha imediatamente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: Notificações ── */}
            {activeTab === 'notificacoes' && (
              <>
                <div className="space-y-3">
                  <h2 className="text-base font-semibold text-white mb-4">Preferências de Notificação</h2>

                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Por E-mail</p>
                  <Toggle
                    checked={profile.notifications.email_matching}
                    onChange={v => upd('notifications', { ...profile.notifications, email_matching: v })}
                    label="Novo matching encontrado"
                    description="Receba um e-mail quando houver uma oportunidade compatível com seu perfil."
                  />
                  <Toggle
                    checked={profile.notifications.email_operacoes}
                    onChange={v => upd('notifications', { ...profile.notifications, email_operacoes: v })}
                    label="Atualizações de operações"
                    description="Propostas aceitas, contratos enviados e transferências realizadas."
                  />
                  <Toggle
                    checked={profile.notifications.email_newsletter}
                    onChange={v => upd('notifications', { ...profile.notifications, email_newsletter: v })}
                    label="Newsletter e novidades"
                    description="Conteúdo sobre o mercado de créditos de ICMS e atualizações da plataforma."
                  />

                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider pt-2">Por WhatsApp</p>
                  <Toggle
                    checked={profile.notifications.whatsapp_matching}
                    onChange={v => upd('notifications', { ...profile.notifications, whatsapp_matching: v })}
                    label="Alertas de matching"
                    description="Aviso imediato via WhatsApp quando surgir uma oportunidade."
                  />
                  <Toggle
                    checked={profile.notifications.whatsapp_operacoes}
                    onChange={v => upd('notifications', { ...profile.notifications, whatsapp_operacoes: v })}
                    label="Status de operações"
                    description="Confirmações e alertas importantes sobre suas transações."
                  />
                </div>
                <SaveBar saving={saving} saved={saved} onSave={saveTab} />
              </>
            )}

          {activeTab === 'trilho' && <TrilhoTab />}

          </div>
        </div>
      </div>
    </div>
  )
}
