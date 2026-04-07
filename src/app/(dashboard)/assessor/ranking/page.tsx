import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { formatBRL } from '@/lib/utils'
import { Award, ArrowUp, CheckCircle2 } from 'lucide-react'

const tierVisuals: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  bronze:   { icon: '🥉', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/50' },
  silver:   { icon: '🥈', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/50' },
  gold:     { icon: '🥇', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/50' },
  platinum: { icon: '💎', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/50' },
  diamond:  { icon: '👑', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/50' },
}

const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond']

export default async function RankingPage() {
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

  // Fetch all tiers
  const { data: tiers } = await supabase
    .from('commission_tiers')
    .select('*')
    .order('min_monthly_volume', { ascending: true })

  const allTiers = tiers || []
  const currentTier = procurador.tier || 'bronze'
  const currentTierIdx = tierOrder.indexOf(currentTier)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ranking & Tiers</h1>
        <p className="text-slate-500 mt-1">Acompanhe seu progresso e desbloqueie beneficios maiores</p>
      </div>

      {/* Current Tier Highlight */}
      {(() => {
        const tv = tierVisuals[currentTier] || tierVisuals.bronze
        return (
          <Card className={`p-6 ${tv.bg} border-2 ${tv.border}`}>
            <div className="flex items-center gap-4">
              <span className="text-5xl">{tv.icon}</span>
              <div>
                <p className={`text-2xl font-black ${tv.color}`}>
                  {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Volume mensal: {formatBRL(procurador.current_month_volume || 0)}
                </p>
                <p className="text-sm text-slate-500">
                  Volume total acumulado: {formatBRL(procurador.total_volume_intermediated || 0)}
                </p>
              </div>
            </div>
          </Card>
        )
      })()}

      {/* Tier Ladder */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Escada de Tiers</h2>
        <div className="space-y-4">
          {allTiers.map((tier: any, idx: number) => {
            const tv = tierVisuals[tier.tier] || tierVisuals.bronze
            const tierIdx = tierOrder.indexOf(tier.tier)
            const isCurrent = tier.tier === currentTier
            const isPast = tierIdx < currentTierIdx
            const isFuture = tierIdx > currentTierIdx
            const benefits = tier.benefits || {}

            return (
              <div
                key={tier.id}
                className={`relative p-5 rounded-xl border-2 transition-all ${
                  isCurrent ? `${tv.bg} ${tv.border} ring-2 ring-brand-500/30` :
                  isPast ? 'bg-dark-600/50 border-dark-500/40 opacity-75' :
                  'bg-dark-700 border-dark-500/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{tv.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`text-lg font-bold ${isCurrent ? tv.color : 'text-slate-900'}`}>
                          {tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)}
                        </p>
                        {isCurrent && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-600 text-white">
                            Atual
                          </span>
                        )}
                        {isPast && (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        Volume: {formatBRL(tier.min_monthly_volume)}
                        {tier.max_monthly_volume ? ` — ${formatBRL(tier.max_monthly_volume)}` : '+'}
                        /mes
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-brand-400">{tier.commission_pct}%</p>
                    <p className="text-xs text-slate-500">comissão</p>
                    {tier.activation_bonus > 0 && (
                      <p className="text-xs text-emerald-400 font-medium mt-1">
                        + {formatBRL(tier.activation_bonus)} bonus
                      </p>
                    )}
                  </div>
                </div>

                {/* Benefits */}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {benefits.priority_support && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">
                      Suporte Prioritario
                    </span>
                  )}
                  {benefits.dedicated_manager && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-medium">
                      Gerente Dedicado
                    </span>
                  )}
                  {benefits.api_access && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                      Acesso API
                    </span>
                  )}
                </div>

                {/* Progress to next */}
                {isCurrent && tier.max_monthly_volume && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Progresso para próximo tier</span>
                      <span className="font-medium text-white">
                        {Math.min(100, ((procurador.current_month_volume || 0) / tier.max_monthly_volume) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-dark-500 rounded-full h-2.5">
                      <div
                        className="bg-brand-600 h-2.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((procurador.current_month_volume || 0) / tier.max_monthly_volume) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
