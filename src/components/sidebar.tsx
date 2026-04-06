'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, DollarSign, TrendingUp, GitMerge,
  ArrowLeftRight, Building2, Settings, LogOut,
  Users, Wallet, Send, Award, Briefcase, Shield, FileCheck, Gavel, Info,
  MessageSquarePlus, X, Menu, SlidersHorizontal
} from 'lucide-react'

type UserRole = 'titular' | 'representante' | 'procurador'

interface NavItem {
  href: string
  label: string
  icon: any
}

const companyNav: NavItem[] = [
  { href: '/dashboard',        label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/pipeline',         label: 'Pipeline',        icon: GitMerge },
  { href: '/marketplace',      label: 'Marketplace',     icon: DollarSign },
  { href: '/demandas',         label: 'Demandas',        icon: TrendingUp },
  { href: '/matching',         label: 'Matching',        icon: GitMerge },
  { href: '/transacoes',       label: 'Transações',      icon: ArrowLeftRight },
  { href: '/operacao',         label: 'Operações',       icon: Shield },
  { href: '/compliance/kyc',   label: 'Verificação KYC', icon: FileCheck },
  { href: '/empresas',         label: 'Empresas',        icon: Building2 },
  { href: '/admin/compliance', label: 'Compliance',      icon: Gavel },
  { href: '/admin',            label: 'Admin',           icon: Settings },
  { href: '/feedbacks',        label: 'Feedbacks',       icon: MessageSquarePlus },
  { href: '/institucional',    label: 'Quem Somos',      icon: Info },
  { href: '/perfil',           label: 'Configurações',   icon: SlidersHorizontal },
]

const representanteNav: NavItem[] = [
  { href: '/dashboard',      label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/pipeline',       label: 'Pipeline',        icon: GitMerge },
  { href: '/marketplace',    label: 'Marketplace',     icon: DollarSign },
  { href: '/demandas',       label: 'Demandas',        icon: TrendingUp },
  { href: '/matching',       label: 'Matching',        icon: GitMerge },
  { href: '/transacoes',     label: 'Transações',      icon: ArrowLeftRight },
  { href: '/operacao',       label: 'Operações',       icon: Shield },
  { href: '/compliance/kyc', label: 'Verificação KYC', icon: FileCheck },
  { href: '/institucional',  label: 'Quem Somos',      icon: Info },
  { href: '/perfil',         label: 'Configurações',   icon: SlidersHorizontal },
]

const procuradorNav: NavItem[] = [
  { href: '/dashboard',         label: 'Painel',        icon: LayoutDashboard },
  { href: '/marketplace',       label: 'Créditos',      icon: DollarSign },
  { href: '/demandas',          label: 'Demandas',      icon: TrendingUp },
  { href: '/pipeline',          label: 'Pipeline',      icon: GitMerge },
  { href: '/assessor/clientes', label: 'Meus Clientes', icon: Users },
  { href: '/assessor/comissoes',label: 'Comissões',     icon: Wallet },
  { href: '/assessor/convites', label: 'Convites',      icon: Send },
  { href: '/assessor/ranking',  label: 'Ranking & Tier',icon: Award },
  { href: '/institucional',     label: 'Quem Somos',    icon: Info },
  { href: '/perfil',            label: 'Configurações', icon: SlidersHorizontal },
]

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case 'procurador':   return procuradorNav
    case 'representante':return representanteNav
    default:             return companyNav
  }
}

function getRoleBadge(role: UserRole) {
  switch (role) {
    case 'procurador':   return { label: 'Assessor',      color: 'bg-accent-600/20 text-accent-400 border border-accent-500/30' }
    case 'representante':return { label: 'Representante', color: 'bg-brand-600/20 text-brand-400 border border-brand-500/30' }
    default:             return null
  }
}

const mobileBottomNav = [
  { href: '/dashboard',   label: 'Painel',    icon: LayoutDashboard },
  { href: '/pipeline',    label: 'Pipeline',  icon: GitMerge },
  { href: '/marketplace', label: 'Market',    icon: DollarSign },
  { href: '/demandas',    label: 'Demandas',  icon: TrendingUp },
  { href: '/transacoes',  label: 'Transações',icon: ArrowLeftRight },
]

interface SidebarProps {
  companyName: string
  companyTier: string
  userRole?: UserRole
  displayName?: string
}

export function Sidebar({ companyName, companyTier, userRole = 'titular', displayName }: SidebarProps) {
  const pathname = usePathname()
  const navItems = getNavItems(userRole)
  const roleBadge = getRoleBadge(userRole)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const SidebarContent = () => (
    <>
      <div className="h-16 flex items-center justify-between px-5 border-b border-dark-500/40 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-brand-600/30">
            E
          </div>
          <span className="text-lg font-bold tracking-tight text-white">E-CREDac</span>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-white hover:bg-dark-600 transition-colors"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      {roleBadge && (
        <div className="px-5 pt-4 pb-1 flex-shrink-0">
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider', roleBadge.color)}>
            <Briefcase size={10} />
            {roleBadge.label}
          </span>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20 shadow-sm shadow-brand-500/10'
                  : 'text-slate-400 hover:bg-dark-600 hover:text-white border border-transparent'
              )}
            >
              <Icon size={18} className={isActive ? 'text-brand-400' : ''} />
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-dark-500/40 flex-shrink-0">
        <Link href="/perfil" className="flex items-center gap-3 group mb-2">
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all flex-shrink-0',
            userRole === 'procurador'
              ? 'bg-accent-600/20 text-accent-400 group-hover:bg-accent-600/30'
              : 'bg-brand-600/20 text-brand-400 group-hover:bg-brand-600/30'
          )}>
            {(displayName || companyName).charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate group-hover:text-brand-400 transition-colors">
              {displayName || companyName}
            </p>
            <p className="text-xs text-slate-500">
              {userRole === 'procurador' ? 'Assessor' : companyTier === 'premium' ? 'Premium' : 'Free'}
            </p>
          </div>
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-dark-600 text-slate-500 hover:text-slate-300 transition-colors text-sm"
          >
            <LogOut size={14} />
            Sair da conta
          </button>
        </form>
      </div>
    </>
  )

  return (
    <>
      <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-screen w-60 bg-dark-800 border-r border-dark-500/40 flex-col">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'lg:hidden fixed top-0 left-0 z-50 h-screen w-72 bg-dark-800 border-r border-dark-500/40 flex flex-col transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Menu de navegação"
      >
        <SidebarContent />
      </aside>

      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-0 left-0 z-30 h-16 px-4 flex items-center text-slate-400 hover:text-white transition-colors"
        aria-label="Abrir menu"
        id="mobile-menu-btn"
      >
        <Menu size={22} />
      </button>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-dark-800/95 backdrop-blur-sm border-t border-dark-500/40 flex items-center">
        {mobileBottomNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors text-[10px] font-medium',
                isActive ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <Icon size={20} className={isActive ? 'text-brand-400' : ''} />
              <span>{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-brand-400 rounded-full" />
              )}
            </Link>
          )
        })}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors text-[10px] font-medium text-slate-500 hover:text-slate-300"
        >
          <Menu size={20} />
          <span>Mais</span>
        </button>
      </nav>
    </>
  )
}
