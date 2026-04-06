import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { NotificationDropdown } from '@/components/ui/notification-dropdown'
import { TermsChecker } from '@/components/compliance/terms-checker'
import { FeedbackButton } from '@/components/ui/feedback-button'
import { Search, Settings, Info } from 'lucide-react'

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
  const displayName = userProfile?.full_name || company?.nome_fantasia || company?.razao_social || 'UsuÃ¡rio'
  const companyName = company?.nome_fantasia || company?.razao_social || (userRole === 'procurador' ? 'Assessor' : 'Empresa')
  const companyTier = company?.tier || 'free'

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Sidebar â desktop fixa + mobile drawer + bottom nav */}
      <Sidebar
        companyName={companyName}
        companyTier={companyTier}
        userRole={userRole}
        displayName={displayName}
      />

      {/*
        Main content:
        - Desktop: ml-60 (afasta da sidebar fixa)
        - Mobile: sem ml, padding-bottom para bottom nav (pb-16)
      */}
      <main className="flex-1 lg:ml-60 min-w-0 flex flex-col pb-16 lg:pb-0">

        {/* ââ Top bar âââââââââââââââââââââââââââââââââââââââââââ */}
        <header className="h-16 bg-dark-800/80 backdrop-blur-xl border-b border-dark-500/40 flex items-center sticky top-0 z-20">

          {/* Esquerda: busca (desktop) / hambÃºrguer + logo (mobile) */}
          <div className="flex items-center flex-1 min-w-0">
            {/* EspaÃ§ador para o botÃ£o hambÃºrguer no mobile */}
            <div className="w-14 lg:hidden flex-shrink-0" />

            {/* Logo mobile (centro) */}
            <div className="lg:hidden flex-1 flex items-center justify-center">
              <span className="text-sm font-bold text-white">E-CREDac</span>
            </div>

            {/* Busca desktop */}
            <div className="hidden lg:flex relative pl-6">
              <Search size={16} className="absolute left-9 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                placeholder={userRole === 'procurador'
                  ? 'Buscar clientes, comissÃµes...'
                  : 'Buscar operaÃ§Ãµes, crÃ©ditos...'}
                className="pl-10 pr-4 py-2 w-72 rounded-xl bg-dark-700 border border-dark-500/50 text-sm text-white placeholder-slate-500 focus:bg-dark-600 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all outline-none"
              />
            </div>
          </div>

          {/* Centro: Institucional (desktop) */}
          <div className="hidden lg:flex items-center gap-5 px-6">
            <Link
              href="/institucional"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition-colors"
            >
              <Info size={14} />
              Institucional
            </Link>
          </div>

          {/* Direita: notificaÃ§Ãµes + perfil do usuÃ¡rio (desktop) */}
          <div className="flex items-center gap-1 lg:gap-3 pr-4">
            <NotificationDropdown />
            <Link
              href="/perfil"
              className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-dark-600 border border-transparent hover:border-dark-500/50 transition-all"
              title="ConfiguraÃ§Ãµes"
            >
              <div className="w-7 h-7 rounded-lg bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-bold flex-shrink-0">
                {displayName.charAt(0)}
              </div>
              <span className="text-sm font-medium max-w-[140px] truncate">{displayName}</span>
              <Settings size={15} className="text-slate-500 flex-shrink-0" />
            </Link>
          </div>
        </header>

        {/* ââ ConteÃºdo da pÃ¡gina âââââââââââââââââââââââââââââââââ */}
        <div className="p-3 lg:p-6 lg:max-w-7xl flex-1">
          {children}
        </div>

        {/* ââ RodapÃ© â apenas desktop ââââââââââââââââââââââââââââ */}
        <footer className="hidden lg:flex border-t border-dark-500/30 px-6 py-3 mt-auto">
          <div className="flex items-center justify-between w-full text-[11px] text-slate-600">
            <span>E-CREDac by Rede Ampara Tec</span>
            <div className="flex items-center gap-4">
              <a href="/termos-de-uso" target="_blank" className="hover:text-slate-400 transition-colors">Termos de Uso</a>
              <a href="/politica-de-privacidade" target="_blank" className="hover:text-slate-400 transition-colors">PolÃ­tica de Privacidade</a>
              <a href="/institucional" className="hover:text-slate-400 transition-colors">Quem Somos</a>
            </div>
          </div>
        </footer>
      </main>

      {/* Termos pendentes */}
      <TermsChecker />

      {/* BotÃ£o de feedback â sÃ³ no desktop, centralizado horizontalmente */}
      <div className="hidden lg:flex fixed bottom-6 right-8 z-40">
        <FeedbackButton />
      </div>
    </div>
  )
}
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { NotificationDropdown } from '@/components/ui/notification-dropdown'
import { TermsChecker } from '@/components/compliance/terms-checker'
import { FeedbackButton } from '@/components/ui/feedback-button'
import { Search, Settings, Info } from 'lucide-react'

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
      {/* Sidebar — desktop fixa + mobile drawer + bottom nav */}
      <Sidebar
        companyName={companyName}
        companyTier={companyTier}
        userRole={userRole}
        displayName={displayName}
      />

      {/*
        Main content:
        - Desktop: ml-60 (afasta da sidebar fixa)
        - Mobile: sem ml, padding-bottom para bottom nav (pb-16)
      */}
      <main className="flex-1 lg:ml-60 min-w-0 flex flex-col pb-16 lg:pb-0">

        {/* ── Top bar ─────────────────────────────────────────── */}
        <header className="h-16 bg-dark-800/80 backdrop-blur-xl border-b border-dark-500/40 flex items-center sticky top-0 z-20">

          {/* Esquerda: busca (desktop) / hambúrguer + logo (mobile) */}
          <div className="flex items-center flex-1 min-w-0">
            {/* Espaçador para o botão hambúrguer no mobile */}
            <div className="w-14 lg:hidden flex-shrink-0" />

            {/* Logo mobile (centro) */}
            <div className="lg:hidden flex-1 flex items-center justify-center">
              <span className="text-sm font-bold text-white">E-CREDac</span>
            </div>

            {/* Busca desktop */}
            <div className="hidden lg:flex relative pl-6">
              <Search size={16} className="absolute left-9 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                placeholder={userRole === 'procurador'
                  ? 'Buscar clientes, comissões...'
                  : 'Buscar operações, créditos...'}
                className="pl-10 pr-4 py-2 w-72 rounded-xl bg-dark-700 border border-dark-500/50 text-sm text-white placeholder-slate-500 focus:bg-dark-600 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all outline-none"
              />
            </div>
          </div>

          {/* Centro: Institucional (desktop) */}
          <div className="hidden lg:flex items-center gap-5 px-6">
            <Link
              href="/institucional"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition-colors"
            >
              <Info size={14} />
              Institucional
            </Link>
          </div>

          {/* Direita: notificações + perfil do usuário (desktop) */}
          <div className="flex items-center gap-1 lg:gap-3 pr-4">
            <NotificationDropdown />
            <Link
              href="/perfil"
              className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-dark-600 border border-transparent hover:border-dark-500/50 transition-all"
              title="Configurações"
            >
              <div className="w-7 h-7 rounded-lg bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-bold flex-shrink-0">
                {displayName.charAt(0)}
              </div>
              <span className="text-sm font-medium max-w-[140px] truncate">{displayName}</span>
              <Settings size={15} className="text-slate-500 flex-shrink-0" />
            </Link>
          </div>
        </header>

        {/* ── Conteúdo da página ───────────────────────────────── */}
        <div className="p-3 lg:p-6 lg:max-w-7xl flex-1">
          {children}
        </div>

        {/* ── Rodapé — apenas desktop ──────────────────────────── */}
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

      {/* Termos pendentes */}
      <TermsChecker />

      {/* Botão de feedback — só no desktop, centralizado horizontalmente */}
      <div className="hidden lg:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <FeedbackButton />
      </div>
    </div>
  )
}
