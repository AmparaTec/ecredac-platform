'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL, formatDate, transactionStatusConfig } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreditGauge } from '@/components/ui/credit-gauge'
import {
  ArrowLeftRight, ChevronDown, ChevronUp, FileText,
  DollarSign, Clock, CheckCircle2, AlertTriangle
} from 'lucide-react'

export default function TransacoesPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTx, setExpandedTx] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    loadTransactions()
  }, [])

  async function loadTransactions() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: company } = await supabase
      .from('companies').select('id').eq('auth_user_id', user.id).single()
    if (!company) return

    const { data } = await supabase
      .from('transactions')
      .select(`
        *,
        seller_company:companies!seller_company_id(id, nome_fantasia, razao_social),
        buyer_company:companies!buyer_company_id(id, nome_fantasia, razao_social),
        match:matches(*)
      `)
      .or(`seller_company_id.eq.${company.id},buyer_company_id.eq.${company.id}`)
      .order('created_at', { ascending: false })

    setTransactions(data || [])
    setLoading(false)
  }

  const filtered = filterStatus
    ? transactions.filter(t => t.status === filterStatus)
    : transactions

  const totalVolume = transactions.reduce((a, t) => a + t.credit_amount, 0)
  const totalFees = transactions.reduce((a, t) => a + t.platform_fee, 0)
  const completedCount = transactions.filter(t => t.status === 'completed').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Transações</h1>
        <p className="text-slate-500 mt-1">Histórico completo de operações com créditos de ICMS</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
              <ArrowLeftRight size={18} className="text-brand-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Transações</p>
              <p className="text-xl font-bold">{transactions.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <DollarSign size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Volume Total</p>
              <p className="text-xl font-bold">{formatBRL(totalVolume)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Clock size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Taxas Geradas</p>
              <p className="text-xl font-bold">{formatBRL(totalFees)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Concluidas</p>
              <p className="text-xl font-bold text-emerald-400">{completedCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { value: '', label: 'Todas' },
          { value: 'pending_payment', label: 'Ag. Pagamento' },
          { value: 'paid', label: 'Pagas' },
          { value: 'transferring', label: 'Transferindo' },
          { value: 'completed', label: 'Concluidas' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
              filterStatus === f.value
                ? 'bg-brand-600 text-white'
                : 'bg-dark-600 text-slate-400 hover:bg-dark-600/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(tx => {
            const expanded = expandedTx === tx.id
            const cfg = transactionStatusConfig[tx.status]

            return (
              <Card key={tx.id} className="overflow-hidden">
                {/* Main row */}
                <div
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-dark-600/50 transition-all"
                  onClick={() => setExpandedTx(expanded ? null : tx.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tx.status === 'completed' ? 'bg-emerald-500/15' :
                      tx.status === 'transferring' ? 'bg-blue-500/15' : 'bg-amber-500/15'
                    }`}>
                      <ArrowLeftRight size={18} className={
                        tx.status === 'completed' ? 'text-emerald-400' :
                        tx.status === 'transferring' ? 'text-blue-400' : 'text-amber-400'
                      } />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{tx.seller_company?.nome_fantasia || 'Cedente'}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-sm font-medium">{tx.buyer_company?.nome_fantasia || 'Cessionário'}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg?.badge}`}>
                          {cfg?.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        #{tx.id.slice(0, 8)} · {formatDate(tx.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatBRL(tx.credit_amount)}</p>
                      <p className="text-xs text-slate-500">{tx.discount_applied}% desc.</p>
                    </div>
                    {expanded ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                  </div>
                </div>

                {/* Expanded details */}
                {expanded && (
                  <div className="px-5 pb-5 border-t border-dark-500/50 pt-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-xl bg-dark-600/50">
                        <p className="text-xs text-slate-500">Valor do Crédito</p>
                        <p className="text-lg font-bold">{formatBRL(tx.credit_amount)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-dark-600/50">
                        <p className="text-xs text-slate-500">Pagamento Total</p>
                        <p className="text-lg font-bold">{formatBRL(tx.total_payment)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-dark-600/50">
                        <p className="text-xs text-slate-500">Taxa Plataforma</p>
                        <p className="text-lg font-bold text-brand-400">{formatBRL(tx.platform_fee)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/15">
                        <p className="text-xs text-slate-500">Liquido Cedente</p>
                        <p className="text-lg font-bold text-emerald-400">{formatBRL(tx.net_to_seller)}</p>
                      </div>
                    </div>

                    {/* Documents */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-300 mb-2">Documentos</h4>
                      <div className="flex gap-3">
                        <div className={`flex items-center gap-2 p-2 rounded-xl text-sm ${
                          tx.contract_signed_at ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-600/50 text-slate-500'
                        }`}>
                          <FileText size={14} />
                          Contrato {tx.contract_signed_at ? '✓' : '(pendente)'}
                        </div>
                        <div className={`flex items-center gap-2 p-2 rounded-xl text-sm ${
                          tx.nfe_key ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-600/50 text-slate-500'
                        }`}>
                          <FileText size={14} />
                          NF-e {tx.nfe_key ? '✓' : '(pendente)'}
                        </div>
                        <div className={`flex items-center gap-2 p-2 rounded-xl text-sm ${
                          tx.payment_confirmed_at ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-600/50 text-slate-500'
                        }`}>
                          <DollarSign size={14} />
                          Pagamento {tx.payment_confirmed_at ? '✓' : '(pendente)'}
                        </div>
                      </div>
                    </div>

                    {/* Credit usage for completed transactions */}
                    {tx.status === 'completed' && (
                      <div>
                        <h4 className="text-sm font-bold text-slate-300 mb-2">Uso do Crédito</h4>
                        <CreditGauge
                          total={tx.credit_amount}
                          used={Math.round(tx.credit_amount * 0.65)}
                          reserved={Math.round(tx.credit_amount * 0.15)}
                          available={Math.round(tx.credit_amount * 0.20)}
                          expiresAt={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()}
                          lastUsed={tx.completed_at}
                        />
                      </div>
                    )}

                    {/* Payment details */}
                    {tx.payment_method && (
                      <div className="text-sm text-slate-500">
                        <span>Metodo: <strong className="text-slate-300">
                          {tx.payment_method === 'pix' ? 'PIX' : tx.payment_method === 'ted' ? 'TED' : 'Boleto'}
                        </strong></span>
                        {tx.payment_reference && (
                          <span className="ml-4">Ref: <code className="text-xs bg-dark-600 text-slate-400 px-1.5 py-0.5 rounded">{tx.payment_reference}</code></span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <ArrowLeftRight size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-lg font-medium text-slate-500">Nenhuma transação encontrada</p>
          <p className="text-sm text-slate-500 mt-1">As transações aparecem aqui após a confirmação de um match</p>
        </Card>
      )}
    </div>
  )
}
