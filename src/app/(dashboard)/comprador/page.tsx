"use client"

import { useEffect, useState } from 'react'
import { createClientSupabase } from '@/lib/supabase/client'

interface CreditListing {
  id: string
  credit_type: string
  amount: number
  remaining_amount: number
  desagio_percentual: number
  nivel: string
  score_probabilidade: number
  status: string
  track: string
  created_at: string
}

interface Match {
  id: string
  matched_amount: number
  agreed_discount: number
  total_payment: number
  status: string
  created_at: string
  expires_at: string
}

interface Transaction {
  id: string
  credit_amount: number
  total_payment: number
  payment_status: string
  status: string
  created_at: string
}

interface EscrowParcela {
  id: string
  transaction_id: string
  numero_parcela: number
  percentual: number
  valor_centavos: number
  marco_liberacao: number
  status: string
}

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  initiated: 'bg-purple-100 text-purple-800',
  paid: 'bg-green-100 text-green-800',
  aguardando_pagamento: 'bg-yellow-100 text-yellow-800',
  liberado: 'bg-green-100 text-green-800',
  pago: 'bg-blue-100 text-blue-800',
}

export default function CompradorDashboard() {
  const [listings, setListings] = useState<CreditListing[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [parcelas, setParcelas] = useState<EscrowParcela[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'mercado' | 'negociacoes' | 'transacoes' | 'escrow'>('mercado')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const supabase = createClientSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: company } = await (supabase as any)
      .from('companies')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (!company) { setLoading(false); return }

    // Créditos disponíveis no mercado (Trilho A)
    const { data: listingsData } = await (supabase as any)
      .from('credit_listings')
      .select('id, credit_type, amount, remaining_amount, desagio_percentual, nivel, score_probabilidade, status, track, created_at')
      .eq('status', 'active')
      .eq('track', 'trilho_a')
      .neq('company_id', company.id)
      .order('score_probabilidade', { ascending: false })
      .limit(50)

    // Meus matches como comprador
    const { data: matchesData } = await (supabase as any)
      .from('matches')
      .select('id, matched_amount, agreed_discount, total_payment, status, created_at, expires_at')
      .eq('buyer_company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Minhas transações como comprador
    const { data: txData } = await (supabase as any)
      .from('transactions')
      .select('id, credit_amount, total_payment, payment_status, status, created_at')
      .eq('buyer_company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Parcelas de escrow
    if (txData?.length) {
      const txIds = txData.map((t: any) => t.id)
      const { data: parcelasData } = await (supabase as any)
        .from('escrow_parcelas')
        .select('*')
        .in('transaction_id', txIds)
        .order('numero_parcela')
      setParcelas(parcelasData ?? [])
    }

    setListings(listingsData ?? [])
    setMatches(matchesData ?? [])
    setTransactions(txData ?? [])
    setLoading(false)
  }

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const fmtPct = (v: number) => `${v.toFixed(1)}%`

  const filteredListings = listings.filter(l =>
    filter === '' || l.credit_type.toLowerCase().includes(filter.toLowerCase())
  )

  const kpis = {
    creditos_disponiveis: listings.length,
    negociacoes_ativas: matches.filter(m => ['pending', 'confirmed'].includes(m.status)).length,
    volume_negociado: transactions.reduce((s, t) => s + Number(t.total_payment ?? 0), 0),
    escrow_aguardando: parcelas.filter(p => p.status === 'aguardando_pagamento').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Comprador</h1>
          <p className="text-sm text-gray-500 mt-1">Créditos PIS/COFINS disponíveis para aquisição — Trilho A</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Créditos Disponíveis', value: kpis.creditos_disponiveis, color: 'blue' },
            { label: 'Negociações Ativas', value: kpis.negociacoes_ativas, color: 'yellow' },
            { label: 'Volume Negociado', value: fmt(kpis.volume_negociado), color: 'green' },
            { label: 'Escrow Aguardando', value: kpis.escrow_aguardando, color: 'purple' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            {(['mercado', 'negociacoes', 'transacoes', 'escrow'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'mercado' ? 'Mercado' :
                 t === 'negociacoes' ? 'Minhas Negociações' :
                 t === 'transacoes' ? 'Transações' : 'Escrow'}
              </button>
            ))}
          </nav>
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        )}

        {/* MERCADO */}
        {!loading && tab === 'mercado' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Filtrar por tipo de crédito..."
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
              <span className="text-sm text-gray-500 self-center">{filteredListings.length} créditos</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Tipo', 'Valor', 'Deságio', 'Nível', 'Score', 'Track', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredListings.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{l.credit_type}</td>
                      <td className="px-4 py-3">{fmt(Number(l.remaining_amount ?? l.amount))}</td>
                      <td className="px-4 py-3 text-green-700 font-medium">{fmtPct(Number(l.desagio_percentual ?? 0))}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          l.nivel === 'ouro' ? 'bg-yellow-100 text-yellow-800' :
                          l.nivel === 'prata' ? 'bg-gray-100 text-gray-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>{l.nivel}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 rounded-full h-1.5"
                              style={{ width: `${Math.min(l.score_probabilidade ?? 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{l.score_probabilidade ?? 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-blue-600">{l.track ?? '—'}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`/creditos/${l.id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Ver detalhes →
                        </a>
                      </td>
                    </tr>
                  ))}
                  {filteredListings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        Nenhum crédito disponível no momento
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* NEGOCIAÇÕES */}
        {!loading && tab === 'negociacoes' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Match ID', 'Valor', 'Deságio', 'Pagamento', 'Status', 'Expira'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {matches.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3">{fmt(Number(m.matched_amount))}</td>
                    <td className="px-4 py-3 text-green-700">{fmtPct(Number(m.agreed_discount))}</td>
                    <td className="px-4 py-3 font-medium">{fmt(Number(m.total_payment ?? 0))}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[m.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(m.expires_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
                {matches.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sem negociações</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TRANSAÇÕES */}
        {!loading && tab === 'transacoes' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['ID', 'Crédito', 'Pagamento', 'Pagamento Status', 'Status', 'Data'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3">{fmt(Number(t.credit_amount))}</td>
                    <td className="px-4 py-3 font-medium">{fmt(Number(t.total_payment))}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[t.payment_status] ?? 'bg-gray-100'}`}>
                        {t.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[t.status] ?? 'bg-gray-100'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(t.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sem transações</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ESCROW */}
        {!loading && tab === 'escrow' && (
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">Nenhuma transação com escrow</div>
            ) : (
              transactions.map(tx => {
                const txParcelas = parcelas.filter(p => p.transaction_id === tx.id)
                if (!txParcelas.length) return null
                return (
                  <div key={tx.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="font-medium text-sm">Transação {tx.id.slice(0, 8)}...</p>
                        <p className="text-xs text-gray-500">{fmt(Number(tx.total_payment))}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[tx.status] ?? 'bg-gray-100'}`}>
                        {tx.status}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {txParcelas.map(p => (
                        <div key={p.id} className="flex items-center justify-between py-2 border-t border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              p.status === 'liberado' ? 'bg-green-100 text-green-700' :
                              p.status === 'pago' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{p.numero_parcela}</div>
                            <div>
                              <p className="text-sm">Marco {p.marco_liberacao} — {p.percentual}%</p>
                              <p className="text-xs text-gray-500">
                                {fmt(p.valor_centavos / 100)}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[p.status] ?? 'bg-gray-100'}`}>
                            {p.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
