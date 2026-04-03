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
        <h1 className="text-2xl font-bold text-gray-900">Transacoes</h1>
        <p className="text-gray-500 mt-1">Historico completo de operacoes com creditos de ICMS</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <ArrowLeftRight size={18} className="text-brand-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Transacoes</p>
              <p className="text-xl font-bold">{transactions.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <DollarSign size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Volume Total</p>
              <p className="text-xl font-bold">{formatBRL(totalVolume)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Taxas Geradas</p>
              <p className="text-xl font-bold">{formatBRL(totalFees)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Concluidas</p>
              <p className="text-xl font-bold text-emerald-600">{completedCount}</p>
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
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-all"
                  onClick={() => setExpandedTx(expanded ? null : tx.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tx.status === 'completed' ? 'bg-emerald-50' :
                      tx.status === 'transferring' ? 'bg-blue-50' : 'bg-amber-50'
                    }`}>
                      <ArrowLeftRight size={18} className={
                        tx.status === 'completed' ? 'text-emerald-600' :
                        tx.status === 'transferring' ? 'text-blue-600' : 'text-amber-600'
                      } />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{tx.seller_company?.nome_fantasia || 'Cedente'}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-sm font-medium">{tx.buyer_company?.nome_fantasia || 'Cessionario'}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg?.badge}`}>
                          {cfg?.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        #{tx.id.slice(0, 8)} · {formatDate(tx.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatBRL(tx.credit_amount)}</p>
                      <p className="text-xs text-gray-500">{tx.discount_applied}% desc.</p>
                    </div>
                    {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </div>

                {/* Expanded details */}
                {expanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-xl bg-gray-50">
                        <p className="text-xs text-gray-500">Valor do Credito</p>
                        <p className="text-lg font-bold">{formatBRL(tx.credit_amount)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50">
                        <p className="text-xs text-gray-500">Pagamento Total</p>
                        <p className="text-lg font-bold">{formatBRL(tx.total_payment)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50">
                        <p className="text-xs text-gray-500">Taxa Plataforma</p>
                        <p className="text-lg font-bold text-brand-600">{formatBRL(tx.platform_fee)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50">
                        <p className="text-xs text-gray-500">Liquido Cedente</p>
                        <p className="text-lg font-bold text-emerald-600">{formatBRL(tx.net_to_seller)}</p>
                      </div>
                    </div>

                    {/* Documents */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-2">Documentos</h4>
                      <div className="flex gap-3">
                        <div className={`flex items-center gap-2 p-2 rounded-xl text-sm ${
                          tx.contract_signed_at ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'
                        }`}>
                          <FileText size={14} />
                          Contrato {tx.contract_signed_at ? '✓' : '(pendente)'}
                        </div>
                        <div className={`flex items-center gap-2 p-2 rounded-xl text-sm ${
                          tx.nfe_key ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'
                        }`}>
                          <FileText size={14} />
                          NF-e {tx.nfe_key ? '✓' : '(pendente)'}
                        </div>
                        <div className={`flex items-center gap-2 p-2 rounded-xl text-sm ${
                          tx.payment_confirmed_at ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'
                        }`}>
                          <DollarSign size={14} />
                          Pagamento {tx.payment_confirmed_at ? '✓' : '(pendente)'}
                        </div>
                      </div>
                    </div>

                    {/* Credit usage for completed transactions */}
                    {tx.status === 'completed' && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-2">Uso do Credito</h4>
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
                      <div className="text-sm text-gray-500">
                        <span>Metodo: <strong className="text-gray-700">
                          {tx.payment_method === 'pix' ? 'PIX' : tx.payment_method === 'ted' ? 'TED' : 'Boleto'}
                        </strong></span>
                        {tx.payment_reference && (
                          <span className="ml-4">Ref: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{tx.payment_reference}</code></span>
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
          <ArrowLeftRight size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-lg font-medium text-gray-500">Nenhuma transacao encontrada</p>
          <p className="text-sm text-gray-400 mt-1">As transacoes aparecem aqui apos a confirmacao de um match</p>
        </Card>
      )}
    </div>
  )
}
