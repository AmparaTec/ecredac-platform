'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquarePlus, X, Send, CheckCircle } from 'lucide-react'

type FeedbackType = 'bug' | 'melhoria' | 'elogio' | 'outro'

const feedbackTypes: { value: FeedbackType; label: string; emoji: string }[] = [
  { value: 'bug', label: 'Bug', emoji: '🐛' },
  { value: 'melhoria', label: 'Melhoria', emoji: '💡' },
  { value: 'elogio', label: 'Elogio', emoji: '👍' },
  { value: 'outro', label: 'Outro', emoji: '💬' },
]

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('melhoria')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return

    setSending(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('feedback').insert({
        user_id: user?.id || null,
        type,
        message: message.trim(),
        page: typeof window !== 'undefined' ? window.location.pathname : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })

      setSent(true)
      setTimeout(() => {
        setOpen(false)
        setSent(false)
        setMessage('')
        setType('melhoria')
      }, 2000)
    } catch (err) {
      console.error('Erro ao enviar feedback:', err)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Botão flutuante discreto */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 w-10 h-10 rounded-full bg-dark-700 border border-dark-500/50 text-slate-500 hover:text-brand-400 hover:border-brand-500/30 shadow-lg transition-all duration-200 flex items-center justify-center group"
        title="Enviar feedback"
      >
        {open ? <X size={16} /> : <MessageSquarePlus size={16} />}
      </button>

      {/* Painel de feedback */}
      {open && (
        <div className="fixed bottom-16 right-4 z-50 w-80 bg-dark-700 border border-dark-500/50 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2">
          {sent ? (
            <div className="p-6 text-center">
              <CheckCircle size={32} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-sm font-medium text-white">Obrigado pelo feedback!</p>
              <p className="text-xs text-slate-500 mt-1">Sua contribuição nos ajuda a melhorar.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="p-4 border-b border-dark-500/50">
                <h3 className="text-sm font-bold text-white">Feedback</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Ajude-nos a melhorar a plataforma</p>
              </div>

              <div className="p-4 space-y-3">
                {/* Tipo */}
                <div className="flex gap-1.5">
                  {feedbackTypes.map((ft) => (
                    <button
                      key={ft.value}
                      type="button"
                      onClick={() => setType(ft.value)}
                      className={`flex-1 text-center py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all ${
                        type === ft.value
                          ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                          : 'bg-dark-600/50 text-slate-500 border border-transparent hover:text-slate-300'
                      }`}
                    >
                      <span className="block text-sm">{ft.emoji}</span>
                      {ft.label}
                    </button>
                  ))}
                </div>

                {/* Mensagem */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descreva sua sugestão, bug ou comentário..."
                  rows={3}
                  required
                  className="w-full rounded-xl border border-dark-500/50 bg-dark-600/50 text-white px-3 py-2 text-sm placeholder-slate-600 resize-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
                />

                {/* Enviar */}
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
                >
                  {sending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  ) : (
                    <>
                      <Send size={14} />
                      Enviar Feedback
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  )
}
