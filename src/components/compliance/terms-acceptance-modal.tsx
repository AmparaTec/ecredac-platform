'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Check, ChevronDown, ChevronUp, Loader2, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Termo {
  id: string
  tipo: string
  versao: string
  titulo: string
  conteudo: string
  obrigatorio: boolean
  aceito: boolean
}

interface TermsAcceptanceModalProps {
  /** Se true, verifica termos pendentes ao montar */
  autoCheck?: boolean
  /** Callback após aceitar todos os termos */
  onAccepted?: () => void
}

export function TermsAcceptanceModal({ autoCheck = true, onAccepted }: TermsAcceptanceModalProps) {
  const [termos, setTermos] = useState<Termo[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')

  const fetchPendingTerms = useCallback(async () => {
    try {
      const res = await fetch('/api/compliance/termos?pending=true')
      const data = await res.json()
      if (data.termos && data.termos.length > 0) {
        setTermos(data.termos)
        setVisible(true)
      } else {
        setVisible(false)
      }
    } catch {
      // Silencioso — se falhar, não bloqueia
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (autoCheck) fetchPendingTerms()
  }, [autoCheck, fetchPendingTerms])

  function toggleCheck(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allChecked = termos.length > 0 && termos.every(t => checked.has(t.id))

  async function handleAccept() {
    if (!allChecked) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/compliance/termos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aceites: termos.map(t => ({ tipo: t.tipo, versao: t.versao })),
        }),
      })

      const data = await res.json()
      if (data.ok) {
        setVisible(false)
        onAccepted?.()
      } else {
        setError(data.error || 'Erro ao registrar aceite')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !visible) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-dark-800 border border-dark-500/50 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-dark-500/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-brand-500/10">
              <Shield size={24} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Termos e Condições</h2>
              <p className="text-sm text-slate-400">
                Para continuar usando a plataforma, é necessário aceitar os termos abaixo.
              </p>
            </div>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {termos.map(termo => (
            <div
              key={termo.id}
              className={cn(
                'border rounded-xl transition-all',
                checked.has(termo.id)
                  ? 'border-brand-500/50 bg-brand-500/5'
                  : 'border-dark-500/50 bg-dark-700/30'
              )}
            >
              {/* Título + checkbox */}
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => toggleCheck(termo.id)}
                  className={cn(
                    'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                    checked.has(termo.id)
                      ? 'bg-brand-500 border-brand-500'
                      : 'border-slate-500 hover:border-brand-400'
                  )}
                >
                  {checked.has(termo.id) && <Check size={12} className="text-white" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-slate-400" />
                    <span className="text-sm font-semibold text-white">{termo.titulo}</span>
                    <span className="text-xs text-slate-500">v{termo.versao}</span>
                  </div>
                </div>

                <button
                  onClick={() => setExpanded(expanded === termo.id ? null : termo.id)}
                  className="p-1.5 rounded-lg hover:bg-dark-600 text-slate-400 transition-colors"
                >
                  {expanded === termo.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Conteúdo expandido */}
              {expanded === termo.id && (
                <div className="px-4 pb-4 border-t border-dark-500/30">
                  <div className="mt-3 max-h-60 overflow-y-auto text-xs text-slate-300 leading-relaxed prose prose-invert prose-sm prose-headings:text-white prose-headings:text-sm whitespace-pre-wrap">
                    {termo.conteudo}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-dark-500/50 space-y-3">
          {error && (
            <p className="text-xs text-danger-400 text-center">{error}</p>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Shield size={12} />
            <span>
              Ao aceitar, você confirma ter lido e concordado com todos os termos marcados.
              Seu aceite é registrado com data, hora e IP para fins de auditoria.
            </span>
          </div>

          <button
            onClick={handleAccept}
            disabled={!allChecked || submitting}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all',
              allChecked
                ? 'bg-brand-500 hover:bg-brand-400 text-white'
                : 'bg-dark-600 text-slate-500 cursor-not-allowed'
            )}
          >
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> Registrando aceite...</>
            ) : (
              <><Check size={16} /> Aceitar {termos.length} termo{termos.length > 1 ? 's' : ''} e continuar</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
