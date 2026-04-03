'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL, formatDate, matchStatusConfig } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GitMerge, Zap, Check, X, RefreshCw, ArrowRight } from 'lucide-react'

export default function MatchingPage() {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    loadMatches()
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
        listing:credit_listings(credit_type, origin, amount),
        request:credit_requests(amount_needed, urgency)
      `)
      .or(`seller_company_id.eq.${company.id},buyer_company_id.eq.${company.id}`)
      .order('created_at', { ascending: false })

    setMatches(data || [])
    setLoading(false)
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
          <h1 className="text-2xl font-bold text-gray-900">Matching Engine</h1>
          <p className="text-gray-500 mt-1">Matches automaticos entre creditos e demandas</p>
        </div>
        <Button onClick={runMatchingEngine} disabled={running}>
          {running ? (
            <><RefreshCw size={16} className="animate-spin" /> Executando...</>
          ) : (
            <><Zap size={16} /> Executar Matching</>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Total Matches</p>
          <p className="text-3xl font-bold mt-1">{matches.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Pendentes</p>
          <p className="text-3xl font-bold mt-1 text-amber-600">{pendingMatches.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Confirmados</p>
          <p className="text-3xl font-bold mt-1 text-emerald-600">{confirmedMatches.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Volume Total</p>
          <p className="text-2xl font-bold mt-1">
            {formatBRL(matches.reduce((a, m) => a + m.matched_amount, 0))}
          </p>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full" />
        </div>
      ) : (
        <>
          {/* Pending Matches - Action Required */}
          {pendingMatches.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Aguardando Resposta</h2>
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
                          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
                            <GitMerge size={24} className="text-brand-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg?.badge}`}>
                                {cfg?.label}
                              </span>
                              {match.match_score && (
                                <span className="text-xs font-medium text-gray-500">
                                  Score: {match.match_score}%
                                </span>
                              )}
                              {needsMyAction && (
                                <Badge variant="warning">Sua acao necessaria</Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">{match.seller_company?.nome_fantasia || 'Cedente'}</span>
                              <ArrowRight size={14} className="text-gray-400" />
                              <span className="font-medium">{match.buyer_company?.nome_fantasia || 'Cessionario'}</span>
                            </div>

                            <div className="flex gap-6 mt-2 text-sm text-gray-500">
                              <span>Valor: <strong className="text-gray-900">{formatBRL(match.matched_amount)}</strong></span>
                              <span>Desconto: <strong className="text-gray-900">{match.agreed_discount}%</strong></span>
                              <span>Taxa: <strong className="text-gray-900">{formatBRL(match.platform_fee)}</strong></span>
                              <span>Liquido: <strong className="text-emerald-600">{formatBRL(match.net_to_seller)}</strong></span>
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
              <h2 className="text-lg font-bold text-gray-900 mb-3">Matches Confirmados</h2>
              <div className="space-y-3">
                {confirmedMatches.map(match => (
                  <Card key={match.id} className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                          <Check size={20} className="text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{match.seller_company?.nome_fantasia}</span>
                            <ArrowRight size={14} className="text-gray-400" />
                            <span className="font-medium">{match.buyer_company?.nome_fantasia}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Confirmado em {match.confirmed_at ? formatDate(match.confirmed_at) : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatBRL(match.matched_amount)}</p>
                        <p className="text-xs text-gray-500">{match.agreed_discount}% desconto</p>
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
              <GitMerge size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-lg font-medium text-gray-500">Nenhum match encontrado</p>
              <p className="text-sm text-gray-400 mt-1">
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
    </div>
  )
}
