'use client'

import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'premium'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const styles = {
    default: 'bg-dark-500/60 text-dark-300 border border-dark-400/40',
    success: 'bg-success-500/15 text-success-400 border border-success-500/25',
    warning: 'bg-warning-500/15 text-warning-400 border border-warning-500/25',
    danger: 'bg-danger-500/15 text-danger-400 border border-danger-500/25',
    info: 'bg-brand-500/15 text-brand-400 border border-brand-500/25',
    premium: 'bg-gradient-to-r from-brand-600 to-accent-600 text-white border-0',
  }

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
      styles[variant],
      className
    )}>
      {children}
    </span>
  )
}
