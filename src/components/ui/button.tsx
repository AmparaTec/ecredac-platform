'use client'

import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'warning' | 'accent'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-brand-600 hover:bg-brand-500 text-white focus:ring-brand-500 shadow-lg shadow-brand-600/20',
      secondary: 'bg-dark-600 hover:bg-dark-500 text-slate-600 border border-dark-400/50 focus:ring-brand-500',
      accent: 'bg-accent-600 hover:bg-accent-500 text-white focus:ring-accent-500 shadow-lg shadow-accent-600/20',
      success: 'bg-success-500 hover:bg-success-400 text-slate-900 focus:ring-success-500 shadow-lg shadow-success-500/20',
      danger: 'bg-danger-500 hover:bg-danger-400 text-slate-900 focus:ring-danger-500 shadow-lg shadow-danger-500/20',
      warning: 'bg-warning-500 hover:bg-warning-400 text-dark-900 focus:ring-warning-500',
      ghost: 'bg-transparent hover:bg-dark-600 text-slate-500 hover:text-slate-900 focus:ring-dark-400',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export { Button }
