'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL, formatDate, creditTypeLabels, creditOriginLabels, homologationConfig } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DollarSign, Plus, Search, Filter, X } from 'lucide-react'

export default function MarketplacePage() {
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)
  const [filter, setFilter] = useState({ type: '', origin: '', status: 'active' })
  const [newListing, setNewListing] = useState({
    credit_type: 'acumulado',
    origin: 'exportacao',
    amount: '',
    min_discount: '5',
    max_discount: '20',
    e_credac_protocol: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadListings()
  }, [filter])

  async function loadListings() {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('credit_listings')
      .select('*, company:companies(*)')
      .order('created_at', { ascending: false })

    if (filter.status) query = query.eq('status', filter.status)
    if (filter.type) query = query.eq('credit_type', filter.type)
    if (filter.origin) query = query.eq('origin', filter.origin)

    const { data } = await query
    setListings(data || [])
    setLoading(false)
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
        setNewListing({ credit_type: 'acumulado', origin: 'exportacao', amount: '', min_discount: '5', max_discount: '20', e_credac_protocol: '', description: '' })
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
          <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-gray-500 mt-1">Creditos de ICMS disponiveis para negociacao</p>
        </div>
        <Button onClick={() => setShowNewForm(true)}>
          <Plus size={16} />
          Publicar Credito
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Filtros:</span>
          </div>
          <select
            value={filter.type}
            onChange={e => setFilter({ ...filter, type: e.target.value })}
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm"
          >
            <option value="">Todos os tipos</option>
            <option value="acumulado">Acumulado</option>
            <option value="st">Subst. Tributaria</option>
            <option value="rural">Rural</option>
          </select>
          <select
            value={filter.origin}
            onChange={e => setFilter({ ...filter, origin: e.target.value })}
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm"
          >
            <option value="">Todas as origens</option>
            <option value="exportacao">Exportacao</option>
            <option value="diferimento">Diferimento</option>
            <option value="aliquota_reduzida">Aliquota Reduzida</option>
            <option value="substituicao_tributaria">Subst. Tributaria</option>
          </select>
          <select
            value={filter.status}
            onChange={e => setFilter({ ...filter, status: e.target.value })}
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm"
          >
            <option value="active">Ativos</option>
            <option value="">Todos</option>
            <option value="matched">Matched</option>
            <option value="sold">Vendidos</option>
          </select>
        </div>
      </Card>

      {/* Listings Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full" />
        </div>
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(listing => (
            <Card key={listing.id} className="p-5" hover>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge variant="info">
                    {creditTypeLabels[listing.credit_type] || listing.credit_type}
                  </Badge>
                  <Badge variant="default" className="ml-1">
                    {creditOriginLabels[listing.origin] || listing.origin}
                  </Badge>
                </div>
                <span className={homologationConfig[listing.homologation_status]?.badge || 'bg-gray-100 text-gray-700'}>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium">
                    {homologationConfig[listing.homologation_status]?.label || listing.homologation_status}
                  </span>
                </span>
              </div>

              <p className="text-2xl font-bold text-gray-900">{formatBRL(listing.amount)}</p>
              <p className="text-sm text-gray-500 mt-1">
                Restante: {formatBRL(listing.remaining_amount)}
              </p>

              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Desconto</span>
                  <span className="font-medium">{listing.min_discount}% — {listing.max_discount}%</span>
                </div>
                {listing.e_credac_protocol && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Protocolo</span>
                    <span className="font-mono text-xs">{listing.e_credac_protocol}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Empresa</span>
                  <span className="font-medium">{listing.company?.nome_fantasia || 'Anonimo'}</span>
                </div>
              </div>

              {listing.description && (
                <p className="mt-3 text-xs text-gray-400">{listing.description}</p>
              )}

              <div className="mt-4 flex gap-2">
                <Button variant="primary" size="sm" className="flex-1">
                  Tenho Interesse
                </Button>
                <Button variant="secondary" size="sm">
                  Detalhes
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <DollarSign size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-lg font-medium text-gray-500">Nenhum credito encontrado</p>
          <p className="text-sm text-gray-400 mt-1">Ajuste os filtros ou publique o primeiro credito</p>
          <Button className="mt-4" onClick={() => setShowNewForm(true)}>
            <Plus size={16} />
            Publicar Credito
          </Button>
        </Card>
      )}

      {/* New Listing Form Modal */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowNewForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Publicar Credito</h2>
              <button onClick={() => setShowNewForm(false)} className="p-2 rounded-xl hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Credito</label>
                  <select
                    value={newListing.credit_type}
                    onChange={e => setNewListing({ ...newListing, credit_type: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                  >
                    <option value="acumulado">Acumulado</option>
                    <option value="st">Subst. Tributaria</option>
                    <option value="rural">Rural</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
                  <select
                    value={newListing.origin}
                    onChange={e => setNewListing({ ...newListing, origin: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                  >
                    <option value="exportacao">Exportacao</option>
                    <option value="diferimento">Diferimento</option>
                    <option value="aliquota_reduzida">Aliquota Reduzida</option>
                    <option value="substituicao_tributaria">Subst. Tributaria</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Credito (R$)</label>
                <input
                  type="number"
                  value={newListing.amount}
                  onChange={e => setNewListing({ ...newListing, amount: e.target.value })}
                  placeholder="Ex: 500000"
                  required
                  min={1000}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desconto Minimo (%)</label>
                  <input
                    type="number"
                    value={newListing.min_discount}
                    onChange={e => setNewListing({ ...newListing, min_discount: e.target.value })}
                    min={0} max={50} step={0.5}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desconto Maximo (%)</label>
                  <input
                    type="number"
                    value={newListing.max_discount}
                    onChange={e => setNewListing({ ...newListing, max_discount: e.target.value })}
                    min={0} max={50} step={0.5}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Protocolo E-CREDac (opcional)</label>
                <input
                  type="text"
                  value={newListing.e_credac_protocol}
                  onChange={e => setNewListing({ ...newListing, e_credac_protocol: e.target.value })}
                  placeholder="Numero do protocolo"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descricao (opcional)</label>
                <textarea
                  value={newListing.description}
                  onChange={e => setNewListing({ ...newListing, description: e.target.value })}
                  rows={3}
                  placeholder="Detalhes adicionais sobre o credito..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? 'Publicando...' : 'Publicar Credito'}
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
