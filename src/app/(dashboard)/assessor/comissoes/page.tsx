import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatDate } from '@/lib/utils'
import { Wallet, DollarSign, TrendingUp, Clock } from 'lucide-react'

const commStatusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'default' }> = {
  pending:    { label: 'Pendente', variant: 'warning' },
  earned:     { label: 'Apurada', variant: 'info' },
  processing: { label: 'Processando', variant: 'info' },
  paid:       { label: 'Paga', variant: 'success' },
  cancelled:  { label: 'Cancelada', variant: 'default' },
}

export default async function ComissoesPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (profile?.role !== 'procurador') redirect('/dashboard')

  const { data: procurador } = await supabase
    .from('procurador_profiles')
    .select('*')
    .eq('user_profile_id', profile.id)
    .single()

  if (!procurador) redirect('/dashboard')

  // All commissions
  const { data: commissions } = await supabase
    .from('commissions')
    .select('*, company:companies(nome_fantasia, razao_social, cnpj)')
    .eq('procurador_id', procurador.id)
    .order('created_at', { ascending: false })

  const allComm = commissions || []
  const totalEarned = allComm.filter(c => c.status !== 'cancelled').reduce((s, c) => s + (c.commission_value || 0), 0)
  const totalPaid = allComm.filter(c => c.status === 'paid').reduce((s, c) => s + (c.commission_value || 0), 0)
  const totalPending = allComm.filter(c => ['pending', 'earned', 'processing'].includes(c.status)).reduce((s, c) => s + (c.commission_value || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Comissoes</h1>
        <p className="text-gray-500 mt-1">Historico e acompanhamento de todas as suas comissoes</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-emerald-600" />
            <p className="text-sm text-gray-500">Total Ganho</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatBRL(totalEarned)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={16} className="text-brand-600" />
            <p className="text-sm text-gray-500">Ja Pago</p>
          </div>
          <p className="text-2xl font-bold text-brand-600">{formatBRL(totalPaid)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-amber-600" />
            <p className="text-sm text-gray-500">Pendente</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatBRL(totalPending)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-gray-600" />
            <p className="text-sm text-gray-500">Taxa Atual</p>
          </div>
          <p className="text-2xl font-bold">{procurador.custom_commission_pct || '0.50'}%</p>
        </Card>
      </div>

      {/* Commissions Table */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Historico de Comissoes</h2>
        {allComm.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Data</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Empresa</th>
                  <th className="text-right py-3 px-2 text-gray-500 font-medium">Valor Transacao</th>
                  <th className="text-right py-3 px-2 text-gray-500 font-medium">Taxa</th>
                  <th className="text-right py-3 px-2 text-gray-500 font-medium">Comissao</th>
                  <th className="text-center py-3 px-2 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {allComm.map((comm: any) => {
                  const cs = commStatusConfig[comm.status] || commStatusConfig.pending
                  return (
                    <tr key={comm.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 text-gray-600">{formatDate(comm.created_at)}</td>
                      <td className="py-3 px-2 font-medium">
                        {comm.company?.nome_fantasia || comm.company?.razao_social || '—'}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-600">{formatBRL(comm.transaction_value)}</td>
                      <td className="py-3 px-2 text-right text-gray-600">{comm.commission_pct}%</td>
                      <td className="py-3 px-2 text-right font-bold">{formatBRL(comm.commission_value)}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant={cs.variant}>{cs.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Wallet size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma comissao registrada</p>
            <p className="text-sm text-gray-400 mt-1">
              Comissoes sao geradas automaticamente quando transacoes de seus clientes sao concluidas
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
