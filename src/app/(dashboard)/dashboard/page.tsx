import { createServerSupabase } from '@/lib/supabase/server'
import { formatBRL, formatNumber } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { ProcuradorDashboard } from './procurador-dashboard'
import Link from 'next/link'
import {
  DollarSign, TrendingUp, ArrowLeftRight, Clock,
  AlertTriangle, CheckCircle2, GitMerge, Shield
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user profile (role)
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('id, full_name, role, referral_code')
    .eq('auth_user_id', user!.id)
    .single()

  const role = userProfile?.role || 'titular'

  // ─── PROCURADOR DASHBOARD ───
  if (role === 'procurador' && userProfile) {
    const { data: procurador } = await supabase
      .from('procurador_profiles')
      .select('*')
      .eq('user_profile_id', userProfile.id)
      .single()

    // Get current tier info
    const { data: tier } = procurador ? await supabase
      .from('commission_tiers')
      .select('*')
      .eq('tier', procurador.tier || 'bronze')
      .single() : { data: null }

    // Get clients (companies linked to this procurador via company_members)
    const { data: clients } = await supabase
      .from('company_members')
      .select('*, company:companies(*)')
      .eq('user_profile_id', userProfile.id)
      .eq('role', 'procurador')
      .eq('active', true)

    // Get recent commissions
    const { data: commissions } = procurador ? await supabase
      .from('commissions')
      .select('*')
      .eq('procurador_id', procurador.id)
      .order('created_at', { ascending: false })
      .limit(10) : { data: [] }

    // Count pending invites
    const { count: pendingInvites } = procurador ? await supabase
      .from('referral_invites')
      .select('*', { count: 'exact', head: true })
      .eq('procurador_id', procurador.id)
      .eq('status', 'pending') : { count: 0 }

    return (
      <ProcuradorDashboard
        profile={userProfile}
        procurador={procurador}
        tier={tier}
        clients={clients || []}
        commissions={commissions || []}
        pendingInvites={pendingInvites || 0}
        referralCode={userProfile.referral_code || ''}
      />
    )
  }

  // ─── EMPRESA DASHBOARD (titular / representante) ───
  // Get company
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('auth_user_id', user!.id)
    .single()

  // Fetch stats in parallel
  const [
    { count: activeListings },
    { count: activeRequests },
    { count: pendingMatches },
    { count: completedTx },
    { data: recentMatches },
    { data: recentListings },
    { data: notifications },
  ] = await Promise.all([
    supabase.from('credit_listings').select('*', { count: 'exact', head: true }).eq('company_id', company?.id).eq('status', 'active'),
    supabase.from('credit_requests').select('*', { count: 'exact', head: true }).eq('company_id', company?.id).eq('status', 'active'),
    supabase.from('matches').select('*', { count: 'exact', head: true }).or(`seller_company_id.eq.${company?.id},buyer_company_id.eq.${company?.id}`).in('status', ['proposed', 'accepted_seller', 'accepted_buyer']),
    supabase.from('transactions').select('*', { count: 'exact', head: true }).or(`seller_company_id.eq.${company?.id},buyer_company_id.eq.${company?.id}`).eq('status', 'completed'),
    supabase.from('matches').select('*, seller_company:companies!seller_company_id(*), buyer_company:companies!buyer_company_id(*)').or(`seller_company_id.eq.${company?.id},buyer_company_id.eq.${company?.id}`).order('created_at', { ascending: false }).limit(5),
    supabase.from('credit_listings').select('*, credit_score:credit_scores(*)').eq('company_id', company?.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('notifications').select('*').eq('company_id', company?.id).eq('read', false).order('created_at', { ascending: false }).limit(5),
  ])

  // Calculate volume from recent listings
  const totalVolume = recentListings?.reduce((acc, l) => acc + (l.amount || 0), 0) || 0

  // Role label for header
  const roleLabel = role === 'representante' ? 'Representante' : 'Titular'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Visao geral da sua operacao de creditos de ICMS</p>
        </div>
        {role === 'representante' && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider border border-blue-200">
            Representante
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Creditos Ativos"
          value={String(activeListings || 0)}
          subtitle="ofertas publicadas"
          trend="+12% este mes"
          trendUp
        />
        <StatCard
          title="Demandas Ativas"
          value={String(activeRequests || 0)}
          subtitle="buscas em andamento"
        />
        <StatCard
          title="Matches Pendentes"
          value={String(pendingMatches || 0)}
          subtitle="aguardando aprovacao"
        />
        <StatCard
          title="Transacoes Concluidas"
          value={String(completedTx || 0)}
          subtitle="com sucesso"
          trend="98% taxa de sucesso"
          trendUp
        />
      </div>

      {/* Recent Credits with Score */}
      {recentListings && recentListings.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Seus Creditos</h2>
            <Link href="/marketplace" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              Ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentListings.map((listing: any) => {
              const score = listing.credit_score
              const gradeColors: Record<string, string> = {
                A: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                B: 'bg-blue-50 border-blue-200 text-blue-700',
                C: 'bg-amber-50 border-amber-200 text-amber-700',
                D: 'bg-red-50 border-red-200 text-red-700',
              }
              return (
                <div key={listing.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all">
                  {score && (
                    <div className={`w-10 h-10 rounded-lg border-2 font-bold flex items-center justify-center text-sm ${gradeColors[score.grade] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                      {score.grade}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brand-600">
                        {listing.credit_id || 'Gerando...'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold">{formatBRL(listing.amount)}</p>
                    <p className="text-xs text-gray-500">{listing.status === 'active' ? 'Ativo' : listing.status}</p>
                  </div>
                  {score && (
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-600">{score.score?.toFixed(0)}/100</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Matches */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Matches Recentes</h2>
              <Link href="/matching" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                Ver todos →
              </Link>
            </div>

            {recentMatches && recentMatches.length > 0 ? (
              <div className="space-y-3">
                {recentMatches.map((match: any) => (
                  <div key={match.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
                        <GitMerge size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {match.seller_company?.nome_fantasia || 'Cedente'} → {match.buyer_company?.nome_fantasia || 'Cessionario'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Score: {match.match_score || '—'}% · Desconto: {match.agreed_discount}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatBRL(match.matched_amount)}</p>
                      <Badge variant={
                        match.status === 'confirmed' ? 'success' :
                        match.status === 'proposed' ? 'warning' : 'info'
                      }>
                        {match.status === 'confirmed' ? 'Confirmado' :
                         match.status === 'proposed' ? 'Proposto' : match.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <GitMerge size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Nenhum match encontrado ainda</p>
                <p className="text-xs text-gray-400 mt-1">
                  Publique creditos ou crie demandas para iniciar o matching automatico
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Notifications + Quick Actions */}
        <div className="space-y-4">
          {/* Notifications */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Notificacoes</h3>
            {notifications && notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map((n: any) => (
                  <div key={n.id} className="flex items-start gap-2 p-2 rounded-lg bg-blue-50/50">
                    <span className="text-brand-600 mt-0.5">
                      {n.type === 'match_found' ? <GitMerge size={14} /> :
                       n.type === 'payment' ? <DollarSign size={14} /> :
                       <AlertTriangle size={14} />}
                    </span>
                    <div>
                      <p className="text-xs font-medium">{n.title}</p>
                      <p className="text-xs text-gray-500">{n.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-3">Nenhuma notificacao nova</p>
            )}
          </Card>

          {/* Quick Actions */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Acoes Rapidas</h3>
            <div className="space-y-2">
              <Link
                href="/marketplace"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-sm font-medium transition-all"
              >
                <DollarSign size={16} />
                Publicar Credito
              </Link>
              <Link
                href="/demandas"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium transition-all"
              >
                <TrendingUp size={16} />
                Criar Demanda
              </Link>
              <Link
                href="/pipeline"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-medium transition-all"
              >
                <Clock size={16} />
                Ver Pipeline
              </Link>
            </div>
          </Card>

          {/* Company Status */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Status da Empresa</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">SEFAZ-SP</span>
                <Badge variant={company?.sefaz_status === 'regular' ? 'success' : 'warning'}>
                  {company?.sefaz_status === 'regular' ? 'Regular' : company?.sefaz_status || 'Pendente'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Plano</span>
                <Badge variant={company?.tier === 'premium' ? 'premium' : 'default'}>
                  {company?.tier === 'premium' ? 'Premium' : 'Free'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo</span>
                <span className="text-gray-700 font-medium">
                  {company?.type === 'seller' ? 'Cedente' :
                   company?.type === 'buyer' ? 'Cessionario' : 'Ambos'}
                </span>
              </div>
              {role === 'representante' && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Acesso</span>
                  <span className="text-blue-700 font-medium">Representante</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
