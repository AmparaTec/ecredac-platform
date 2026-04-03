'use client'

import { Card } from './card'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: string
  trendUp?: boolean
}

export function StatCard({ title, value, subtitle, trend, trendUp }: StatCardProps) {
  return (
    <Card className="p-5 hover:shadow-md transition-all" hover>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      {trend && (
        <p className={`mt-2 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
          {trendUp ? '↑' : '↓'} {trend}
        </p>
      )}
    </Card>
  )
}
