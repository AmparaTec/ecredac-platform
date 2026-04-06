'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import {
  User, Building2, Mail, Phone, MapPin, FileText,
  Shield, Save, CheckCircle, AlertTriangle, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserProfile {
  id: string
  full_name: string
  cpf: string
  phone: string
  email: string
  role: string
  avatar_url: string | null
}

interface Company {
  id: string
  razao_social: string
  nome_fantasia: string
  cnpj: string
  inscricao_estadual: string
  email: string
  phone: string
  address_street: string
  address_number: string
  address_complement: string
  address_city: string
  address_state: string
  address_zip: string
  type: string
  sefaz_status: string
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'pessoal' | 'empresa'>('pessoal')

  // Form state
  const [formProfile, setFormProfile] = useState({
    full_name: '',
    phone: '',
  })
  const [formCompany, setFormCompany] = useState({
    nome_fantasia: '',
    email: '',
    phone: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_city: '',
    address_state: '',
    address_zip: '',
  })

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch via the existing dashboard data approach
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setProfile(data.profile)
          setCompany(data.company)
          if (data.profile) {
            setFormProfile({
              full_name: data.profile.full_name || '',
              phone: data.profile.phone || '',
            })
          }
          if (data.company) {
            setFormCompany({
              nome_fantasia: data.company.nome_fantasia || '',
              email: data.company.email || '',
              phone: data.company.phone || '',
              address_street: data.company.address_street || '',
              address_number: data.company.address_number || '',
              address_complement: data.company.address_complement || '',
              address_city: data.company.address_city || '',
              address_state: data.company.address_state || '',
              address_zip: data.company.address_zip || '',
            })
          }
        }
      } catch {
        setError('Erro ao carregar perfil')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: formProfile,
          company: formCompany,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-brand-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <User size={20} className="text-brand-400" />
          Configurações do Perfil
        </h1>
        <p className="text-sm text-slate-400 mt-1">Gerencie seus dados pessoais e da empresa</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-700 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('pessoal')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'pessoal' ? 'bg-brand-500/15 text-brand-400' : 'text-slate-400 hover:text-white'
          )}
        >
          <User size={14} className="inline mr-1.5" />
          Dados Pessoais
        </button>
        <button
          onClick={() => setTab('empresa')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'empresa' ? 'bg-brand-500/15 text-brand-400' : 'text-slate-400 hover:text-white'
          )}
        >
          <Building2 size={14} className="inline mr-1.5" />
          Dados da Empresa
        </button>
      </div>

      {/* Status bar */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle size={16} />
          Perfil atualizado com sucesso!
        </div>
      )}

      {/* Dados Pessoais */}
      {tab === 'pessoal' && (
        <Card className="p-6 space-y-5">
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">Nome Completo</label>
            <input
              value={formProfile.full_name}
              onChange={e => setFormProfile(p => ({ ...p, full_name: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-dark-700 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">E-mail</label>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-slate-500" />
              <span className="text-sm text-slate-300">{profile?.email || '—'}</span>
              <span className="text-[10px] text-slate-600 bg-dark-700 px-2 py-0.5 rounded">Não editável</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">CPF</label>
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-slate-500" />
              <span className="text-sm text-slate-300">{profile?.cpf || '—'}</span>
              <span className="text-[10px] text-slate-600 bg-dark-700 px-2 py-0.5 rounded">Não editável</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">Telefone / WhatsApp</label>
            <input
              value={formProfile.phone}
              onChange={e => setFormProfile(p => ({ ...p, phone: e.target.value }))}
              placeholder="(11) 99999-9999"
              className="w-full px-4 py-2.5 rounded-xl bg-dark-700 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">Função</label>
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-brand-400" />
              <span className={cn(
                'text-xs font-bold uppercase px-2.5 py-1 rounded-lg',
                profile?.role === 'titular' ? 'bg-brand-500/10 text-brand-400' :
                profile?.role === 'procurador' ? 'bg-accent-500/10 text-accent-400' :
                'bg-blue-500/10 text-blue-400'
              )}>
                {profile?.role === 'titular' ? 'Titular' :
                 profile?.role === 'procurador' ? 'Assessor (Procurador)' :
                 'Representante'}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Dados da Empresa */}
      {tab === 'empresa' && company && (
        <Card className="p-6 space-y-5">
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">Razão Social</label>
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-slate-500" />
              <span className="text-sm text-slate-300">{company.razao_social}</span>
              <span className="text-[10px] text-slate-600 bg-dark-700 px-2 py-0.5 rounded">Não editável</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">CNPJ</label>
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-slate-500" />
              <span className="text-sm text-slate-300">{company.cnpj}</span>
              <span className="text-[10px] text-slate-600 bg-dark-700 px-2 py-0.5 rounded">Não editável</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">Nome Fantasia</label>
            <input
              value={formCompany.nome_fantasia}
              onChange={e => setFormCompany(p => ({ ...p, nome_fantasia: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-dark-700 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">E-mail Comercial</label>
              <input
                value={formCompany.email}
                onChange={e => setFormCompany(p => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-dark-700 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">Telefone Comercial</label>
              <input
                value={formCompany.phone}
                onChange={e => setFormCompany(p => ({ ...p, phone: e.target.value }))}
                placeholder="(11) 3333-4444"
                className="w-full px-4 py-2.5 rounded-xl bg-dark-700 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>
          </div>

          <div className="border-t border-dark-500/30 pt-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MapPin size={12} />
              Endereço
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] text-slate-500 block mb-1">Logradouro</label>
                <input
                  value={formCompany.address_street}
                  onChange={e => setFormCompany(p => ({ ...p, address_street: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Número</label>
                <input
                  value={formCompany.address_number}
                  onChange={e => setFormCompany(p => ({ ...p, address_number: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Complemento</label>
                <input
                  value={formCompany.address_complement}
                  onChange={e => setFormCompany(p => ({ ...p, address_complement: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Cidade</label>
                <input
                  value={formCompany.address_city}
                  onChange={e => setFormCompany(p => ({ ...p, address_city: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">UF / CEP</label>
                <div className="flex gap-2">
                  <input
                    value={formCompany.address_state}
                    onChange={e => setFormCompany(p => ({ ...p, address_state: e.target.value }))}
                    maxLength={2}
                    placeholder="SP"
                    className="w-14 px-3 py-2 rounded-lg bg-dark-700 border border-dark-500/50 text-white text-sm text-center focus:border-brand-500/50 transition-all"
                  />
                  <input
                    value={formCompany.address_zip}
                    onChange={e => setFormCompany(p => ({ ...p, address_zip: e.target.value }))}
                    placeholder="00000-000"
                    className="flex-1 px-3 py-2 rounded-lg bg-dark-700 border border-dark-500/50 text-white text-sm focus:border-brand-500/50 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">Status SEFAZ</label>
            <span className={cn(
              'text-xs font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1',
              company.sefaz_status === 'regular' ? 'bg-emerald-500/10 text-emerald-400' :
              company.sefaz_status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
              'bg-danger-500/10 text-danger-400'
            )}>
              <Shield size={12} />
              {company.sefaz_status === 'regular' ? 'Regular' :
               company.sefaz_status === 'pending' ? 'Pendente de Verificação' :
               company.sefaz_status || 'Não verificado'}
            </span>
          </div>
        </Card>
      )}

      {tab === 'empresa' && !company && (
        <Card className="p-8 text-center">
          <Building2 size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-white font-medium">Nenhuma empresa vinculada</p>
          <p className="text-sm text-slate-400 mt-1">
            {profile?.role === 'procurador'
              ? 'Como assessor, seus dados de empresa são gerenciados na área de clientes'
              : 'Complete seu cadastro para vincular uma empresa'}
          </p>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-brand-600/20"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  )
}
