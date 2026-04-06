'use client'

import { Card } from './card'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: string
  trendUp?: boolean
  icon?: React.ReactNode
  glow?: 'brand' | 'accent' | 'success' | 'danger' | 'none'
}

export function StatCard({ title, value, subtitle, trend, trendUp, icon, glow = 'none' }: StatCardProps) {
  return (
    <Card className="p-5 group" hover glow={glow}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="mt-2 text-2xl font-black text-white tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          {trend && (
            <p className={`mt-2 text-xs font-semibold flex items-center gap-1 ${trendUp ? 'text-success-400' : 'text-danger-400'}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${trendUp ? 'bg-success-400' : 'bg-danger-400'}`} />
              {trend}
            </p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-dark-500/50 flex items-center justify-center text-slate-400 group-hover:text-brand-400 transition-colors">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
