'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  value: string
  onChange: (rawValue: string, numericValue: number) => void
  placeholder?: string
  required?: boolean
  min?: number
  className?: string
  prefix?: string
  allowDecimals?: boolean
}

/**
 * Input monetário com formatação BR (1.234.567,89)
 * Armazena o valor numérico internamente e exibe formatado
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = '0,00',
  required = false,
  min,
  className,
  prefix = 'R$',
  allowDecimals = true,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (!value || value === '0' || value === '') return ''
    const num = parseFloat(value)
    if (isNaN(num)) return ''
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: allowDecimals ? 2 : 0,
      maximumFractionDigits: allowDecimals ? 2 : 0,
    }).format(num)
  })

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value

    if (allowDecimals) {
      // Mode: cents-based (type digits, auto-place decimal)
      const digits = raw.replace(/\D/g, '')
      if (!digits) {
        setDisplayValue('')
        onChange('', 0)
        return
      }
      const num = parseInt(digits, 10) / 100
      const formatted = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num)
      setDisplayValue(formatted)
      onChange(String(num), num)
    } else {
      // Mode: integer (no decimals, format with dots)
      const digits = raw.replace(/\D/g, '')
      if (!digits) {
        setDisplayValue('')
        onChange('', 0)
        return
      }
      const num = parseInt(digits, 10)
      const formatted = new Intl.NumberFormat('pt-BR').format(num)
      setDisplayValue(formatted)
      onChange(String(num), num)
    }
  }, [allowDecimals, onChange])

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className={cn(
          'w-full rounded-xl border border-dark-500/50 bg-dark-700 text-white py-2.5 text-sm text-right',
          prefix ? 'pl-10 pr-4' : 'px-4',
          className
        )}
      />
    </div>
  )
}

/**
 * Input de percentual com formatação BR
 */
interface PercentInputProps {
  value: string
  onChange: (rawValue: string, numericValue: number) => void
  placeholder?: string
  min?: number
  max?: number
  step?: number
  className?: string
}

export function PercentInput({
  value,
  onChange,
  placeholder = '0,00',
  min = 0,
  max = 100,
  className,
}: PercentInputProps) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (!value || value === '0' || value === '') return ''
    const num = parseFloat(value)
    if (isNaN(num)) return ''
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  })

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const digits = raw.replace(/\D/g, '')
    if (!digits) {
      setDisplayValue('')
      onChange('', 0)
      return
    }
    const num = parseInt(digits, 10) / 100
    const clamped = Math.min(Math.max(num, min), max)
    const formatted = clamped.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    setDisplayValue(formatted)
    onChange(String(clamped), clamped)
  }, [min, max, onChange])

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-xl border border-dark-500/50 bg-dark-700 text-white px-4 py-2.5 text-sm text-right pr-8',
          className
        )}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium pointer-events-none">
        %
      </span>
    </div>
  )
}
