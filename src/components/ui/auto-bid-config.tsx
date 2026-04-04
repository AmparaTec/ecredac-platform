'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatBRL, creditTypeLabels } from '@/lib/utils'
import type { AutoBidRule } from '@/types/database'
import { Zap, ZapOff, Plus, Trash2, Settings, Trophy, X, Check } from 'lucide-react'

interface AutoBidListProps {
  rules: AutoBidRule[]
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
  onCreate: () => void
}

export function AutoBidList({ rules, onToggle, onDelete, onCreate }: AutoBidListProps) {
  const strategyLabels: Record<string, string> = {
    fixed: 'Desconto Fixo',
    market: 'Seguir Mercado',
    aggressive: 'Agressivo',
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-amber-600" />
          <h3 className="text-sm font-bold text-gray-900">Auto-Bidding</h3>
          <Badge variant="warning">{rules.filter(r => r.active).length} ativas</Badge>
        </div>
        <Button size="sm" onClick={onCreate}>
          <Plus size={14} /> Nova Regra
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="p-8 text-center">
          <Zap size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Nenhuma regra de auto-bid</p>
          <p className="text-xs text-gray-400 mt-1">
            Configure regras para fazer lances automaticos quando creditos compativeis surgirem
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {rules.map(rule => (
            <div key={rule.id} className={`p-4 flex items-center gap-4 ${!rule.active ? 'opacity-50' : ''}`}>
              <button
                onClick={() => onToggle(rule.id, !rule.active)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  rule.active
                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {rule.active ? <Zap size={16} /> : <ZapOff size={16} />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                  <Badge variant="info">{strategyLabels[rule.bid_strategy]}</Badge>
                  {rule.min_grade && (
                    <span className="text-xs text-gray-500">Grade min: {rule.min_grade}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>Max desconto: {rule.max_bid_discount}%</span>
                  {rule.max_total_exposure && (
                    <span>Exposicao: {formatBRL(rule.current_exposure)} / {formatBRL(rule.max_total_exposure)}</span>
                  )}
                  <span>Hoje: {rule.bids_today}/{rule.max_bids_per_day}</span>
                </div>
              </div>

              <div className="text-right text-xs">
                <div className="flex items-center gap-1 text-emerald-600">
                  <Trophy size={10} />
                  <span>{rule.total_won}/{rule.total_bids} ganhos</span>
                </div>
                {rule.total_volume_won > 0 && (
                  <p className="text-gray-400">{formatBRL(rule.total_volume_won)} em volume</p>
                )}
              </div>

              <button
                onClick={() => onDelete(rule.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ==========================================
// Auto-Bid Rule Form
// ==========================================

interface AutoBidFormProps {
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function AutoBidForm({ onSubmit, onCancel }: AutoBidFormProps) {
  const [form, setForm] = useState({
    name: '',
    bid_strategy: 'fixed',
    fixed_discount: '12',
    market_offset: '0',
    max_bid_discount: '20',
    min_bid_discount: '5',
    min_grade: '',
    min_amount: '',
    max_amount: '',
    max_total_exposure: '',
    max_single_bid: '',
    max_bids_per_day: '10',
    homologation_required: false,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      name: form.name,
      bid_strategy: form.bid_strategy,
      fixed_discount: form.bid_strategy === 'fixed' ? Number(form.fixed_discount) : null,
      market_offset: form.bid_strategy === 'market' ? Number(form.market_offset) : null,
      max_bid_discount: Number(form.max_bid_discount),
      min_bid_discount: Number(form.min_bid_discount),
      min_grade: form.min_grade || null,
      min_amount: form.min_amount ? Number(form.min_amount) : null,
      max_amount: form.max_amount ? Number(form.max_amount) : null,
      max_total_exposure: form.max_total_exposure ? Number(form.max_total_exposure) : null,
      max_single_bid: form.max_single_bid ? Number(form.max_single_bid) : null,
      max_bids_per_day: Number(form.max_bids_per_day),
      homologation_required: form.homologation_required,
    })
  }

  return (
    <Card className="p-5 border-amber-200">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={18} className="text-amber-600" />
        <h3 className="text-sm font-bold text-gray-900">Nova Regra de Auto-Bid</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome da Regra</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Comprar creditos A de exportacao"
            required
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estrategia</label>
            <select
              value={form.bid_strategy}
              onChange={e => setForm({ ...form, bid_strategy: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="fixed">Desconto Fixo</option>
              <option value="market">Seguir Mercado</option>
              <option value="aggressive">Agressivo (comecar baixo)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grade Minima</label>
            <select
              value={form.min_grade}
              onChange={e => setForm({ ...form, min_grade: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Qualquer</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>
        </div>

        {form.bid_strategy === 'fixed' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desconto Fixo (%)</label>
            <input
              type="number"
              value={form.fixed_discount}
              onChange={e => setForm({ ...form, fixed_discount: e.target.value })}
              min={1} max={40} step={0.5}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        )}

        {form.bid_strategy === 'market' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Offset sobre media (%)</label>
            <input
              type="number"
              value={form.market_offset}
              onChange={e => setForm({ ...form, market_offset: e.target.value })}
              min={-10} max={10} step={0.5}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Negativo = abaixo da media (mais competitivo)</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desconto Maximo (%)</label>
            <input
              type="number"
              value={form.max_bid_discount}
              onChange={e => setForm({ ...form, max_bid_discount: e.target.value })}
              min={1} max={50} step={0.5} required
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Exposicao Maxima (R$)</label>
            <input
              type="number"
              value={form.max_total_exposure}
              onChange={e => setForm({ ...form, max_total_exposure: e.target.value })}
              placeholder="Sem limite"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Max bids/dia</label>
            <input
              type="number"
              value={form.max_bids_per_day}
              onChange={e => setForm({ ...form, max_bids_per_day: e.target.value })}
              min={1} max={100}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={form.homologation_required}
                onChange={e => setForm({ ...form, homologation_required: e.target.checked })}
                className="rounded"
              />
              Somente creditos homologados
            </label>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" size="sm" className="flex-1">
            <Check size={14} /> Criar Regra
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            <X size={14} /> Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}
