'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreBadge } from '@/components/ui/score-badge'
import { formatBRL, formatDiscount, creditTypeLabels, creditOriginLabels } from '@/lib/utils'
import type { SilentAuction, AuctionBid } from '@/types/database'
import { Gavel, Clock, Users, TrendingDown, Trophy, Lock, X, AlertTriangle } from 'lucide-react'

// ==========================================
// Auction Card (lista de leiloes)
// ==========================================

interface AuctionCardProps {
  auction: SilentAuction & { listing?: any }
  myBid?: AuctionBid | null
  isSeller?: boolean
  onClick?: () => void
}

export function AuctionCard({ auction, myBid, isSeller, onClick }: AuctionCardProps) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function updateTime() {
      const end = new Date(auction.extended_until || auction.ends_at)
      const diff = end.getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('Encerrado')
        return
      }
      const hours = Math.floor(diff / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      if (hours > 24) {
        setTimeLeft(`${Math.floor(hours / 24)}d ${hours % 24}h`)
      } else {
        setTimeLeft(`${hours}h ${mins}m`)
      }
    }
    updateTime()
    const i = setInterval(updateTime, 60000)
    return () => clearInterval(i)
  }, [auction.ends_at, auction.extended_until])

  const listing = auction.listing
  const statusConfig: Record<string, { label: string; badge: string }> = {
    open: { label: 'Aberto', badge: 'bg-emerald-500/15 text-emerald-400' },
    closed: { label: 'Encerrado', badge: 'bg-dark-600 text-slate-900' },
    cancelled: { label: 'Cancelado', badge: 'bg-red-500/150/15 text-red-400' },
    no_bids: { label: 'Sem lances', badge: 'bg-amber-500/15 text-amber-400' },
  }
  const sc = statusConfig[auction.status] || statusConfig.open

  return (
    <Card className="p-4 cursor-pointer hover:shadow-md transition-all" hover onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center">
            <Gavel size={18} className="text-purple-600" />
          </div>
          <div>
            {listing?.credit_id && (
              <p className="font-mono text-xs font-bold text-brand-600">{listing.credit_id}</p>
            )}
            <p className="text-sm font-bold text-white">{formatBRL(listing?.amount || 0)}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.badge}`}>
          {sc.label}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
        {listing?.credit_type && (
          <span>{creditTypeLabels[listing.credit_type]}</span>
        )}
        {listing?.origin && (
          <span>{creditOriginLabels[listing.origin]}</span>
        )}
        {listing?.credit_score && (
          <ScoreBadge grade={listing.credit_score.grade} size="sm" />
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          {auction.visible_time_remaining && (
            <span className="flex items-center gap-1 text-slate-500">
              <Clock size={12} /> {timeLeft}
            </span>
          )}
          {auction.visible_bid_count && (
            <span className="flex items-center gap-1 text-slate-500">
              <Users size={12} /> {auction.unique_bidders} participantes
            </span>
          )}
          <span className="text-slate-500">
            Min: {formatDiscount(auction.min_discount)}
          </span>
        </div>

        {myBid && (
          <Badge variant={myBid.status === 'won' ? 'success' : myBid.status === 'outbid' ? 'danger' : 'info'}>
            {myBid.status === 'won' ? 'Vencedor!' :
             myBid.status === 'outbid' ? 'Superado' :
             `Meu lance: ${formatDiscount(myBid.bid_discount)}`}
          </Badge>
        )}

        {isSeller && auction.status === 'closed' && auction.final_discount && (
          <Badge variant="success">
            <Trophy size={10} /> Fechado: {formatDiscount(auction.final_discount)}
          </Badge>
        )}
      </div>
    </Card>
  )
}

// ==========================================
// Bid Form
// ==========================================

interface BidFormProps {
  auction: SilentAuction
  listingAmount: number
  currentBid?: AuctionBid | null
  onPlaceBid: (discount: number) => void
  loading?: boolean
}

export function BidForm({ auction, listingAmount, currentBid, onPlaceBid, loading }: BidFormProps) {
  const [discount, setDiscount] = useState(
    currentBid?.bid_discount?.toString() || auction.min_discount.toString()
  )

  const discountNum = Number(discount)
  const netValue = listingAmount * (1 - discountNum / 100)
  const isValid = discountNum >= auction.min_discount && discountNum <= 50

  if (auction.status !== 'open') {
    return (
      <Card className="p-4 text-center bg-dark-600/50">
        <Lock size={20} className="mx-auto text-slate-500 mb-2" />
        <p className="text-sm text-slate-500">Leilão encerrado</p>
        {auction.final_discount && (
          <p className="text-xs text-slate-500 mt-1">Lance vencedor: {formatDiscount(auction.final_discount)}</p>
        )}
      </Card>
    )
  }

  return (
    <Card className="p-5 border-purple-200 bg-gradient-to-br from-white to-purple-50/30">
      <div className="flex items-center gap-2 mb-4">
        <Gavel size={18} className="text-purple-600" />
        <h3 className="text-sm font-bold text-white">
          {currentBid ? 'Atualizar Lance' : 'Fazer Lance'}
        </h3>
      </div>

      {currentBid && (
        <div className="mb-3 p-2.5 rounded-lg bg-blue-500/15 border border-blue-500/25 text-xs">
          <p className="text-blue-400">
            Seu lance atual: <strong>{formatDiscount(currentBid.bid_discount)}</strong>
            {' '}(valor liquido: {formatBRL(listingAmount * (1 - currentBid.bid_discount / 100))})
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Seu desconto oferecido (%)
          </label>
          <input
            type="number"
            value={discount}
            onChange={e => setDiscount(e.target.value)}
            min={auction.min_discount}
            max={50}
            step={0.5}
            className="w-full rounded-xl border border-dark-500/50 px-4 py-2.5 text-lg font-bold text-center"
          />
          <p className="text-xs text-slate-500 mt-1">
            Mínimo: {formatDiscount(auction.min_discount)} · Menor desconto = melhor para o vendedor
          </p>
        </div>

        <div className="p-3 rounded-lg bg-dark-600/50">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Valor do crédito</span>
            <span className="font-medium">{formatBRL(listingAmount)}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-slate-500">Seu desconto</span>
            <span className="font-medium text-purple-400">{isValid ? formatDiscount(discountNum) : '—'}</span>
          </div>
          <div className="flex justify-between text-sm mt-1.5 pt-1.5 border-t border-dark-500/50">
            <span className="font-medium text-slate-600">Você pagaria</span>
            <span className="font-bold text-emerald-400">{isValid ? formatBRL(netValue) : '—'}</span>
          </div>
        </div>

        {!isValid && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/15 text-xs text-red-400">
            <AlertTriangle size={12} />
            Desconto deve ser entre {formatDiscount(auction.min_discount)} e 50%
          </div>
        )}

        <Button
          onClick={() => onPlaceBid(discountNum)}
          disabled={!isValid || loading}
          className="w-full"
        >
          {loading ? 'Enviando...' : currentBid ? 'Atualizar Lance' : 'Fazer Lance'}
        </Button>
      </div>
    </Card>
  )
}

// ==========================================
// Create Auction Form
// ==========================================

interface CreateAuctionFormProps {
  listingId: string
  onSubmit: (data: any) => void
  onCancel: () => void
  loading?: boolean
}

export function CreateAuctionForm({ listingId, onSubmit, onCancel, loading }: CreateAuctionFormProps) {
  const [form, setForm] = useState({
    min_discount: '5',
    reserve_discount: '',
    duration_hours: '24',
    auto_extend: true,
    visible_bid_count: true,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      action: 'create_auction',
      listing_id: listingId,
      min_discount: Number(form.min_discount),
      reserve_discount: form.reserve_discount ? Number(form.reserve_discount) : null,
      duration_hours: Number(form.duration_hours),
      auto_extend: form.auto_extend,
      visible_bid_count: form.visible_bid_count,
    })
  }

  return (
    <Card className="p-5 border-purple-200">
      <div className="flex items-center gap-2 mb-4">
        <Gavel size={18} className="text-purple-600" />
        <h3 className="text-sm font-bold text-white">Criar Leilão Silencioso</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Os compradores fazem lances sem ver os lances dos outros. O menor desconto vence.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Desconto Mínimo (%)</label>
            <input
              type="number"
              value={form.min_discount}
              onChange={e => setForm({ ...form, min_discount: e.target.value })}
              min={1} max={40} step={0.5}
              className="w-full rounded-xl border border-dark-500/50 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Desconto Reserva (%)</label>
            <input
              type="number"
              value={form.reserve_discount}
              onChange={e => setForm({ ...form, reserve_discount: e.target.value })}
              min={0} max={50} step={0.5}
              placeholder="Opcional (preco mínimo)"
              className="w-full rounded-xl border border-dark-500/50 px-3 py-2 text-sm"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">Não vende se desconto for maior que isso</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Duracao</label>
          <select
            value={form.duration_hours}
            onChange={e => setForm({ ...form, duration_hours: e.target.value })}
            className="w-full rounded-xl border border-dark-500/50 px-3 py-2 text-sm"
          >
            <option value="6">6 horas</option>
            <option value="12">12 horas</option>
            <option value="24">24 horas</option>
            <option value="48">48 horas</option>
            <option value="72">72 horas</option>
            <option value="168">7 dias</option>
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={form.auto_extend}
              onChange={e => setForm({ ...form, auto_extend: e.target.checked })}
              className="rounded"
            />
            Auto-estender se lance nos ultimos 5 min
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={form.visible_bid_count}
              onChange={e => setForm({ ...form, visible_bid_count: e.target.checked })}
              className="rounded"
            />
            Mostrar qtd de lances
          </label>
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Criando...' : 'Criar Leilão'}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}
