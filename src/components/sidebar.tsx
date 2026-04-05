'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, DollarSign, TrendingUp, GitMerge,
  ArrowLeftRight, Building2, Settings, LogOut,
  Users, Wallet, Send, Award, BarChart3, Briefcase, Shield, FileCheck, Gavel
} from 'lucide-react'

type UserRole = 'titular' | 'representante' | 'procurador'

interface NavItem {
  href: string
  label: string
  icon: any
}

const companyNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: GitMerge },
  { href: '/marketplace', label: 'Marketplace', icon: DollarSign },
  { href: '/demandas', label: 'Demandas', icon: TrendingUp },
  { href: '/matching', label: 'Matching', icon: GitMerge },
  { href: '/transacoes', label: 'Transações', icon: ArrowLeftRight },
  { href: '/operacao', label: 'Operações', icon: Shield },
  { href: '/compliance/kyc', label: 'Verificação KYC', icon: FileCheck },
  { href: '/empresas', label: 'Empresas', icon: Building2 },
  { href: '/admin/compliance', label: 'Compliance', icon: Gavel },
  { href: '/admin', label: 'Admin', icon: Settings },
]

const representanteNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: GitMerge },
  { href: '/marketplace', label: 'Marketplace', icon: DollarSign },
  { href: '/demandas', label: 'Demandas', icon: TrendingUp },
  { href: '/matching', label: 'Matching', icon: GitMerge },
  { href: '/transacoes', label: 'Transações', icon: ArrowLeftRight },
  { href: '/operacao', label: 'Operações', icon: Shield },
  { href: '/compliance/kyc', label: 'Verificação KYC', icon: FileCheck },
]

const procuradorNav: NavItem[] = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/marketplace', label: 'Créditos', icon: DollarSign },
  { href: '/demandas', label: 'Demandas', icon: TrendingUp },
  { href: '/pipeline', label: 'Pipeline', icon: GitMerge },
  { href: '/assessor/clientes', label: 'Meus Clientes', icon: Users },
  { href: '/assessor/comissoes', label: 'Comissões', icon: Wallet },
  { href: '/assessor/convites', label: 'Convites', icon: Send },
  { href: '/assessor/ranking', label: 'Ranking & Tier', icon: Award },
]

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case 'procurador': return procuradorNav
    case 'representante': return representanteNav
    default: return companyNav
  }
}

function getRoleBadge(role: UserRole) {
  switch (role) {
    case 'procurador': return { label: 'Assessor', color: 'bg-accent-600/20 text-accent-400 border border-accent-500/30' }
    case 'representante': return { label: 'Representante', color: 'bg-brand-600/20 text-brand-400 border border-brand-500/30' }
    default: return null
  }
}

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

  return (
    <aside className="fixed top-0 left-0 z-40 h-screen w-60 bg-dark-800 border-r border-dark-500/40 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-dark-500/40">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-brand-600/30">
          E
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-white">E-CREDac</span>
        </div>
      </div>

      {/* Role Badge */}
      {roleBadge && (
        <div className="px-5 pt-4 pb-1">
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider', roleBadge.color)}>
            <Briefcase size={10} />
            {roleBadge.label}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
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

      {/* User */}
      <div className="p-4 border-t border-dark-500/40">
        <Link href="/perfil" className="flex items-center gap-3 group mb-2">
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all',
            userRole === 'procurador'
              ? 'bg-accent-600/20 text-accent-400 group-hover:bg-accent-600/30'
              : 'bg-brand-600/20 text-brand-400 group-hover:bg-brand-600/30'
          )}>
            {(displayName || companyName).charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate group-hover:text-brand-400 transition-colors">{displayName || companyName}</p>
            <p className="text-xs text-slate-500">
              {userRole === 'procurador' ? 'Assessor' : companyTier === 'premium' ? 'Premium' : 'Free'}
            </p>
          </div>
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-dark-600 text-slate-500 hover:text-slate-300 transition-colors text-sm">
            <LogOut size={14} />
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
