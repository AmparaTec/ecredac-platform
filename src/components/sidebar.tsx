'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, DollarSign, TrendingUp, GitMerge,
  ArrowLeftRight, Building2, Settings, LogOut, Bell
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: GitMerge },
  { href: '/marketplace', label: 'Marketplace', icon: DollarSign },
  { href: '/demandas', label: 'Demandas', icon: TrendingUp },
  { href: '/matching', label: 'Matching', icon: GitMerge },
  { href: '/transacoes', label: 'Transacoes', icon: ArrowLeftRight },
  { href: '/empresas', label: 'Empresas', icon: Building2 },
  { href: '/admin', label: 'Admin', icon: Settings },
]

interface SidebarProps {
  companyName: string
  companyTier: string
}

export function Sidebar({ companyName, companyTier }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed top-0 left-0 z-40 h-screen w-56 bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-black text-sm">
          E
        </div>
        <span className="text-lg font-bold tracking-tight">E-CREDac</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
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
          <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
            {companyName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{companyName}</p>
            <p className="text-xs text-gray-400">{companyTier === 'premium' ? 'Premium' : 'Free'}</p>
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
