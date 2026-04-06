'use client'

import { useState, useRef, useCallback } from 'react'
import { MessageSquarePlus, X, Send, CheckCircle, AlertCircle } from 'lucide-react'

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Drag state
  const [bottomY, setBottomY] = useState(16) // px from bottom
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)
  const dragStartBottom = useRef(0)
  const didDrag = useRef(false)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true)
    didDrag.current = false
    dragStartY.current = e.clientY
    dragStartBottom.current = bottomY
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [bottomY])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    const delta = dragStartY.current - e.clientY
    const maxBottom = typeof window !== 'undefined' ? window.innerHeight - 56 : 600
    const newBottom = Math.max(16, Math.min(maxBottom, dragStartBottom.current + delta))
    setBottomY(newBottom)
    if (Math.abs(delta) > 4) didDrag.current = true
  }, [isDragging])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleClick = useCallback(() => {
    if (!didDrag.current) {
      setOpen(prev => !prev)
      setErrorMsg(null)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return

    setSending(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          page: typeof window !== 'undefined' ? window.location.pathname : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Erro ao enviar. Tente novamente.')
        return
      }

      setSent(true)
      setTimeout(() => {
        setOpen(false)
        setSent(false)
        setMessage('')
        setType('melhoria')
        setErrorMsg(null)
      }, 2500)
    } catch {
      setErrorMsg('Sem conexão. Verifique sua internet.')
    } finally {
      setSending(false)
    }
  }

  // Panel position: above the button
  const panelBottom = bottomY + 52
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 640

  return (
    <>
      {/* Botão flutuante arrastável */}
      <div
        className={`fixed right-4 z-50 flex items-center gap-0.5 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ bottom: `${bottomY}px` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Handle de arraste */}
        <div className="w-1.5 h-6 flex flex-col items-center justify-center gap-[3px] opacity-25 hover:opacity-50 transition-opacity">
          <div className="w-1 h-1 rounded-full bg-slate-400" />
          <div className="w-1 h-1 rounded-full bg-slate-400" />
          <div className="w-1 h-1 rounded-full bg-slate-400" />
        </div>
        <button
          onClick={handleClick}
          className="w-10 h-10 rounded-full bg-dark-700 border border-dark-500/50 text-slate-500 hover:text-brand-400 hover:border-brand-500/30 shadow-lg transition-colors duration-200 flex items-center justify-center"
          title="Enviar feedback"
          aria-label="Abrir painel de feedback"
        >
          {open ? <X size={16} /> : <MessageSquarePlus size={16} />}
        </button>
      </div>

      {/* Painel de feedback */}
      {open && (
        <div
          className="fixed inset-0 sm:inset-auto sm:right-4 z-50 sm:w-80 bg-dark-700 sm:border sm:border-dark-500/50 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={isDesktop ? { bottom: `${panelBottom}px` } : undefined}
        >
          {sent ? (
            /* Estado de sucesso */
            <div className="p-8 text-center flex flex-col items-center justify-center flex-1">
              <CheckCircle size={36} className="text-emerald-400 mb-3" />
              <p className="text-sm font-bold text-white">Obrigado pelo feedback!</p>
              <p className="text-xs text-slate-400 mt-1.5">Sua contribuição nos ajuda a melhorar a plataforma.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col flex-1">
              {/* Header */}
              <div className="p-4 border-b border-dark-500/50 flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-white">Feedback</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Ajude-nos a melhorar a plataforma</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="sm:hidden p-2 rounded-lg hover:bg-dark-600/50 text-slate-400 hover:text-white transition-colors"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-3 flex-1 flex flex-col">
                {/* Tipo */}
                <div className="flex gap-1.5">
                  {feedbackTypes.map((ft) => (
                    <button
                      key={ft.value}
                      type="button"
                      onClick={() => setType(ft.value)}
                      className={`flex-1 text-center py-1.5 px-1 rounded-lg text-[11px] font-medium transition-all ${
                        type === ft.value
                          ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                          : 'bg-dark-600/50 text-slate-500 border border-transparent hover:text-slate-300'
                      }`}
                    >
                      <span className="block text-base mb-0.5">{ft.emoji}</span>
                      {ft.label}
                    </button>
                  ))}
                </div>

                {/* Mensagem */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descreva sua sugestão, bug ou comentário..."
                  rows={4}
                  required
                  maxLength={2000}
                  className="w-full flex-1 sm:flex-none rounded-xl border border-dark-500/50 bg-dark-600/50 text-white px-3 py-2.5 text-sm placeholder-slate-600 resize-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
                />

                {/* Contador de caracteres */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-600">{message.length}/2000</span>
                </div>

                {/* Erro */}
                {errorMsg && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    {errorMsg}
                  </div>
                )}

                {/* Enviar */}
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
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
