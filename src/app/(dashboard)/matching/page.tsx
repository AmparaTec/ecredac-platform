'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL, formatDate, matchStatusConfig, creditScoreConfig } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreBadge } from '@/components/ui/score-badge'
import { MatchAlertList, MatchAlertForm } from '@/components/ui/match-alert-config'
import { AutoBidList, AutoBidForm } from '@/components/ui/auto-bid-config'
import { AuctionCard } from '@/components/ui/silent-auction'
import { GitMerge, Zap, Check, X, RefreshCw, ArrowRight, Shield, Bell, Gavel } from 'lucide-react'
import { ScoreDisclaimer } from '@/components/compliance/score-disclaimer'

export default function MatchingPage() {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'matches' | 'alerts' | 'autobid' | 'auctions'>('matches')
  const [alerts, setAlerts] = useState<any[]>([])
  const [autoBidRules, setAutoBidRules] = useState<any[]>([])
  const [auctions, setAuctions] = useState<any[]>([])
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [showAutoBidForm, setShowAutoBidForm] = useState(false)

  useEffect(() => {
    loadMatches()
    loadAlerts()
    loadAutoBidRules()
    loadAuctions()
  }, [])

  async function loadMatches() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: company } = await supabase
      .from('companies').select('id').eq('auth_user_id', user.id).single()
    if (!company) return
    setCompanyId(company.id)

    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        seller_company:companies!seller_company_id(id, nome_fantasia, razao_social, cnpj),
        buyer_company:companies!buyer_company_id(id, nome_fantasia, razao_social, cnpj),
        listing:credit_listings(credit_id, credit_type, origin, amount, credit_score:credit_scores(*)),
        request:credit_requests(amount_needed, urgency)
      `)
      .or(`seller_company_id.eq.${company.id},buyer_company_id.eq.${company.id}`)
      .order('created_at', { ascending: false })

    setMatches(data || [])
    setLoading(false)
  }

  async function loadAlerts() {
    try {
      const res = await fetch('/api/alerts')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts || [])
      }
    } catch (err) { console.error(err) }
  }

  async function loadAutoBidRules() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: company } = await supabase.from('companies').select('id').eq('auth_user_id', user.id).single()
    if (!company) return
    const { data } = await supabase.from('auto_bid_rules').select('*').eq('company_id', company.id).order('created_at', { ascending: false })
    setAutoBidRules(data || [])
  }

  async function loadAuctions() {
    try {
      const res = await fetch('/api/auctions?status=open')
      if (res.ok) {
        const data = await res.json()
        setAuctions(data.auctions || [])
      }
    } catch (err) { console.error(err) }
  }

  async function toggleAlert(id: string, active: boolean) {
    const res = await fetch('/api/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active }),
    })
    if (res.ok) loadAlerts()
  }

  async function deleteAlert(id: string) {
    const res = await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' })
    if (res.ok) loadAlerts()
  }

  async function createAlert(data: any) {
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) { setShowAlertForm(false); loadAlerts() }
  }

  async function toggleAutoBid(id: string, active: boolean) {
    const supabase = createClient()
    await supabase.from('auto_bid_rules').update({ active }).eq('id', id)
    loadAutoBidRules()
  }

  async function deleteAutoBid(id: string) {
    const supabase = createClient()
    await supabase.from('auto_bid_rules').delete().eq('id', id)
    loadAutoBidRules()
  }

  async function createAutoBid(data: any) {
    if (!companyId) return
    const supabase = createClient()
    await supabase.from('auto_bid_rules').insert({ ...data, company_id: companyId })
    setShowAutoBidForm(false)
    loadAutoBidRules()
  }

  async function runMatchingEngine() {
    setRunning(true)
    try {
      const res = await fetch('/api/matching', { method: 'POST' })
      const data = await res.json()
      if (data.matches_created > 0) {
        loadMatches()
      }
    } catch (err) {
      console.error(err)
    }
    setRunning(false)
  }

  async function respondToMatch(matchId: string, accept: boolean) {
    const supabase = createClient()
    if (!companyId) return

    const match = matches.find(m => m.id === matchId)
    if (!match) return

    const isSeller = match.seller_company_id === companyId
    const newStatus = accept
      ? (isSeller ? 'accepted_seller' : 'accepted_buyer')
      : 'cancelled'

    // If both parties accepted, confirm
    const confirmed = accept && (
      (isSeller && match.status === 'accepted_buyer') ||
      (!isSeller && match.status === 'accepted_seller')
    )

    const { error } = await supabase
      .from('matches')
      .update({
        status: confirmed ? 'confirmed' : newStatus,
        ...(isSeller && accept ? { seller_accepted_at: new Date().toISOString() } : {}),
        ...(!isSeller && accept ? { buyer_accepted_at: new Date().toISOString() } : {}),
        ...(confirmed ? { confirmed_at: new Date().toISOString() } : {}),
      })
      .eq('id', matchId)

    if (!error) loadMatches()
  }

  const pendingMatches = matches.filter(m => ['proposed', 'accepted_seller', 'accepted_buyer'].includes(m.status))
  const confirmedMatches = matches.filter(m => m.status === 'confirmed')
  const otherMatches = matches.filter(m => ['cancelled', 'expired'].includes(m.status))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Active Matching</h1>
          <p className="text-slate-500 mt-1">Matches, alertas, auto-bidding e leilões</p>
          <ScoreDisclaimer variant="inline" className="mt-2 max-w-xl" />
        </div>
        <Button onClick={runMatchingEngine} disabled={running}>
          {running ? (
            <><RefreshCw size={16} className="animate-spin" /> Executando...</>
          ) : (
            <><Zap size={16} /> Executar Matching</>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-600 p-1 rounded-xl">
        {[
          { key: 'matches', label: 'Matches', icon: <GitMerge size={14} />, count: matches.length },
          { key: 'alerts', label: 'Alertas', icon: <Bell size={14} />, count: alerts.filter(a => a.active).length },
          { key: 'autobid', label: 'Auto-Bid', icon: <Zap size={14} />, count: autoBidRules.filter(r => r.active).length },
          { key: 'auctions', label: 'Leilões', icon: <Gavel size={14} />, count: auctions.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.key
                ? 'bg-dark-700 shadow text-slate-900'
                : 'text-slate-500 hover:text-slate-600'
            }`}
          >
            {tab.icon} {tab.label}
            {tab.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-brand-500/20 text-brand-300' : 'bg-dark-500/50 text-slate-500'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {showAlertForm ? (
            <MatchAlertForm onSubmit={createAlert} onCancel={() => setShowAlertForm(false)} />
          ) : (
            <MatchAlertList
              alerts={alerts}
              onToggle={toggleAlert}
              onDelete={deleteAlert}
              onCreate={() => setShowAlertForm(true)}
            />
          )}
        </div>
      )}

      {/* Auto-Bid Tab */}
      {activeTab === 'autobid' && (
        <div className="space-y-4">
          {showAutoBidForm ? (
            <AutoBidForm onSubmit={createAutoBid} onCancel={() => setShowAutoBidForm(false)} />
          ) : (
            <AutoBidList
              rules={autoBidRules}
              onToggle={toggleAutoBid}
              onDelete={deleteAutoBid}
              onCreate={() => setShowAutoBidForm(true)}
            />
          )}
        </div>
      )}

      {/* Auctions Tab */}
      {activeTab === 'auctions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Leilões Abertos</h2>
            <span className="text-sm text-slate-500">{auctions.length} leiloes</span>
          </div>
          {auctions.length === 0 ? (
            <Card className="p-8 text-center">
              <Gavel size={28} className="mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">Nenhum leilão aberto no momento</p>
              <p className="text-xs text-slate-500 mt-1">Leilões silenciosos aparecerao aqui quando criados</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {auctions.map((auction: any) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && (<>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-sm text-slate-500">Total Matches</p>
          <p className="text-3xl font-bold mt-1">{matches.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-slate-500">Pendentes</p>
          <p className="text-3xl font-bold mt-1 text-amber-400">{pendingMatches.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-slate-500">Confirmados</p>
          <p className="text-3xl font-bold mt-1 text-emerald-400">{confirmedMatches.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-slate-500">Volume Total</p>
          <p className="text-2xl font-bold mt-1">
            {formatBRL(matches.reduce((a, m) => a + m.matched_amount, 0))}
          </p>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500/20 border-t-brand-400 rounded-full" />
        </div>
      ) : (
        <>
          {/* Pending Matches - Action Required */}
          {pendingMatches.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Aguardando Resposta</h2>
              <div className="space-y-3">
                {pendingMatches.map(match => {
                  const isSeller = match.seller_company_id === companyId
                  const needsMyAction = (
                    match.status === 'proposed' ||
                    (match.status === 'accepted_seller' && !isSeller) ||
                    (match.status === 'accepted_buyer' && isSeller)
                  )
                  const cfg = matchStatusConfig[match.status]

                  return (
                    <Card key={match.id} className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-brand-500/15 flex items-center justify-center">
                            <GitMerge size={24} className="text-brand-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg?.badge}`}>
                                {cfg?.label}
                              </span>
                              {match.listing?.credit_id && (
                                <span className="font-mono text-xs font-bold text-brand-400 bg-brand-500/15 px-2 py-0.5 rounded border border-brand-500/25">
                                  {match.listing.credit_id}
                                </span>
                              )}
                              {match.listing?.credit_score && (
                                <ScoreBadge grade={match.listing.credit_score.grade} size="sm" />
                              )}
                              {match.match_score && (
                                <span className="text-xs font-medium text-slate-500">
                                  Match: {match.match_score}%
                                </span>
                              )}
                              {needsMyAction && (
                                <Badge variant="warning">Sua ação necessária</Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">{match.seller_company?.nome_fantasia || 'Cedente'}</span>
                              <ArrowRight size={14} className="text-slate-500" />
                              <span className="font-medium">{match.buyer_company?.nome_fantasia || 'Cessionário'}</span>
                            </div>

                            <div className="flex gap-6 mt-2 text-sm text-slate-500">
                              <span>Valor: <strong className="text-white">{formatBRL(match.matched_amount)}</strong></span>
                              <span>Desconto: <strong className="text-white">{match.agreed_discount}%</strong></span>
                              <span>Taxa: <strong className="text-white">{formatBRL(match.platform_fee)}</strong></span>
                              <span>Liquido: <strong className="text-emerald-400">{formatBRL(match.net_to_seller)}</strong></span>
                            </div>
                          </div>
                        </div>

                        {needsMyAction && (
                          <div className="flex gap-2">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => respondToMatch(match.id, true)}
                            >
                              <Check size={14} /> Aceitar
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => respondToMatch(match.id, false)}
                            >
                              <X size={14} /> Recusar
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Confirmed Matches */}
          {confirmedMatches.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Matches Confirmados</h2>
              <div className="space-y-3">
                {confirmedMatches.map(match => (
                  <Card key={match.id} className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                          <Check size={20} className="text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-sm">
                            {match.listing?.credit_id && (
                              <span className="font-mono text-xs font-bold text-brand-400 bg-brand-500/15 px-1.5 py-0.5 rounded border border-brand-500/25">
                                {match.listing.credit_id}
                              </span>
                            )}
                            <span className="font-medium">{match.seller_company?.nome_fantasia}</span>
                            <ArrowRight size={14} className="text-slate-500" />
                            <span className="font-medium">{match.buyer_company?.nome_fantasia}</span>
                            {match.listing?.credit_score && (
                              <ScoreBadge grade={match.listing.credit_score.grade} size="sm" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Confirmado em {match.confirmed_at ? formatDate(match.confirmed_at) : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatBRL(match.matched_amount)}</p>
                        <p className="text-xs text-slate-500">{match.agreed_discount}% desconto</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {matches.length === 0 && (
            <Card className="p-12 text-center">
              <GitMerge size={40} className="mx-auto text-slate-600 mb-3" />
              <p className="text-lg font-medium text-slate-500">Nenhum match encontrado</p>
              <p className="text-sm text-slate-500 mt-1">
                Execute o matching engine para encontrar pares automaticamente
              </p>
              <Button className="mt-4" onClick={runMatchingEngine} disabled={running}>
                <Zap size={16} />
                Executar Matching
              </Button>
            </Card>
          )}
        </>
      )}
      </>)}
    </div>
  )
}
