'use client'

import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: 'brand' | 'accent' | 'success' | 'danger' | 'none'
  gradient?: boolean
  onClick?: () => void
}

export function Card({
  children,
  className,
  hover = false,
  glow = 'none',
  gradient = false,
  onClick
}: CardProps) {
  const glowStyles = {
    none: '',
    brand: 'glow-brand',
    accent: 'glow-accent',
    success: 'glow-success',
    danger: 'glow-danger',
  }

  return (
    <div
      className={cn(
        'bg-dark-700 rounded-2xl border border-dark-500/50 transition-all duration-300',
        hover && 'hover:bg-dark-600 hover:border-dark-400/50 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer',
        gradient && 'border-gradient',
        glowStyles[glow],
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
