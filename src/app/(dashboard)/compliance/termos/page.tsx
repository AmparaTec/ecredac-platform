'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Check, Clock, Shield, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Termo {
  id: string
  tipo: string
  versao: string
  titulo: string
  conteudo: string
  obrigatorio: boolean
  aceito: boolean
  aceito_em: string | null
  publicado_em: string
}

const TIPO_LABELS: Record<string, string> = {
  termos_uso: 'Termos de Uso',
  politica_privacidade: 'Política de Privacidade',
  termo_intermediacao: 'Termo de Intermediação',
  termo_risco: 'Termo de Risco',
  lgpd_consentimento: 'Consentimento LGPD',
}

export default function TermosPage() {
  const [termos, setTermos] = useState<Termo[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchTermos = useCallback(async () => {
    try {
      const res = await fetch('/api/compliance/termos')
      const data = await res.json()
      setTermos(data.termos || [])
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTermos() }, [fetchTermos])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-brand-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-3">
          <Shield size={28} className="text-brand-400" />
          Termos e Políticas
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Confira os documentos jurídicos vigentes e o status do seu aceite.
        </p>
      </div>

      <div className="space-y-3">
        {termos.map(termo => (
          <div key={termo.id} className={cn(
            'border rounded-2xl overflow-hidden transition-all',
            termo.aceito
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-amber-500/20 bg-amber-500/5'
          )}>
            <button
              onClick={() => setExpanded(expanded === termo.id ? null : termo.id)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <div className={cn(
                'p-2 rounded-xl',
                termo.aceito ? 'bg-emerald-500/10' : 'bg-amber-500/10'
              )}>
                <FileText size={16} className={termo.aceito ? 'text-emerald-400' : 'text-amber-400'} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{termo.titulo}</p>
                <p className="text-xs text-slate-500">
                  {TIPO_LABELS[termo.tipo] || termo.tipo} · Versão {termo.versao}
                  {termo.obrigatorio && ' · Obrigatório'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {termo.aceito ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <Check size={12} />
                    Aceito em {new Date(termo.aceito_em!).toLocaleDateString('pt-BR')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <Clock size={12} />
                    Pendente
                  </span>
                )}
                {expanded === termo.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </div>
            </button>

            {expanded === termo.id && (
              <div className="px-4 pb-4 border-t border-dark-500/20">
                <div className="mt-3 max-h-96 overflow-y-auto text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-mono bg-dark-800/50 rounded-xl p-4">
                  {termo.conteudo}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
