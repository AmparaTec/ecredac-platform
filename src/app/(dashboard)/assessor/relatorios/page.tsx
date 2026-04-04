import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { formatBRL } from '@/lib/utils'
import { BarChart3, TrendingUp, Users, Wallet, Award } from 'lucide-react'

export default async function RelatoriosPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (profile?.role !== 'procurador') redirect('/dashboard')

  const { data: procurador } = await supabase
    .from('procurador_profiles')
    .select('*')
    .eq('user_profile_id', profile.id)
    .single()

  if (!procurador) redirect('/dashboard')

  // Get commissions for monthly breakdown
  const { data: commissions } = await supabase
    .from('commissions')
    .select('commission_value, transaction_value, status, reference_month, created_at')
    .eq('procurador_id', procurador.id)
    .order('created_at', { ascending: false })

  const allComm = commissions || []

  // Get client count
  const { count: clientCount } = await supabase
    .from('company_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_profile_id', profile.id)
    .eq('role', 'procurador')
    .eq('active', true)

  // Calculate metrics
  const totalVolume = procurador.total_volume_intermediated || 0
  const totalEarned = procurador.total_commissions_earned || 0
  const totalPaid = procurador.total_commissions_paid || 0
  const avgCommPerClient = (clientCount || 0) > 0 ? totalEarned / (clientCount || 1) : 0
  const conversionRate = allComm.length > 0
    ? (allComm.filter(c => c.status === 'paid').length / allComm.length * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatorios</h1>
        <p className="text-gray-500 mt-1">Analise sua performance como assessor</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Volume Total Intermediado"
          value={formatBRL(totalVolume)}
          subtitle="acumulado"
        />
        <StatCard
          title="Comissoes Totais"
          value={formatBRL(totalEarned)}
          subtitle={`${formatBRL(totalPaid)} pago`}
        />
        <StatCard
          title="Clientes Ativos"
          value={String(clientCount || 0)}
          subtitle="na carteira"
        />
        <StatCard
          title="Comissao Media/Cliente"
          value={formatBRL(avgCommPerClient)}
          subtitle="por empresa"
        />
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Resumo de Performance</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-brand-600" />
                <span className="text-sm text-gray-600">Volume mensal atual</span>
              </div>
              <span className="font-bold">{formatBRL(procurador.current_month_volume || 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-purple-600" />
                <span className="text-sm text-gray-600">Tier atual</span>
              </div>
              <span className="font-bold capitalize">{procurador.tier || 'bronze'}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-emerald-600" />
                <span className="text-sm text-gray-600">Taxa de comissao</span>
              </div>
              <span className="font-bold">{procurador.custom_commission_pct || '0.50'}%</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-600" />
                <span className="text-sm text-gray-600">Taxa de conversao</span>
              </div>
              <span className="font-bold">{conversionRate.toFixed(1)}%</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Distribuicao de Comissoes</h2>
          {allComm.length > 0 ? (
            <div className="space-y-3">
              {['paid', 'earned', 'processing', 'pending', 'cancelled'].map(status => {
                const count = allComm.filter(c => c.status === status).length
                const total = allComm.filter(c => c.status === status).reduce((s, c) => s + (c.commission_value || 0), 0)
                if (count === 0) return null
                const labels: Record<string, string> = {
                  paid: 'Pagas', earned: 'Apuradas', processing: 'Processando', pending: 'Pendentes', cancelled: 'Canceladas'
                }
                const colors: Record<string, string> = {
                  paid: 'bg-emerald-500', earned: 'bg-blue-500', processing: 'bg-blue-400', pending: 'bg-amber-500', cancelled: 'bg-gray-400'
                }
                const pct = (count / allComm.length) * 100
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{labels[status]} ({count})</span>
                      <span className="font-medium">{formatBRL(total)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`${colors[status]} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Dados insuficientes para exibir relatorio</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
