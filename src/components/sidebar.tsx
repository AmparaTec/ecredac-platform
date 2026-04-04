'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, DollarSign, TrendingUp, GitMerge,
  ArrowLeftRight, Building2, Settings, LogOut,
  Users, Wallet, Send, Award, BarChart3, Briefcase
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
  { href: '/transacoes', label: 'Transacoes', icon: ArrowLeftRight },
  { href: '/empresas', label: 'Empresas', icon: Building2 },
  { href: '/admin', label: 'Admin', icon: Settings },
]

const representanteNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: GitMerge },
  { href: '/marketplace', label: 'Marketplace', icon: DollarSign },
  { href: '/demandas', label: 'Demandas', icon: TrendingUp },
  { href: '/matching', label: 'Matching', icon: GitMerge },
  { href: '/transacoes', label: 'Transacoes', icon: ArrowLeftRight },
]

const procuradorNav: NavItem[] = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/assessor/clientes', label: 'Meus Clientes', icon: Users },
  { href: '/assessor/comissoes', label: 'Comissoes', icon: Wallet },
  { href: '/assessor/convites', label: 'Convites', icon: Send },
  { href: '/assessor/ranking', label: 'Ranking & Tier', icon: Award },
  { href: '/assessor/relatorios', label: 'Relatorios', icon: BarChart3 },
]

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case 'procurador':
      return procuradorNav
    case 'representante':
      return representanteNav
    default:
      return companyNav
  }
}

function getRoleBadge(role: UserRole) {
  switch (role) {
    case 'procurador':
      return { label: 'Assessor', color: 'bg-purple-100 text-purple-700' }
    case 'representante':
      return { label: 'Representante', color: 'bg-blue-100 text-blue-700' }
    default:
      return null
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
    <aside className="fixed top-0 left-0 z-40 h-screen w-56 bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-black text-sm">
          E
        </div>
        <span className="text-lg font-bold tracking-tight">E-CREDac</span>
      </div>

      {/* Role Badge */}
      {roleBadge && (
        <div className="px-4 pt-3 pb-1">
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider', roleBadge.color)}>
            <Briefcase size={10} />
            {roleBadge.label}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2 p-2">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs',
            userRole === 'procurador'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-brand-100 text-brand-700'
          )}>
            {(displayName || companyName).charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName || companyName}</p>
            <p className="text-xs text-gray-400">
              {userRole === 'procurador' ? 'Assessor' : companyTier === 'premium' ? 'Premium' : 'Free'}
            </p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="p-1 rounded hover:bg-gray-100 text-gray-400">
              <LogOut size={14} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
