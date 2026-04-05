import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { Bell, Search } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch user_profile and company in parallel
  const [{ data: userProfile }, { data: company }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, full_name, role, referral_code')
      .eq('auth_user_id', user.id)
      .single(),
    supabase
      .from('companies')
      .select('*')
      .eq('auth_user_id', user.id)
      .single(),
  ])

  const userRole = (userProfile?.role as 'titular' | 'representante' | 'procurador') || 'titular'
  const displayName = userProfile?.full_name || company?.nome_fantasia || company?.razao_social || 'Usuario'
  const companyName = company?.nome_fantasia || company?.razao_social || (userRole === 'procurador' ? 'Assessor' : 'Empresa')
  const companyTier = company?.tier || 'free'

  return (
    <div className="min-h-screen bg-dark-900 flex">
      <Sidebar
        companyName={companyName}
        companyTier={companyTier}
        userRole={userRole}
        displayName={displayName}
      />

      <main className="flex-1 ml-60 min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-dark-800/80 backdrop-blur-xl border-b border-dark-500/40 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              placeholder={userRole === 'procurador'
                ? 'Buscar clientes, comissões, convites...'
                : 'Buscar operações, empresas, créditos...'}
              className="pl-10 pr-4 py-2 w-80 rounded-xl bg-dark-700 border border-dark-500/50 text-sm text-white placeholder-slate-500 focus:bg-dark-600 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2.5 rounded-xl bg-dark-700 hover:bg-dark-600 text-slate-400 hover:text-white transition-all border border-dark-500/50">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full ring-2 ring-dark-800" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-dark-500/40">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-600/20 text-brand-400 flex items-center justify-center font-bold text-xs border border-brand-500/20">
                {displayName.charAt(0)}
              </div>
              <div>
                <span className="text-sm font-medium text-white block">{displayName}</span>
                {userRole === 'procurador' && (
                  <span className="text-[10px] text-accent-400 font-semibold uppercase tracking-wide">Assessor</span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
