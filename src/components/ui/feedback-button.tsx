'use client'

import { useState, useRef, useCallback } from 'react'

type FeedbackType = 'bug' | 'melhoria' | 'elogio' | 'outro'

const TIPOS: { value: FeedbackType; label: string; emoji: string }[] = [
  { value: 'bug',      label: 'Bug',      emoji: '🐛' },
  { value: 'melhoria', label: 'Melhoria', emoji: '💡' },
  { value: 'elogio',   label: 'Elogio',   emoji: '👍' },
  { value: 'outro',    label: 'Outro',    emoji: '💬' },
]

export function FeedbackButton() {
  const [open, setOpen]       = useState(false)
  const [tipo, setTipo]       = useState<FeedbackType>('melhoria')
  const [msg, setMsg]         = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [erro, setErro]       = useState<string | null>(null)

  // Drag
  const [bottomY, setBottomY]     = useState(20)
  const [dragging, setDragging]   = useState(false)
  const startY                    = useRef(0)
  const startBottom               = useRef(0)
  const didDrag                   = useRef(false)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true)
    didDrag.current   = false
    startY.current    = e.clientY
    startBottom.current = bottomY
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [bottomY])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    const delta = startY.current - e.clientY
    const max   = typeof window !== 'undefined' ? window.innerHeight - 56 : 600
    setBottomY(Math.max(16, Math.min(max, startBottom.current + delta)))
    if (Math.abs(delta) > 4) didDrag.current = true
  }, [dragging])

  const onPointerUp = useCallback(() => setDragging(false), [])

  const onClick = useCallback(() => {
    if (!didDrag.current) { setOpen(p => !p); setErro(null) }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!msg.trim()) return
    setSending(true); setErro(null)
    try {
      const res  = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tipo, message: msg.trim(), page: window.location.pathname }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? 'Erro ao enviar.'); return }
      setSent(true)
      setTimeout(() => { setOpen(false); setSent(false); setMsg(''); setTipo('melhoria'); setErro(null) }, 2500)
    } catch { setErro('Sem conexão.') }
    finally  { setSending(false) }
  }

  const panelBottom = bottomY + 56

  return (
    <>
      {/* Botão flutuante */}
      <div
        className={`fixed right-4 z-50 flex items-center gap-0.5 select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ bottom: `${bottomY}px` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="w-1.5 h-6 flex flex-col items-center justify-center gap-[3px] opacity-20 hover:opacity-40 transition-opacity">
          <div className="w-1 h-1 rounded-full bg-gray-400" />
          <div className="w-1 h-1 rounded-full bg-gray-400" />
          <div className="w-1 h-1 rounded-full bg-gray-400" />
        </div>
        <button
          onClick={onClick}
          title="Enviar feedback"
          className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors flex items-center justify-center text-base"
        >
          {open ? '✕' : '💬'}
        </button>
      </div>

      {/* Painel */}
      {open && (
        <div
          className="fixed right-4 z-50 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ bottom: `${panelBottom}px` }}
        >
          {sent ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-sm font-bold text-gray-800">Obrigado pelo feedback!</p>
              <p className="text-xs text-gray-400 mt-1">Sua contribuição nos ajuda a melhorar.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Feedback</h3>
                  <p className="text-[11px] text-gray-400">Ajude-nos a melhorar a plataforma</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex gap-1.5">
                  {TIPOS.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTipo(t.value)}
                      className={`flex-1 text-center py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                        tipo === t.value
                          ? 'bg-blue-50 text-blue-600 border-blue-200'
                          : 'bg-gray-50 text-gray-400 border-transparent hover:border-gray-200'
                      }`}
                    >
                      <span className="block text-base mb-0.5">{t.emoji}</span>
                      {t.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  placeholder="Descreva sua sugestão, bug ou comentário..."
                  rows={4}
                  required
                  maxLength={2000}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-700 px-3 py-2.5 text-sm placeholder-gray-400 resize-none focus:outline-none focus:border-blue-300 transition"
                />

                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-300">{msg.length}/2000</span>
                </div>

                {erro && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
                )}

                <button
                  type="submit"
                  disabled={sending || !msg.trim()}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition"
                >
                  {sending ? 'Enviando…' : '📤 Enviar Feedback'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  )
}
