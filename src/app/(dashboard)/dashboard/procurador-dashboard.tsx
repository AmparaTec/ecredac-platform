'use client'

import { useState } from 'react'
import { formatBRL } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Users, Wallet, Send, Award, TrendingUp, DollarSign,
  Copy, Check, ArrowRight, Building2, Search,
  ClipboardList, CircleDollarSign, Rocket, ChevronRight,
  ShieldCheck, BarChart3
} from 'lucide-react'

interface ProcuradorDashboardProps {
  profile: any
  procurador: any
  tier: any
  clients: any[]
  commissions: any[]
  pendingInvites: number
  referralCode: string
}

const tierConfig: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  bronze:   { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: '🥉' },
  silver:   { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', icon: '🥈' },
  gold:     { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: '🥇' },
  platinum: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: '💎' },
  diamond:  { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: '👑' },
}

const commStatusConfig: Record<string, { label: string; badge: string }> = {
  pending:    { label: 'Pendente', badge: 'bg-amber-500/15 text-amber-400' },
  earned:     { label: 'Apurada', badge: 'bg-blue-500/15 text-blue-400' },
  processing: { label: 'Processando', badge: 'bg-blue-500/15 text-blue-400' },
  paid:       { label: 'Paga', badge: 'bg-emerald-500/15 text-emerald-400' },
  cancelled:  { label: 'Cancelada', badge: 'bg-red-500/15 text-red-400' },
}

// ─── ONBOARDING COMPONENT ───
function OnboardingView({ referralCode, profile }: { referralCode: string; profile: any }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const steps = [
    {
      number: 1,
      title: 'Cadastre seu primeiro cliente',
      description: 'Envie seu código de indicação para a empresa se cadastrar, ou cadastre o crédito diretamente.',
      icon: Building2,
      color: 'from-brand-600 to-brand-700',
      actions: [
        { label: 'Cadastrar Crédito de Cliente', href: '/marketplace', primary: true },
        { label: 'Enviar Convite', href: '/assessor/convites', primary: false },
      ],
    },
    {
      number: 2,
      title: 'Publique créditos no marketplace',
      description: 'Insira os créditos de ICMS das empresas que você assessora. A plataforma faz o matching automático.',
      icon: CircleDollarSign,
      color: 'from-emerald-600 to-emerald-700',
      actions: [
        { label: 'Publicar Crédito', href: '/marketplace', primary: true },
        { label: 'Ver Marketplace', href: '/marketplace', primary: false },
      ],
    },
    {
      number: 3,
      title: 'Acompanhe transações e ganhe comissões',
      description: 'Cada transação concluída gera comissão automática. Quanto mais volume, maior seu tier e taxa.',
      icon: Wallet,
      color: 'from-accent-600 to-accent-700',
      actions: [
        { label: 'Ver Tabela de Tiers', href: '/assessor/ranking', primary: true },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-dark-700 via-dark-600 to-dark-700 rounded-2xl p-8 border border-dark-500/50 relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-600/10 rounded-full blur-3xl" />

        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-brand-400 text-sm font-medium mb-1">Bem-vindo ao E-CREDac</p>
            <h1 className="text-3xl font-black text-white mb-2">
              Olá, {profile?.full_name?.split(' ')[0] || 'Assessor'}!
            </h1>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed">
              Você é um assessor de créditos de ICMS. Aqui você pode cadastrar créditos dos seus clientes,
              acompanhar transações e receber comissões automaticamente.
            </p>
          </div>
          <div className="hidden md:block">
            <Rocket size={64} className="text-dark-400" />
          </div>
        </div>

        {/* Referral Code inline */}
        <div className="relative mt-6 flex items-center gap-3 bg-dark-800/60 backdrop-blur rounded-xl p-4 border border-dark-500/50">
          <div className="flex-1">
            <p className="text-xs text-slate-500 mb-1">Seu código de indicação</p>
            <span className="font-mono text-xl font-black tracking-[0.25em] text-brand-400">
              {referralCode || '--------'}
            </span>
          </div>
          <button
            onClick={() => handleCopy(referralCode || '')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-600/20"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <button
            onClick={() => handleCopy(`https://ecredac.com.br/register?ref=${referralCode || ''}`)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-dark-500 text-slate-300 rounded-xl text-sm font-medium hover:bg-dark-400 transition-all border border-dark-400/50"
          >
            <Send size={14} />
            Copiar Link
          </button>
        </div>
      </div>

      {/* Steps */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Como comecar</h2>
        <div className="space-y-4">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <Card key={step.number} className="p-0 overflow-hidden">
                <div className="flex items-stretch">
                  <div className={`bg-gradient-to-b ${step.color} w-16 flex flex-col items-center justify-center text-white flex-shrink-0`}>
                    <span className="text-2xl font-black">{step.number}</span>
                  </div>
                  <div className="flex-1 p-5">
                    <div className="flex items-start gap-3">
                      <Icon size={20} className="text-slate-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{step.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{step.description}</p>
                        <div className="flex items-center gap-2 mt-3">
                          {step.actions.map((action, idx) => (
                            <Link
                              key={idx}
                              href={action.href}
                              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                action.primary
                                  ? 'bg-brand-600 text-white hover:bg-brand-500 shadow-lg shadow-brand-600/20'
                                  : 'bg-dark-500 text-slate-300 hover:bg-dark-400 border border-dark-400/50'
                              }`}
                            >
                              {action.label}
                              <ArrowRight size={14} />
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-l-2 border-l-brand-500">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={18} className="text-brand-400" />
            <h3 className="font-bold text-sm text-white">Seguro</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Todas as transações sao validadas pela SEFAZ e registradas com rastreabilidade completa.
          </p>
        </Card>
        <Card className="p-5 border-l-2 border-l-emerald-500">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={18} className="text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Comissão Automática</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Você recebe comissão automaticamente em cada transação concluída dos seus clientes.
          </p>
        </Card>
        <Card className="p-5 border-l-2 border-l-accent-500">
          <div className="flex items-center gap-2 mb-2">
            <Award size={18} className="text-accent-400" />
            <h3 className="font-bold text-sm text-white">Tiers Progressivos</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            De Bronze a Diamond: quanto mais volume você intermedia, maior sua taxa de comissão.
          </p>
        </Card>
      </div>
    </div>
  )
}

// ─── ACTIVE DASHBOARD ───
function ActiveDashboard({
  profile, procurador, tier, clients, commissions, pendingInvites, referralCode
}: ProcuradorDashboardProps) {
  const [copied, setCopied] = useState(false)
  const tc = tierConfig[procurador?.tier || 'bronze'] || tierConfig.bronze
  const totalEarned = procurador?.total_commissions_earned || 0
  const totalPaid = procurador?.total_commissions_paid || 0
  const totalVolume = procurador?.total_volume_intermediated || 0
  const totalClients = procurador?.total_companies || clients?.length || 0

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Painel do Assessor</h1>
          <p className="text-slate-500 mt-1">Gerencie créditos, clientes e comissões</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 ${tc.bg} ${tc.border}`}>
          <span className="text-lg">{tc.icon}</span>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${tc.color}`}>
              {(procurador?.tier || 'bronze').toUpperCase()}
            </p>
            <p className="text-[10px] text-slate-500">
              {tier?.commission_pct ? `${tier.commission_pct}% comissão` : '0.5% comissão'}
            </p>
          </div>
        </div>
      </div>

      {/* Primary Action Bar */}
      <div className="bg-gradient-to-r from-brand-600/20 to-accent-600/10 rounded-xl p-4 flex items-center justify-between border border-brand-500/20">
        <div className="flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-brand-600/30 flex items-center justify-center">
            <CircleDollarSign size={20} className="text-brand-400" />
          </div>
          <div>
            <p className="font-bold">Operação de Créditos</p>
            <p className="text-sm text-slate-400">Publique, acompanhe e gerencie créditos de ICMS dos seus clientes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/marketplace"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-600/20"
          >
            <DollarSign size={14} />
            Publicar Crédito
          </Link>
          <Link
            href="/demandas"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-dark-500 text-slate-300 rounded-xl text-sm font-medium hover:bg-dark-400 transition-all border border-dark-400/50"
          >
            <Search size={14} />
            Buscar Demandas
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Clientes Ativos" value={String(totalClients)} subtitle="empresas na carteira" />
        <StatCard title="Volume Intermediado" value={formatBRL(totalVolume)} subtitle="total acumulado" />
        <StatCard title="Comissões Ganhas" value={formatBRL(totalEarned)} subtitle={`${formatBRL(totalPaid)} ja pago`} />
        <StatCard title="Convites Pendentes" value={String(pendingInvites)} subtitle="aguardando aceite" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Clients */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Clientes</h2>
              <Link href="/assessor/clientes" className="text-sm text-brand-400 hover:text-brand-300 font-medium">Ver todos →</Link>
            </div>
            {clients && clients.length > 0 ? (
              <div className="space-y-3">
                {clients.slice(0, 5).map((client: any) => (
                  <div key={client.id} className="flex items-center justify-between p-3 rounded-xl bg-dark-600/50 hover:bg-dark-600 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold text-sm">
                        {(client.company?.nome_fantasia || client.company?.razao_social || '?').charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {client.company?.nome_fantasia || client.company?.razao_social || 'Empresa'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {client.company?.type === 'seller' ? 'Cedente' : client.company?.type === 'buyer' ? 'Cessionário' : 'Ambos'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={client.company?.sefaz_status === 'regular' ? 'success' : 'warning'}>
                        {client.company?.sefaz_status === 'regular' ? 'Regular' : 'Pendente'}
                      </Badge>
                      <Link href="/marketplace" className="p-2 rounded-lg hover:bg-dark-500 text-brand-400">
                        <DollarSign size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users size={28} className="mx-auto text-slate-600 mb-2" />
                <p className="text-sm text-slate-500">Nenhum cliente ainda</p>
                <Link href="/assessor/convites" className="inline-flex items-center gap-1 mt-2 text-sm text-brand-400 font-medium">
                  Convidar cliente <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </Card>

          {/* Commissions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Comissões Recentes</h2>
              <Link href="/assessor/comissões" className="text-sm text-brand-400 hover:text-brand-300 font-medium">Ver todas →</Link>
            </div>
            {commissions && commissions.length > 0 ? (
              <div className="space-y-2">
                {commissions.slice(0, 5).map((comm: any) => {
                  const cs = commStatusConfig[comm.status] || commStatusConfig.pending
                  return (
                    <div key={comm.id} className="flex items-center justify-between p-3 rounded-xl bg-dark-600/50">
                      <div>
                        <p className="text-sm font-medium text-white">{formatBRL(comm.commission_value)}</p>
                        <p className="text-xs text-slate-500">{comm.commission_pct}% de {formatBRL(comm.transaction_value)}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${cs.badge}`}>{cs.label}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Wallet size={28} className="mx-auto text-slate-600 mb-2" />
                <p className="text-sm text-slate-500">Comissões aparecem apos transações concluidas</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-3">Acoes Rapidas</h3>
            <div className="space-y-2">
              <Link href="/marketplace" className="flex items-center gap-2 p-3 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 text-sm font-bold transition-all border border-brand-500/20">
                <DollarSign size={18} />
                <div className="flex-1">
                  <span className="block">Publicar Crédito</span>
                  <span className="block text-[10px] font-normal text-brand-500/70">Cadastrar crédito de ICMS</span>
                </div>
                <ChevronRight size={14} />
              </Link>
              <Link href="/demandas" className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-bold transition-all border border-emerald-500/20">
                <Search size={18} />
                <div className="flex-1">
                  <span className="block">Ver Demandas</span>
                  <span className="block text-[10px] font-normal text-emerald-500/70">Encontrar compradores</span>
                </div>
                <ChevronRight size={14} />
              </Link>
              <Link href="/pipeline" className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-sm font-bold transition-all border border-amber-500/20">
                <ClipboardList size={18} />
                <div className="flex-1">
                  <span className="block">Pipeline</span>
                  <span className="block text-[10px] font-normal text-amber-500/70">Acompanhar operações</span>
                </div>
                <ChevronRight size={14} />
              </Link>
              <Link href="/assessor/convites" className="flex items-center gap-2 p-3 rounded-xl bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 text-sm font-bold transition-all border border-accent-500/20">
                <Send size={18} />
                <div className="flex-1">
                  <span className="block">Convidar Cliente</span>
                  <span className="block text-[10px] font-normal text-accent-500/70">Enviar código de indicação</span>
                </div>
                <ChevronRight size={14} />
              </Link>
            </div>
          </Card>

          {/* Referral Code */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-2">Código de Indicação</h3>
            <div className="flex items-center gap-2 p-3 bg-dark-600 rounded-xl border border-dark-500/50">
              <span className="font-mono text-lg font-black tracking-[0.2em] text-brand-400 flex-1">
                {referralCode || '--------'}
              </span>
              <button
                onClick={() => handleCopy(referralCode || '')}
                className="p-2 rounded-lg bg-brand-600 text-white hover:bg-brand-500 transition-all"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </Card>

          {/* Tier Progress */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-3">Tier Atual</h3>
            <div className={`flex items-center gap-2 p-2.5 rounded-xl ${tc.bg} ${tc.border} border`}>
              <span className="text-lg">{tc.icon}</span>
              <div className="flex-1">
                <p className={`text-sm font-bold ${tc.color}`}>
                  {(procurador?.tier || 'bronze').charAt(0).toUpperCase() + (procurador?.tier || 'bronze').slice(1)}
                </p>
                <p className="text-[10px] text-slate-500">{tier?.commission_pct || '0.50'}% por transacao</p>
              </div>
              <Link href="/assessor/ranking" className="text-xs text-brand-400 font-medium">Ver →</Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN EXPORT ───
export function ProcuradorDashboard(props: ProcuradorDashboardProps) {
  const { clients, commissions, procurador } = props
  const hasData = (clients?.length || 0) > 0 || (commissions?.length || 0) > 0 || (procurador?.total_volume_intermediated || 0) > 0

  if (!hasData) {
    return <OnboardingView referralCode={props.referralCode} profile={props.profile} />
  }

  return <ActiveDashboard {...props} />
}
