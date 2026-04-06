'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL, formatDate, creditTypeLabels, creditOriginLabels, homologationConfig, creditScoreConfig } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreBadge } from '@/components/ui/score-badge'
import { CreditIdCard } from '@/components/ui/credit-id-card'
import { PriceRecommendationCard } from '@/components/ui/price-recommendation'
import { MarketBenchmarkCard } from '@/components/ui/market-benchmark'
import { CreateAuctionForm } from '@/components/ui/silent-auction'
import { DollarSign, Plus, Search, Filter, X, Shield, TrendingUp, Target, Gavel } from 'lucide-react'
import { ScoreDisclaimer } from '@/components/compliance/score-disclaimer'
import { CurrencyInput, PercentInput } from '@/components/ui/currency-input'

export default function MarketplacePage() {
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)
  const [filter, setFilter] = useState({ type: '', origin: '', status: 'active', grade: '' })
  const [viewMode, setViewMode] = useState<'cards' | 'grid'>('cards')
  const [newListing, setNewListing] = useState({
    credit_type: 'acumulado',
    origin: 'exportacao',
    amount: '',
    min_discount: '5',
    max_discount: '20',
    e_credac_protocol: '',
    modalidade_apropriacao: 'simplificado',
    status_homologacao: 'homologado',
    conta_corrente_status: 'ativa',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [benchmarks, setBenchmarks] = useState<any[]>([])
  const [selectedListing, setSelectedListing] = useState<any>(null)
  const [priceRec, setPriceRec] = useState<any>(null)
  const [priceRecLoading, setPriceRecLoading] = useState(false)
  const [showAuctionForm, setShowAuctionForm] = useState<string | null>(null)
  const [auctionLoading, setAuctionLoading] = useState(false)

  useEffect(() => {
    loadListings()
    loadBenchmarks()
  }, [filter])

  async function loadListings() {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('credit_listings')
      .select('*, company:companies(*), credit_score:credit_scores(*)')
      .order('created_at', { ascending: false })

    if (filter.status) query = query.eq('status', filter.status)
    if (filter.type) query = query.eq('credit_type', filter.type)
    if (filter.origin) query = query.eq('origin', filter.origin)

    const { data } = await query

    // Filtro por grade (client-side pois e um join)
    let filtered = data || []
    if (filter.grade) {
      filtered = filtered.filter((l: any) => l.credit_score?.grade === filter.grade)
    }

    // Ordenar por score (maior primeiro)
    filtered.sort((a: any, b: any) => {
      const scoreA = a.credit_score?.score || 0
      const scoreB = b.credit_score?.score || 0
      return scoreB - scoreA
    })

    setListings(filtered)
    setLoading(false)
  }

  async function loadBenchmarks() {
    try {
      let url = '/api/pricing?'
      if (filter.type) url += `type=${filter.type}&`
      if (filter.origin) url += `origin=${filter.origin}&`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setBenchmarks(data.benchmarks || [])
      }
    } catch (err) {
      console.error('Failed to load benchmarks:', err)
    }
  }

  async function loadPriceRecommendation(listingId: string) {
    setPriceRecLoading(true)
    setPriceRec(null)
    try {
      const res = await fetch(`/api/pricing?listing_id=${listingId}`)
      if (res.ok) {
        const data = await res.json()
        // Validar que recommendation é um objeto com campos esperados
        const r = data.recommendation
        if (r && typeof r === 'object' && typeof r.recommended_discount === 'number') {
          setPriceRec(r)
        } else {
          setPriceRec(null)
        }
      }
    } catch (err) {
      console.error('Failed to load price recommendation:', err)
    }
    setPriceRecLoading(false)
  }

  function handleListingClick(listing: any) {
    setSelectedListing(listing)
    loadPriceRecommendation(listing.id)
  }

  async function handleCreateAuction(data: any) {
    setAuctionLoading(true)
    try {
      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) setShowAuctionForm(null)
    } catch (err) { console.error(err) }
    setAuctionLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credit_type: newListing.credit_type,
          origin: newListing.origin,
          amount: Number(newListing.amount),
          min_discount: Number(newListing.min_discount),
          max_discount: Number(newListing.max_discount),
          e_credac_protocol: newListing.e_credac_protocol || undefined,
          description: newListing.description || undefined,
        }),
      })
      if (res.ok) {
        setShowNewForm(false)
        setNewListing({ credit_type: 'acumulado', origin: 'exportacao', amount: '', min_discount: '5', max_discount: '20', e_credac_protocol: '', modalidade_apropriacao: 'simplificado', status_homologacao: 'homologado', conta_corrente_status: 'ativa', description: '' })
        loadListings()
      }
    } catch (err) {
      console.error(err)
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketplace de Créditos</h1>
          <p className="text-slate-400 mt-1">Créditos acumulados de ICMS homologados e disponíveis para transferência via e-CredAc</p>
          <ScoreDisclaimer variant="inline" className="mt-2 max-w-xl" />
        </div>
        <Button onClick={() => setShowNewForm(true)}>
          <Plus size={16} />
          Publicar Crédito
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-400">Filtros:</span>
          </div>
          <select
            value={filter.type}
            onChange={e => setFilter({ ...filter, type: e.target.value })}
            className="rounded-xl border border-dark-500/50 bg-dark-700 text-white px-3 py-1.5 text-sm"
          >
            <option value="">Todos os tipos</option>
            <option value="acumulado">Crédito Acumulado</option>
            <option value="st">Subst. Tributária</option>
            <option value="rural">Produtor Rural</option>
            <option value="outorgado">Crédito Outorgado</option>
          </select>
          <select
            value={filter.origin}
            onChange={e => setFilter({ ...filter, origin: e.target.value })}
            className="rounded-xl border border-dark-500/50 bg-dark-700 text-white px-3 py-1.5 text-sm"
          >
            <option value="">Todas as origens</option>
            <option value="exportacao">Exportação (Art. 7º, V)</option>
            <option value="diferimento">Diferimento</option>
            <option value="aliquota_reduzida">Alíquota Reduzida</option>
            <option value="isencao">Isenção / Não Incidência</option>
            <option value="aliquotas_diversificadas">Alíquotas Diversificadas</option>
            <option value="substituicao_tributaria">Subst. Tributária</option>
          </select>
          <select
            value={filter.status}
            onChange={e => setFilter({ ...filter, status: e.target.value })}
            className="rounded-xl border border-dark-500/50 bg-dark-700 text-white px-3 py-1.5 text-sm"
          >
            <option value="active">Ativos</option>
            <option value="">Todos</option>
            <option value="matched">Matched</option>
            <option value="sold">Vendidos</option>
          </select>
          <select
            value={filter.grade}
            onChange={e => setFilter({ ...filter, grade: e.target.value })}
            className="rounded-xl border border-dark-500/50 bg-dark-700 text-white px-3 py-1.5 text-sm"
          >
            <option value="">Todos os Score Relius</option>
            <option value="A">Score Relius A — Excelente</option>
            <option value="B">Score Relius B — Bom</option>
            <option value="C">Score Relius C — Regular</option>
            <option value="D">Score Relius D — Alto risco</option>
          </select>
        </div>
      </Card>

      {/* Market Benchmark Summary */}
      {benchmarks.length > 0 && (
        <MarketBenchmarkCard
          benchmarks={benchmarks}
          selectedType={filter.type || undefined}
          selectedOrigin={filter.origin || undefined}
          compact
        />
      )}

      {/* Listings Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500/20 border-t-brand-400 rounded-full" />
        </div>
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(listing => (
            <div key={listing.id}>
              <CreditIdCard
                listing={listing}
                score={listing.credit_score}
                onClick={() => handleListingClick(listing)}
              />
              <div className="mt-2 flex gap-2 px-1">
                <Button variant="primary" size="sm" className="flex-1">
                  Tenho Interesse
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleListingClick(listing)}>
                  <Target size={14} /> Preço
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowAuctionForm(listing.id)}>
                  <Gavel size={14} />
                </Button>
              </div>
              {showAuctionForm === listing.id && (
                <div className="mt-2">
                  <CreateAuctionForm
                    listingId={listing.id}
                    onSubmit={handleCreateAuction}
                    onCancel={() => setShowAuctionForm(null)}
                    loading={auctionLoading}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <DollarSign size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-lg font-medium text-slate-400">Nenhum crédito encontrado</p>
          <p className="text-sm text-slate-500 mt-1">Ajuste os filtros ou publique o primeiro crédito</p>
          <Button className="mt-4" onClick={() => setShowNewForm(true)}>
            <Plus size={16} />
            Publicar Crédito
          </Button>
        </Card>
      )}

      {/* Listing Detail + Pricing Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setSelectedListing(null); setPriceRec(null) }}>
          <div className="bg-dark-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-dark-500/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target size={20} className="text-blue-600" />
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {selectedListing.credit_id || 'Crédito'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {creditTypeLabels[selectedListing.credit_type]} · {creditOriginLabels[selectedListing.origin]} · {formatBRL(selectedListing.amount)}
                  </p>
                </div>
                {selectedListing.credit_score && (
                  <ScoreBadge grade={selectedListing.credit_score.grade} score={selectedListing.credit_score.score} size="md" showScore />
                )}
              </div>
              <button onClick={() => { setSelectedListing(null); setPriceRec(null) }} className="p-2 rounded-xl hover:bg-dark-600/50">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <PriceRecommendationCard
                recommendation={priceRec}
                listingAmount={selectedListing.amount}
                currentDiscount={{
                  min: selectedListing.min_discount,
                  max: selectedListing.max_discount,
                }}
                onRecalculate={() => loadPriceRecommendation(selectedListing.id)}
                loading={priceRecLoading}
              />

              {/* Benchmark for this credit type */}
              {benchmarks.length > 0 && (
                <MarketBenchmarkCard
                  benchmarks={benchmarks}
                  selectedType={selectedListing.credit_type}
                  selectedOrigin={selectedListing.origin}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Listing Form Modal */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowNewForm(false)}>
          <div className="bg-dark-700 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-dark-500/40 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Publicar Crédito</h2>
              <button onClick={() => setShowNewForm(false)} className="p-2 rounded-xl hover:bg-dark-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Crédito</label>
                  <select
                    value={newListing.credit_type}
                    onChange={e => setNewListing({ ...newListing, credit_type: e.target.value })}
                    className="w-full rounded-xl border border-dark-500/50 bg-dark-700 text-white px-4 py-2.5 text-sm"
                  >
                    <option value="acumulado">Crédito Acumulado</option>
                    <option value="st">Subst. Tributária</option>
                    <option value="rural">Produtor Rural</option>
                    <option value="outorgado">Crédito Outorgado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Hipótese de Geração</label>
                  <select
                    value={newListing.origin}
                    onChange={e => setNewListing({ ...newListing, origin: e.target.value })}
                    className="w-full rounded-xl border border-dark-500/50 bg-dark-700 text-white px-4 py-2.5 text-sm"
                  >
                    <option value="exportacao">Exportação (Art. 7º, V RICMS)</option>
                    <option value="diferimento">Diferimento</option>
                    <option value="aliquota_reduzida">Alíquota Reduzida</option>
                    <option value="isencao">Isenção / Não Incidência</option>
                    <option value="aliquotas_diversificadas">Alíquotas Diversificadas</option>
                    <option value="substituicao_tributaria">Subst. Tributária</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Valor do Crédito em Conta Corrente (R$)</label>
                <CurrencyInput
                  value={newListing.amount}
                  onChange={(raw) => setNewListing({ ...newListing, amount: raw })}
                  placeholder="1.000.000,00"
                  required
                />
              </div>

              {/* Campos SEFAZ e-CredAc */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Modalidade de Apropriação</label>
                  <select
                    value={newListing.modalidade_apropriacao}
                    onChange={e => setNewListing({ ...newListing, modalidade_apropriacao: e.target.value })}
                    className="w-full rounded-xl border border-dark-500/50 bg-dark-700 text-white px-4 py-2.5 text-sm"
                  >
                    <option value="simplificado">Apuração Simplificada (até 10.000 UFESPs)</option>
                    <option value="custeio">Sistemática de Custeio (sem limite)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Status da Homologação</label>
                  <select
                    value={newListing.status_homologacao}
                    onChange={e => setNewListing({ ...newListing, status_homologacao: e.target.value })}
                    className="w-full rounded-xl border border-dark-500/50 bg-dark-700 text-white px-4 py-2.5 text-sm"
                  >
                    <option value="homologado">Homologado (pronto para transferir)</option>
                    <option value="deferido">Deferido (em conta corrente)</option>
                    <option value="em_analise">Em Análise Fiscal</option>
                    <option value="arquivo_enviado">Arquivo Digital Enviado</option>
                  </select>
                </div>
              </div>

              {newListing.status_homologacao !== 'homologado' && newListing.status_homologacao !== 'deferido' && (
                <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3">
                  <p className="text-xs text-amber-400">
                    ⚠️ Créditos ainda não homologados pela SEFAZ ficam visíveis no marketplace, mas só podem ser negociados após a homologação e registro na conta corrente do e-CredAc.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Deságio Mínimo (%)</label>
                  <PercentInput
                    value={newListing.min_discount}
                    onChange={(raw) => setNewListing({ ...newListing, min_discount: raw })}
                    min={0} max={50}
                    placeholder="5,00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Deságio Máximo (%)</label>
                  <PercentInput
                    value={newListing.max_discount}
                    onChange={(raw) => setNewListing({ ...newListing, max_discount: raw })}
                    min={0} max={50}
                    placeholder="20,00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Protocolo e-CredAc / Visto Eletrônico</label>
                <input
                  type="text"
                  value={newListing.e_credac_protocol}
                  onChange={e => setNewListing({ ...newListing, e_credac_protocol: e.target.value })}
                  placeholder="Nº do protocolo de apropriação ou visto eletrônico (12 dígitos)"
                  className="w-full rounded-xl border border-dark-500/50 bg-dark-700 text-white px-4 py-2.5 text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Obtido no sistema e-CredAc da SEFAZ-SP após deferimento</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Observações (opcional)</label>
                <textarea
                  value={newListing.description}
                  onChange={e => setNewListing({ ...newListing, description: e.target.value })}
                  rows={3}
                  placeholder="Detalhes adicionais sobre o crédito..."
                  className="w-full rounded-xl border border-dark-500/50 bg-dark-700 text-white px-4 py-2.5 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? 'Publicando...' : 'Publicar Crédito'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowNewForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
      }
