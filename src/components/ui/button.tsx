'use client'

import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'warning'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500 shadow-lg shadow-brand-500/25',
      secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 focus:ring-brand-500',
      success: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
      warning: 'bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-500',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-600 focus:ring-gray-400',
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
