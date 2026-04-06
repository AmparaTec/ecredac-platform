'use client'

import { useState } from 'react'
import { AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScoreDisclaimerProps {
  /** Variante visual */
  variant?: 'inline' | 'banner' | 'tooltip'
  /** Mostrar versão completa ou resumida */
  expanded?: boolean
  className?: string
}

const DISCLAIMER_SHORT = 'O Score de Liquidez é uma estimativa baseada em dados públicos e declarados. Não constitui garantia de homologação pela SEFAZ nem recomendação de investimento.'

const DISCLAIMER_FULL = `O Score de Liquidez (Credit Liquidity Score) exibido nesta plataforma é uma estimativa calculada com base em dados públicos disponíveis e informações declaradas pelos participantes. Este indicador:

• NÃO constitui garantia de homologação do crédito pela SEFAZ;
• NÃO representa uma avaliação oficial de qualquer órgão governamental;
• NÃO deve ser interpretado como recomendação de investimento ou consultoria tributária;
• Pode divergir significativamente da avaliação real feita pelos órgãos competentes;
• Está sujeito a variações conforme atualização de dados e mudanças regulatórias.

A E-CREDac atua exclusivamente como intermediadora tecnológica. Recomendamos que todas as decisões de negociação sejam acompanhadas de consultoria jurídica e contábil independente.

Base legal: Art. 73 do RICMS/SP; Portaria SRE 65/2023; Portaria CAT 83/2009.`

/**
 * Componente de disclaimer obrigatório em toda tela que exibe scores.
 */
export function ScoreDisclaimer({ variant = 'inline', expanded: defaultExpanded = false, className }: ScoreDisclaimerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (variant === 'tooltip') {
    return (
      <span className={cn('inline-flex items-center gap-1 cursor-help group relative', className)}>
        <Info size={12} className="text-amber-400/60" />
        <span className="hidden group-hover:block absolute bottom-full left-0 mb-2 w-72 p-3 bg-dark-800 border border-dark-500/50 rounded-xl text-xs text-slate-300 leading-relaxed shadow-xl z-50">
          {DISCLAIMER_SHORT}
        </span>
      </span>
    )
  }

  if (variant === 'banner') {
    return (
      <div className={cn('bg-amber-500/5 border border-amber-500/20 rounded-xl p-4', className)}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
              Aviso Importante
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              {DISCLAIMER_SHORT}
            </p>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-amber-400/70 hover:text-amber-400 mt-2 transition-colors"
            >
              {expanded ? 'Menos detalhes' : 'Mais detalhes'}
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {expanded && (
              <p className="mt-2 text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                {DISCLAIMER_FULL}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // variant === 'inline'
  return (
    <div className={cn('flex items-start gap-2 text-xs text-slate-500', className)}>
      <Info size={12} className="text-amber-400/50 mt-0.5 flex-shrink-0" />
      <div>
        <p className="leading-relaxed">{DISCLAIMER_SHORT}</p>
        {expanded && (
          <p className="mt-1 text-slate-500/80 leading-relaxed whitespace-pre-line">{DISCLAIMER_FULL}</p>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-amber-400/60 hover:text-amber-400 mt-1 transition-colors"
        >
          {expanded ? 'Menos detalhes ↑' : 'Saiba mais →'}
        </button>
      </div>
    </div>
  )
}
