'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { creditTypeLabels, creditOriginLabels } from '@/lib/utils'
import type { MatchAlert } from '@/types/database'
import { Bell, BellOff, Plus, Trash2, Edit2, X, Check } from 'lucide-react'

interface MatchAlertListProps {
  alerts: MatchAlert[]
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
  onCreate: () => void
}

export function MatchAlertList({ alerts, onToggle, onDelete, onCreate }: MatchAlertListProps) {
  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-brand-600" />
          <h3 className="text-sm font-bold text-gray-900">Meus Alertas</h3>
          <Badge variant="info">{alerts.filter(a => a.active).length} ativos</Badge>
        </div>
        <Button size="sm" onClick={onCreate}>
          <Plus size={14} /> Novo Alerta
        </Button>
      </div>

      {alerts.length === 0 ? (
        <div className="p-8 text-center">
          <Bell size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Nenhum alerta configurado</p>
          <p className="text-xs text-gray-400 mt-1">Crie alertas para ser notificado quando creditos compativeis surgirem</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {alerts.map(alert => (
            <div key={alert.id} className={`p-4 flex items-center gap-4 ${!alert.active ? 'opacity-50' : ''}`}>
              <button
                onClick={() => onToggle(alert.id, !alert.active)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  alert.active
                    ? 'bg-brand-100 text-brand-600 hover:bg-brand-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {alert.active ? <Bell size={16} /> : <BellOff size={16} />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{alert.name}</p>
                  <Badge variant={alert.alert_type === 'credit' ? 'info' : 'success'}>
                    {alert.alert_type === 'credit' ? 'Compra' : 'Venda'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  {alert.credit_types && (
                    <span>Tipos: {alert.credit_types.map(t => creditTypeLabels[t] || t).join(', ')}</span>
                  )}
                  {alert.min_grade && <span>Grade min: {alert.min_grade}</span>}
                  {alert.max_discount && <span>Desc. max: {alert.max_discount}%</span>}
                  {alert.min_amount && <span>Min: R$ {alert.min_amount.toLocaleString('pt-BR')}</span>}
                </div>
              </div>

              <div className="text-right text-xs text-gray-400">
                <p>{alert.matches_found} disparos</p>
                {alert.last_triggered_at && (
                  <p>Ultimo: {new Date(alert.last_triggered_at).toLocaleDateString('pt-BR')}</p>
                )}
              </div>

              <button
                onClick={() => onDelete(alert.id)}
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
// Form para criar/editar alerta
// ==========================================

interface AlertFormProps {
  onSubmit: (data: Partial<MatchAlert>) => void
  onCancel: () => void
  initial?: Partial<MatchAlert>
}

export function MatchAlertForm({ onSubmit, onCancel, initial }: AlertFormProps) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    alert_type: initial?.alert_type || 'credit',
    credit_types: initial?.credit_types || [],
    origins: initial?.origins || [],
    min_grade: initial?.min_grade || '',
    max_discount: initial?.max_discount || '',
    min_amount: initial?.min_amount || '',
    max_amount: initial?.max_amount || '',
    channel: initial?.channel || 'in_app',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      name: form.name,
      alert_type: form.alert_type as any,
      credit_types: form.credit_types.length > 0 ? form.credit_types as any : null,
      origins: form.origins.length > 0 ? form.origins as any : null,
      min_grade: form.min_grade || null as any,
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      min_amount: form.min_amount ? Number(form.min_amount) : null,
      max_amount: form.max_amount ? Number(form.max_amount) : null,
      channel: form.channel as any,
    })
  }

  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-4">
        {initial ? 'Editar Alerta' : 'Novo Alerta'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome do Alerta</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Creditos A de exportacao acima de R$500K"
            required
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Alerta</label>
            <select
              value={form.alert_type}
              onChange={e => setForm({ ...form, alert_type: e.target.value as 'credit' | 'demand' })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="credit">Quero Comprar Credito</option>
              <option value="demand">Quero Vender Credito</option>
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
              <option value="A">A — Excelente</option>
              <option value="B">B — Bom</option>
              <option value="C">C — Regular</option>
              <option value="D">D — Alto risco</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Valor Minimo (R$)</label>
            <input
              type="number"
              value={form.min_amount}
              onChange={e => setForm({ ...form, min_amount: e.target.value })}
              placeholder="Opcional"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desconto Maximo (%)</label>
            <input
              type="number"
              value={form.max_discount}
              onChange={e => setForm({ ...form, max_discount: e.target.value })}
              min={0} max={50} step={0.5}
              placeholder="Opcional"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" size="sm" className="flex-1">
            <Check size={14} /> {initial ? 'Salvar' : 'Criar Alerta'}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            <X size={14} /> Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}
