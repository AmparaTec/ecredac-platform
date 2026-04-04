'use client'

import { formatBRL, formatNumber } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Users, Wallet, Send, Award, TrendingUp,
  DollarSign, Copy, ArrowUpRight, Clock, CheckCircle2
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

// Tier visual config
const tierConfig: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  bronze:   { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: '🥉' },
  silver:   { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-300', icon: '🥈' },
  gold:     { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-300', icon: '🥇' },
  platinum: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300', icon: '💎' },
  diamond:  { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300', icon: '👑' },
}

// Commission status config
const commStatusConfig: Record<string, { label: string; badge: string }> = {
  pending:    { label: 'Pendente', badge: 'bg-amber-100 text-amber-800' },
  earned:     { label: 'Apurada', badge: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Processando', badge: 'bg-blue-100 text-blue-800' },
  paid:       { label: 'Paga', badge: 'bg-emerald-100 text-emerald-800' },
  cancelled:  { label: 'Cancelada', badge: 'bg-red-100 text-red-800' },
}

export function ProcuradorDashboard({
  profile, procurador, tier, clients, commissions, pendingInvites, referralCode
}: ProcuradorDashboardProps) {
  const tc = tierConfig[procurador?.tier || 'bronze'] || tierConfig.bronze
  const commissionsThisMonth = commissions?.filter(c => c.status !== 'cancelled') || []
  const totalEarnedThisMonth = commissionsThisMonth.reduce((sum: number, c: any) => sum + (c.commission_value || 0), 0)
  const totalPaid = procurador?.total_commissions_paid || 0
  const totalEarned = procurador?.total_commissions_earned || 0
  const totalVolume = procurador?.total_volume_intermediated || 0
  const totalClients = procurador?.total_companies || clients?.length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel do Assessor</h1>
          <p className="text-gray-500 mt-1">Acompanhe seus clientes, comissoes e performance</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 ${tc.bg} ${tc.border}`}>
          <span className="text-lg">{tc.icon}</span>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${tc.color}`}>
              {(procurador?.tier || 'bronze').toUpperCase()}
            </p>
            <p className="text-[10px] text-gray-500">
              {tier?.commission_pct ? `${tier.commission_pct}% comissao` : '0.5% comissao'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Clientes Ativos"
          value={String(totalClients)}
          subtitle="empresas na carteira"
          trend={totalClients > 0 ? `+${totalClients} total` : undefined}
          trendUp={totalClients > 0}
        />
        <StatCard
          title="Volume Intermediado"
          value={formatBRL(totalVolume)}
          subtitle="total acumulado"
        />
        <StatCard
          title="Comissoes Ganhas"
          value={formatBRL(totalEarned)}
          subtitle={`${formatBRL(totalPaid)} ja pago`}
          trend={totalEarnedThisMonth > 0 ? `+${formatBRL(totalEarnedThisMonth)} este mes` : undefined}
          trendUp={totalEarnedThisMonth > 0}
        />
        <StatCard
          title="Convites Pendentes"
          value={String(pendingInvites)}
          subtitle="aguardando aceite"
        />
      </div>

      {/* Referral Code Card */}
      <Card className="p-6 bg-gradient-to-r from-brand-50 to-purple-50 border-brand-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-1">Seu Codigo de Indicacao</h2>
            <p className="text-xs text-gray-500 mb-3">
              Compartilhe com empresas para vincular como seu cliente automaticamente
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border-2 border-dashed border-brand-300">
                <span className="font-mono text-xl font-black tracking-[0.3em] text-brand-700">
                  {referralCode || '--------'}
                </span>
              </div>
              <button
                className="flex items-center gap-1.5 px-3 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-all"
                onClick={() => {
                  if (referralCode) {
                    navigator.clipboard.writeText(referralCode)
                  }
                }}
              >
                <Copy size={14} />
                Copiar
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Link de cadastro: ecredac.com.br/register?ref={referralCode || '...'}
            </p>
          </div>
          <div className="hidden md:flex flex-col items-center gap-1 px-6">
            <Send size={40} className="text-brand-400" />
            <span className="text-xs text-brand-600 font-medium">Convide clientes</span>
          </div>
        </div>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Clients */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Clientes Recentes</h2>
              <Link href="/assessor/clientes" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                Ver todos →
              </Link>
            </div>

            {clients && clients.length > 0 ? (
              <div className="space-y-3">
                {clients.slice(0, 5).map((client: any) => (
                  <div key={client.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                        {(client.company?.nome_fantasia || client.company?.razao_social || '?').charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {client.company?.nome_fantasia || client.company?.razao_social || 'Empresa'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {client.company?.cnpj || '—'} · {client.company?.type === 'seller' ? 'Cedente' : client.company?.type === 'buyer' ? 'Cessionario' : 'Ambos'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={client.company?.sefaz_status === 'regular' ? 'success' : 'warning'}>
                        {client.company?.sefaz_status === 'regular' ? 'Regular' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Nenhum cliente na carteira ainda</p>
                <p className="text-xs text-gray-400 mt-1">
                  Compartilhe seu codigo de indicacao para comecar a receber clientes
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Recent Commissions */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Comissoes Recentes</h3>
            {commissions && commissions.length > 0 ? (
              <div className="space-y-2">
                {commissions.slice(0, 5).map((comm: any) => {
                  const cs = commStatusConfig[comm.status] || commStatusConfig.pending
                  return (
                    <div key={comm.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div>
                        <p className="text-xs font-medium">{formatBRL(comm.commission_value)}</p>
                        <p className="text-[10px] text-gray-500">
                          {comm.commission_pct}% de {formatBRL(comm.transaction_value)}
                        </p>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cs.badge}`}>
                        {cs.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-3">Nenhuma comissao ainda</p>
            )}
            <Link href="/assessor/comissoes" className="block mt-3 text-center text-xs text-brand-600 hover:text-brand-700 font-medium">
              Ver todas →
            </Link>
          </Card>

          {/* Tier Progress */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Progresso do Tier</h3>
            <div className="space-y-3">
              {/* Current Tier */}
              <div className={`flex items-center gap-2 p-2.5 rounded-xl ${tc.bg} ${tc.border} border`}>
                <span className="text-lg">{tc.icon}</span>
                <div>
                  <p className={`text-sm font-bold ${tc.color}`}>
                    {(procurador?.tier || 'bronze').charAt(0).toUpperCase() + (procurador?.tier || 'bronze').slice(1)}
                  </p>
                  <p className="text-[10px] text-gray-500">Tier atual</p>
                </div>
              </div>

              {/* Volume Progress */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Volume mensal</span>
                  <span className="font-medium">{formatBRL(procurador?.current_month_volume || 0)}</span>
                </div>
                {tier?.max_monthly_volume && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-brand-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((procurador?.current_month_volume || 0) / tier.max_monthly_volume) * 100)}%`
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {formatBRL(tier.max_monthly_volume - (procurador?.current_month_volume || 0))} para proximo tier
                    </p>
                  </>
                )}
              </div>

              <Link
                href="/assessor/ranking"
                className="flex items-center justify-center gap-1 p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium transition-all"
              >
                <Award size={14} />
                Ver Ranking Completo
              </Link>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Acoes Rapidas</h3>
            <div className="space-y-2">
              <Link
                href="/assessor/convites"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-sm font-medium transition-all"
              >
                <Send size={16} />
                Enviar Convite
              </Link>
              <Link
                href="/assessor/clientes"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium transition-all"
              >
                <Users size={16} />
                Gerenciar Clientes
              </Link>
              <Link
                href="/assessor/relatorios"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-medium transition-all"
              >
                <TrendingUp size={16} />
                Ver Relatorios
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
