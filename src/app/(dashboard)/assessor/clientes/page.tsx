import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL, formatCNPJ, formatDate } from '@/lib/utils'
import { Users, Building2, ArrowUpRight } from 'lucide-react'

export default async function ClientesPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (profile?.role !== 'procurador') redirect('/dashboard')

  // Get all companies where this user is a procurador member
  const { data: memberships } = await supabase
    .from('company_members')
    .select('*, company:companies(*)')
    .eq('user_profile_id', profile.id)
    .eq('role', 'procurador')
    .order('created_at', { ascending: false })

  const clients = memberships || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meus Clientes</h1>
        <p className="text-gray-500 mt-1">Empresas vinculadas ao seu codigo de assessor</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-sm text-gray-500">Total de Clientes</p>
          <p className="text-2xl font-bold mt-1">{clients.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500">Ativos</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">
            {clients.filter(c => c.active).length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500">SEFAZ Regular</p>
          <p className="text-2xl font-bold mt-1 text-brand-600">
            {clients.filter(c => c.company?.sefaz_status === 'regular').length}
          </p>
        </Card>
      </div>

      {/* Client List */}
      <Card className="p-6">
        {clients.length > 0 ? (
          <div className="space-y-3">
            {clients.map((membership: any) => {
              const comp = membership.company
              return (
                <div key={membership.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg">
                      {(comp?.nome_fantasia || comp?.razao_social || '?').charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {comp?.nome_fantasia || comp?.razao_social || 'Empresa'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {comp?.cnpj ? formatCNPJ(comp.cnpj) : '—'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Cliente desde {formatDate(membership.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Badge variant={comp?.sefaz_status === 'regular' ? 'success' : 'warning'}>
                        {comp?.sefaz_status === 'regular' ? 'Regular' : 'Pendente'}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {comp?.type === 'seller' ? 'Cedente' : comp?.type === 'buyer' ? 'Cessionario' : 'Ambos'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nenhum cliente na carteira ainda</p>
            <p className="text-sm text-gray-400 mt-1">
              Compartilhe seu codigo de indicacao para empresas se cadastrarem como seus clientes
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
