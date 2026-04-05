'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL, formatDate, urgencyConfig, creditTypeLabels } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, Plus, X, Clock, AlertTriangle } from 'lucide-react'

export default function DemandasPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newRequest, setNewRequest] = useState({
    amount_needed: '',
    max_discount_accepted: '20',
    urgency: 'medium',
    icms_due_date: '',
    preferred_credit_types: [] as string[],
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: company } = await supabase
      .from('companies').select('id').eq('auth_user_id', user.id).single()
    if (!company) return

    const { data } = await supabase
      .from('credit_requests')
      .select('*, company:companies(*)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })

    setRequests(data || [])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: company } = await supabase
      .from('companies').select('id').eq('auth_user_id', user.id).single()
    if (!company) return

    const { error } = await supabase.from('credit_requests').insert({
      company_id: company.id,
      amount_needed: Number(newRequest.amount_needed),
      remaining_needed: Number(newRequest.amount_needed),
      max_discount_accepted: Number(newRequest.max_discount_accepted),
      urgency: newRequest.urgency,
      icms_due_date: newRequest.icms_due_date || null,
      preferred_credit_types: newRequest.preferred_credit_types.length > 0 ? newRequest.preferred_credit_types : null,
      description: newRequest.description || null,
      status: 'active',
    })

    if (!error) {
      setShowNewForm(false)
      setNewRequest({ amount_needed: '', max_discount_accepted: '20', urgency: 'medium', icms_due_date: '', preferred_credit_types: [], description: '' })
      loadRequests()
    }
    setSubmitting(false)
  }

  function toggleCreditType(type: string) {
    setNewRequest(prev => ({
      ...prev,
      preferred_credit_types: prev.preferred_credit_types.includes(type)
        ? prev.preferred_credit_types.filter(t => t !== type)
        : [...prev.preferred_credit_types, type]
    }))
  }

  function daysUntilDue(date: string | null): number | null {
    if (!date) return null
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Demandas</h1>
          <p className="text-slate-500 mt-1">Gerencie suas necessidades de créditos de ICMS</p>
        </div>
        <Button onClick={() => setShowNewForm(true)}>
          <Plus size={16} />
          Nova Demanda
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-slate-500">Demandas Ativas</p>
          <p className="text-2xl font-bold mt-1">{requests.filter(r => r.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Volume Total Buscado</p>
          <p className="text-2xl font-bold mt-1">
            {formatBRL(requests.filter(r => r.status === 'active').reduce((a, r) => a + r.remaining_needed, 0))}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Demandas Atendidas</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">{requests.filter(r => r.status === 'fulfilled').length}</p>
        </Card>
      </div>

      {/* Requests list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full" />
        </div>
      ) : requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map(req => {
            const daysLeft = daysUntilDue(req.icms_due_date)
            const urg = urgencyConfig[req.urgency as keyof typeof urgencyConfig]

            return (
              <Card key={req.id} className="p-5" hover>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={
                        req.status === 'active' ? 'info' :
                        req.status === 'matched' ? 'warning' :
                        req.status === 'fulfilled' ? 'success' : 'default'
                      }>
                        {req.status === 'active' ? 'Ativa' :
                         req.status === 'matched' ? 'Matched' :
                         req.status === 'fulfilled' ? 'Atendida' : req.status}
                      </Badge>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${urg?.badge}`}>
                        Urgencia: {urg?.label}
                      </span>
                      {req.preferred_credit_types?.map((t: string) => (
                        <Badge key={t} variant="default">{creditTypeLabels[t] || t}</Badge>
                      ))}
                    </div>

                    <div className="flex items-baseline gap-6">
                      <div>
                        <p className="text-xs text-slate-500">Valor Necessario</p>
                        <p className="text-xl font-bold">{formatBRL(req.amount_needed)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Restante</p>
                        <p className="text-xl font-bold text-brand-400">{formatBRL(req.remaining_needed)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Desconto Max</p>
                        <p className="text-lg font-bold">{req.max_discount_accepted}%</p>
                      </div>
                    </div>

                    {req.description && (
                      <p className="mt-2 text-sm text-slate-500">{req.description}</p>
                    )}
                  </div>

                  <div className="text-right">
                    {daysLeft !== null && (
                      <div className={`flex items-center gap-1 text-sm font-medium ${
                        daysLeft < 30 ? 'text-red-400' : daysLeft < 90 ? 'text-amber-400' : 'text-slate-500'
                      }`}>
                        {daysLeft < 30 && <AlertTriangle size={14} />}
                        <Clock size={14} />
                        <span>{daysLeft}d para vencimento</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-1">Criada em {formatDate(req.created_at)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                {req.amount_needed > req.remaining_needed && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Progresso</span>
                      <span>{Math.round(((req.amount_needed - req.remaining_needed) / req.amount_needed) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${((req.amount_needed - req.remaining_needed) / req.amount_needed) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <TrendingUp size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-lg font-medium text-slate-500">Nenhuma demanda criada</p>
          <p className="text-sm text-slate-500 mt-1">Crie sua primeira demanda para encontrar créditos automaticamente</p>
          <Button className="mt-4" onClick={() => setShowNewForm(true)}>
            <Plus size={16} />
            Nova Demanda
          </Button>
        </Card>
      )}

      {/* New Request Form Modal */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowNewForm(false)}>
          <div className="bg-dark-700 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-dark-500/50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Nova Demanda de Crédito</h2>
              <button onClick={() => setShowNewForm(false)} className="p-2 rounded-xl hover:bg-dark-600/50">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Valor Necessario (R$)</label>
                <input
                  type="number"
                  value={newRequest.amount_needed}
                  onChange={e => setNewRequest({ ...newRequest, amount_needed: e.target.value })}
                  placeholder="Ex: 500000"
                  required
                  min={1000}
                  className="w-full rounded-xl border border-dark-500/50 bg-dark-700 text-white px-4 py-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Desconto Máximo (%)</label>
                  <input
                    type="number"
                    value={newRequest.max_discount_accepted}
                    onChange={e => setNewRequest({ ...newRequest, max_discount_accepted: e.target.value })}
                    min={0} max={50} step={0.5}
                    className="w-full rounded-xl border border-dark-500/50 bg-dark-700 text-white px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Urgencia</label>
                  <select
                    value={newRequest.urgency}
                    onChange={e => setNewRequest({ ...newRequest, urgency: e.target.value })}
                    className="w-full rounded-xl border border-dark-500/50 bg-dark-700 text-white px-4 py-2.5 text-sm"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Data de Vencimento do ICMS</label>
                <input
                  type="date"
                  value={newRequest.icms_due_date}
                  onChange={e => setNewRequest({ ...newRequest, icms_due_date: e.target.value })}
                  className="w-full rounded-xl border border-dark-500/50 bg-dark-700 text-white px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tipos de Crédito Preferidos</label>
                <div className="flex gap-2">
                  {['acumulado', 'st', 'rural'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleCreditType(t)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                        newRequest.preferred_credit_types.includes(t)
                          ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                          : 'bg-dark-600/50 border-dark-500/50 text-slate-400 hover:bg-dark-600'
                      }`}
                    >
                      {creditTypeLabels[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Descrição (opcional)</label>
                <textarea
                  value={newRequest.description}
                  onChange={e => setNewRequest({ ...newRequest, description: e.target.value })}
                  rows={3}
                  placeholder="Detalhes sobre a necessidade..."
                  className="w-full rounded-xl border border-dark-500/50 bg-dark-700 text-white px-4 py-2.5 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? 'Criando...' : 'Criar Demanda'}
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
