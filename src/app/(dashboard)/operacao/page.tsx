'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Shield, ArrowRight, CheckCircle, Clock, Circle, AlertTriangle } from 'lucide-react'
import { cn, formatBRL } from '@/lib/utils'

interface OperacaoResumo {
  id: string
  status: string
  credit_amount: number
  total_payment: number
  discount_applied: number
  created_at: string
  seller_company_id: string
  buyer_company_id: string
  // Joined
  seller_name?: string
  buyer_name?: string
  marcos_total?: number
  marcos_concluidos?: number
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'text-slate-500' },
  confirmed: { label: 'Confirmada', color: 'text-brand-400' },
  paying: { label: 'Pagamento', color: 'text-yellow-400' },
  transferring: { label: 'Transferindo', color: 'text-blue-400' },
  completed: { label: 'Concluída', color: 'text-emerald-400' },
  cancelled: { label: 'Cancelada', color: 'text-danger-400' },
  disputed: { label: 'Em Disputa', color: 'text-danger-400' },
}

export default function OperacoesPage() {
  const [transactions, setTransactions] = useState<OperacaoResumo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const res = await fetch('/api/transactions')
        if (res.ok) {
          const data = await res.json()
          setTransactions(data.transactions || data || [])
        }
      } catch {
        // handle
      } finally {
        setLoading(false)
      }
    }
    fetchTransactions()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Shield size={20} className="text-brand-400" />
          <h1 className="text-xl font-bold text-white">Operações</h1>
        </div>
        <p className="text-sm text-slate-500">
          Acompanhe suas operações de cessão de créditos ICMS com total transparência
        </p>
      </div>

      {transactions.length === 0 ? (
        <Card className="p-12 text-center">
          <Shield size={40} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-900 font-medium mb-2">Nenhuma operação encontrada</p>
          <p className="text-sm text-slate-500">
            Suas operações de cessão aparecerão aqui quando forem criadas a partir de um match confirmado
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {transactions.map(tx => {
            const st = statusLabels[tx.status] || { label: tx.status, color: 'text-slate-500' }
            return (
              <Link key={tx.id} href={`/operacao/${tx.id}`}>
                <Card className="p-4 hover:border-brand-500/30 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    {/* Status icon */}
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      tx.status === 'completed' ? 'bg-emerald-500/10' :
                      tx.status === 'cancelled' ? 'bg-danger-500/10' :
                      'bg-brand-500/10'
                    )}>
                      {tx.status === 'completed' ? <CheckCircle size={18} className="text-emerald-400" /> :
                       tx.status === 'cancelled' ? <AlertTriangle size={18} className="text-danger-400" /> :
                       tx.status === 'pending' ? <Circle size={18} className="text-slate-500" /> :
                       <Clock size={18} className="text-brand-400" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">
                          Operação #{tx.id.slice(0, 8)}
                        </p>
                        <span className={cn('text-[10px] font-bold uppercase', st.color)}>
                          {st.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(tx.created_at).toLocaleDateString('pt-BR')} · Crédito {formatBRL(tx.credit_amount)} · Deságio {tx.discount_applied}%
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{formatBRL(tx.total_payment)}</p>
                      <p className="text-[10px] text-slate-500">Valor da operação</p>
                    </div>

                    <ArrowRight size={16} className="text-slate-600 group-hover:text-brand-400 transition-colors" />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
