import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Send, CheckCircle2, Clock, XCircle, Copy } from 'lucide-react'

const inviteStatusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  pending:  { label: 'Pendente', variant: 'warning' },
  accepted: { label: 'Aceito', variant: 'success' },
  expired:  { label: 'Expirado', variant: 'default' },
}

export default async function ConvitesPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, referral_code')
    .eq('auth_user_id', user.id)
    .single()

  if (profile?.role !== 'procurador') redirect('/dashboard')

  const { data: procurador } = await supabase
    .from('procurador_profiles')
    .select('id')
    .eq('user_profile_id', profile.id)
    .single()

  if (!procurador) redirect('/dashboard')

  const { data: invites } = await supabase
    .from('referral_invites')
    .select('*')
    .eq('procurador_id', procurador.id)
    .order('created_at', { ascending: false })

  const allInvites = invites || []
  const pending = allInvites.filter(i => i.status === 'pending').length
  const accepted = allInvites.filter(i => i.status === 'accepted').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Convites</h1>
        <p className="text-gray-500 mt-1">Gerencie seus convites de indicacao</p>
      </div>

      {/* Referral Code */}
      <Card className="p-6 bg-gradient-to-r from-brand-50 to-purple-50 border-brand-200">
        <h2 className="text-sm font-bold text-gray-700 mb-2">Seu Codigo de Indicacao</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl border-2 border-dashed border-brand-300">
            <span className="font-mono text-2xl font-black tracking-[0.3em] text-brand-700">
              {profile.referral_code || '--------'}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Link: <span className="font-mono text-brand-600">ecredac.com.br/register?ref={profile.referral_code || '...'}</span>
        </p>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-sm text-gray-500">Total Enviados</p>
          <p className="text-2xl font-bold mt-1">{allInvites.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500">Aceitos</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{accepted}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500">Pendentes</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{pending}</p>
        </Card>
      </div>

      {/* Invites List */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Historico de Convites</h2>
        {allInvites.length > 0 ? (
          <div className="space-y-3">
            {allInvites.map((invite: any) => {
              const is = inviteStatusConfig[invite.status] || inviteStatusConfig.pending
              return (
                <div key={invite.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      invite.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                      invite.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {invite.status === 'accepted' ? <CheckCircle2 size={18} /> :
                       invite.status === 'pending' ? <Clock size={18} /> :
                       <XCircle size={18} />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {invite.invited_company_name || invite.invited_email || 'Convite'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {invite.invited_email && `${invite.invited_email} · `}
                        {invite.invited_cnpj && `CNPJ: ${invite.invited_cnpj} · `}
                        Enviado em {formatDate(invite.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={is.variant}>{is.label}</Badge>
                    {invite.status === 'pending' && invite.expires_at && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        Expira em {formatDate(invite.expires_at)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Send size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nenhum convite enviado ainda</p>
            <p className="text-sm text-gray-400 mt-1">
              Compartilhe seu codigo de indicacao para empresas se cadastrarem
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
