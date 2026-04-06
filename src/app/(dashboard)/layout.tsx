import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { NotificationDropdown } from '@/components/ui/notification-dropdown'
import { TermsChecker } from '@/components/compliance/terms-checker'
import { FeedbackButton } from '@/components/ui/feedback-button'
import { Search, Settings } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

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
  const displayName = userProfile?.full_name || company?.nome_fantasia || company?.razao_social || 'Usuário'
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
      <main className="flex-1 lg:ml-60 min-w-0 flex flex-col pb-16 lg:pb-0">
        <header className="h-16 bg-dark-800/80 backdrop-blur-xl border-b border-dark-500/40 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center flex-1 min-w-0">
            <div className="w-14 lg:hidden flex-shrink-0" />
            <div className="lg:hidden flex-1 flex items-center justify-center">
              <span className="text-sm font-bold text-white">E-CREDac</span>
            </div>
            <div className="hidden lg:flex relative pl-6">
              <Search size={16} className="absolute left-9 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                placeholder={userRole === 'procurador' ? 'Buscar clientes, comissões...' : 'Buscar operações, créditos...'}
                className="pl-10 pr-4 py-2 w-72 rounded-xl bg-dark-700 border border-dark-500/50 text-sm text-white placeholder-slate-500 focus:bg-dark-600 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-1 lg:gap-2 pr-4">
            <NotificationDropdown />
            <Link
              href="/perfil"
              className="hidden lg:flex w-9 h-9 items-center justify-center rounded-xl text-slate-500 hover:text-brand-400 hover:bg-dark-600 border border-transparent hover:border-dark-500/50 transition-all"
              title="Configurações"
            >
              <Settings size={17} />
            </Link>
          </div>
        </header>
        <div className="p-3 lg:p-6 lg:max-w-7xl flex-1">
          {children}
        </div>
        <footer className="hidden lg:flex border-t border-dark-500/30 px-6 py-3 mt-auto">
          <div className="flex items-center justify-between w-full text-[11px] text-slate-600">
            <span>E-CREDac by Rede Ampara Tec</span>
            <div className="flex items-center gap-4">
              <a href="/termos-de-uso" target="_blank" className="hover:text-slate-400 transition-colors">Termos de Uso</a>
              <a href="/politica-de-privacidade" target="_blank" className="hover:text-slate-400 transition-colors">Política de Privacidade</a>
              <a href="/institucional" className="hover:text-slate-400 transition-colors">Quem Somos</a>
            </div>
          </div>
        </footer>
      </main>
      <TermsChecker />
      <div className="hidden lg:block">
        <FeedbackButton />
      </div>
    </div>
  )
}
