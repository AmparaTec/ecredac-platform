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
    <div className="h-[calc(100vh-4rem)] flex flex-col gap-3 overflow-hidden">
      {/* Header compacto */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-500 text-xs">Visão geral — créditos de ICMS</p>
        </div>
        <div className="flex items-center gap-2">
          {role === 'representante' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/25">
              Representante
            </span>
          )}
          <Badge variant={company?.sefaz_status === 'regular' ? 'success' : 'warning'}>
            SEFAZ: {company?.sefaz_status === 'regular' ? 'Regular' : company?.sefaz_status || 'Pendente'}
          </Badge>
          <Badge variant={company?.tier === 'premium' ? 'premium' : 'default'}>
            {company?.tier === 'premium' ? 'Premium' : 'Free'}
          </Badge>
        </div>
      </div>

      {/* Stats — compactos */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        <StatCard title="Créditos Ativos" value={String(activeListings || 0)} subtitle="ofertas" />
        <StatCard title="Demandas" value={String(activeRequests || 0)} subtitle="em andamento" />
        <StatCard title="Matches" value={String(pendingMatches || 0)} subtitle="pendentes" />
        <StatCard title="Concluídas" value={String(completedTx || 0)} subtitle="transações" />
      </div>

      {/* Conteúdo principal — preenche o espaço restante */}
      <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">

        {/* Coluna 1: Créditos */}
        <Card className="p-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <h2 className="text-sm font-bold text-white">Seus Créditos</h2>
            <Link href="/marketplace" className="text-xs text-brand-400 hover:text-brand-300 font-medium">Ver todos →</Link>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
            {recentListings && recentListings.length > 0 ? (
              recentListings.map((listing: any) => {
                const score = listing.credit_score
                const gradeColors: Record<string, string> = {
                  A: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
                  B: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
                  C: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
                  D: 'bg-red-500/15 border-red-500/30 text-red-400',
                }
                return (
                  <div key={listing.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-dark-600/50 hover:bg-dark-600 transition-all">
                    {score && (
                      <div className={`w-8 h-8 rounded-lg border-2 font-bold flex items-center justify-center text-xs ${gradeColors[score.grade] || 'bg-dark-600 border-dark-500 text-slate-400'}`}>
                        {score.grade}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-[10px] font-bold text-brand-400">{listing.credit_id || '...'}</span>
                      <p className="text-sm font-semibold text-white">{formatBRL(listing.amount)}</p>
                    </div>
                    {score && <span className="text-[10px] text-slate-500">{score.score?.toFixed(0)}/100</span>}
                  </div>
                )
              })
            ) : (
              <div className="text-center py-6">
                <DollarSign size={24} className="mx-auto text-slate-600 mb-1" />
                <p className="text-xs text-slate-500">Nenhum crédito publicado</p>
                <Link href="/marketplace" className="text-xs text-brand-400 mt-1 inline-block">Publicar →</Link>
              </div>
            )}
          </div>
        </Card>

        {/* Coluna 2: Matches */}
        <Card className="p-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <h2 className="text-sm font-bold text-white">Matches Recentes</h2>
            <Link href="/matching" className="text-xs text-brand-400 hover:text-brand-300 font-medium">Ver todos →</Link>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
            {recentMatches && recentMatches.length > 0 ? (
              recentMatches.map((match: any) => (
                <div key={match.id} className="flex items-center justify-between p-2.5 rounded-xl bg-dark-600/50 hover:bg-dark-600 transition-all">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-400 flex items-center justify-center flex-shrink-0">
                      <GitMerge size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {match.seller_company?.nome_fantasia || 'Cedente'} → {match.buyer_company?.nome_fantasia || 'Cessionário'}
                      </p>
                      <p className="text-[10px] text-slate-500">{match.agreed_discount}% desc.</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs font-bold text-white">{formatBRL(match.matched_amount)}</p>
                    <Badge variant={match.status === 'confirmed' ? 'success' : match.status === 'proposed' ? 'warning' : 'info'}>
                      {match.status === 'confirmed' ? 'OK' : match.status === 'proposed' ? 'Prop.' : match.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <GitMerge size={24} className="mx-auto text-slate-600 mb-1" />
                <p className="text-xs text-slate-500">Nenhum match ainda</p>
                <p className="text-[10px] text-slate-600 mt-1">Publique créditos para iniciar</p>
              </div>
            )}
          </div>
        </Card>

        {/* Coluna 3: Notificações + Ações */}
        <div className="flex flex-col gap-3 min-h-0">
          {/* Notificações */}
          <Card className="p-4 flex flex-col flex-1 overflow-hidden">
            <h3 className="text-sm font-bold text-white mb-2 flex-shrink-0">Notificações</h3>
            <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
              {notifications && notifications.length > 0 ? (
                notifications.map((n: any) => (
                  <div key={n.id} className="flex items-start gap-2 p-2 rounded-lg bg-brand-500/10">
                    <span className="text-brand-400 mt-0.5">
                      {n.type === 'match_found' ? <GitMerge size={12} /> :
                       n.type === 'payment' ? <DollarSign size={12} /> :
                       <AlertTriangle size={12} />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-white truncate">{n.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{n.body}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-2">Nenhuma notificação</p>
              )}
            </div>
          </Card>

          {/* Ações Rápidas */}
          <Card className="p-4 flex-shrink-0">
            <h3 className="text-sm font-bold text-white mb-2">Ações Rápidas</h3>
            <div className="space-y-1.5">
              <Link href="/marketplace" className="flex items-center gap-2 p-2 rounded-xl bg-brand-500/15 hover:bg-brand-500/25 text-brand-400 text-xs font-medium transition-all">
                <DollarSign size={14} /> Publicar Crédito
              </Link>
              <Link href="/demandas" className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium transition-all">
                <TrendingUp size={14} /> Criar Demanda
              </Link>
              <Link href="/pipeline" className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-xs font-medium transition-all">
                <Clock size={14} /> Ver Pipeline
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
