'use client'

import { useState } from 'react'
import { MessageCircle, Mail, Copy, Check, Send, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShareInviteProps {
  referralCode: string
  className?: string
  /** Modo compacto: só mostra o código + botões inline */
  compact?: boolean
}

export function ShareInvite({ referralCode, className, compact = false }: ShareInviteProps) {
  const [mode, setMode] = useState<'idle' | 'whatsapp' | 'email'>('idle')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const link = `https://ecredac.com.br/register?ref=${referralCode}`

  function handleCopy() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function reset() {
    setMode('idle')
    setPhone('')
    setEmail('')
    setNome('')
    setError('')
    setSent(false)
  }

  async function handleSendWhatsApp() {
    if (!phone.trim()) { setError('Informe o número'); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          template: 'convite_plataforma',
          params: { nome, link, codigo: referralCode },
        }),
      })
      const data = await res.json()
      if (data.fallback === 'wa.me' && data.fallbackUrl) {
        // API não configurada — abrir wa.me diretamente
        window.open(data.fallbackUrl, '_blank')
        setSent(true)
      } else if (data.ok) {
        setSent(true)
      } else {
        // Fallback: abrir wa.me
        if (data.fallbackUrl) {
          window.open(data.fallbackUrl, '_blank')
          setSent(true)
        } else {
          setError(data.error || 'Erro ao enviar')
        }
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setSending(false)
    }
  }

  async function handleSendEmail() {
    if (!email.trim()) { setError('Informe o e-mail'); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '', // não usado
          message: '', // não usado
          // Usar rota genérica — na prática chamaremos o Resend
          template: 'convite_email',
          params: { nome, email: email.trim(), link, codigo: referralCode },
        }),
      })
      // Fallback: abrir mailto
      const mailto = `mailto:${email.trim()}?subject=${encodeURIComponent('Convite E-CREDac — Créditos de ICMS')}&body=${encodeURIComponent(
        `Olá${nome ? ` ${nome}` : ''},\n\nVocê foi convidado para a plataforma E-CREDac — o maior marketplace de créditos de ICMS do Brasil.\n\nCadastre-se pelo link: ${link}\n\nCódigo de indicação: ${referralCode}\n\nAbraços!`
      )}`
      window.open(mailto, '_blank')
      setSent(true)
    } catch {
      setError('Erro de conexão')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className={cn('bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center', className)}>
        <Check size={24} className="text-emerald-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-emerald-400">Convite enviado!</p>
        <button onClick={reset} className="text-xs text-slate-500 hover:text-slate-900 mt-2 transition-colors">
          Enviar outro
        </button>
      </div>
    )
  }

  // Formulário de envio
  if (mode !== 'idle') {
    return (
      <div className={cn('bg-dark-700/50 border border-dark-500/50 rounded-xl p-4 space-y-3', className)}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {mode === 'whatsapp' ? 'Enviar via WhatsApp' : 'Enviar via E-mail'}
          </p>
          <button onClick={reset} className="p-1 rounded-lg hover:bg-dark-600 text-slate-500">
            <X size={14} />
          </button>
        </div>

        <input
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Nome do contato (opcional)"
          className="w-full px-3 py-2 rounded-lg bg-dark-600 border border-dark-500/50 text-slate-900 text-sm placeholder-slate-500 focus:border-brand-500/50 transition-all"
        />

        {mode === 'whatsapp' ? (
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            type="tel"
            className="w-full px-3 py-2 rounded-lg bg-dark-600 border border-dark-500/50 text-slate-900 text-sm placeholder-slate-500 focus:border-brand-500/50 transition-all"
            autoFocus
          />
        ) : (
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@empresa.com.br"
            type="email"
            className="w-full px-3 py-2 rounded-lg bg-dark-600 border border-dark-500/50 text-slate-900 text-sm placeholder-slate-500 focus:border-brand-500/50 transition-all"
            autoFocus
          />
        )}

        {error && <p className="text-xs text-danger-400">{error}</p>}

        <button
          onClick={mode === 'whatsapp' ? handleSendWhatsApp : handleSendEmail}
          disabled={sending}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50',
            mode === 'whatsapp'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          )}
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {sending ? 'Enviando...' : 'Enviar Convite'}
        </button>
      </div>
    )
  }

  // Idle: mostrar código + 3 botões
  return (
    <div className={cn('space-y-3', className)}>
      {!compact && (
        <div className="flex items-center gap-2 p-3 bg-dark-600 rounded-xl border border-dark-500/50">
          <span className="font-mono text-lg font-black tracking-[0.2em] text-brand-400 flex-1">
            {referralCode || '--------'}
          </span>
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-dark-500 text-slate-600 hover:bg-dark-400 transition-all"
            title="Copiar link de indicação"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      )}

      <div className={cn('flex gap-2', compact ? '' : 'flex-col sm:flex-row')}>
        <button
          onClick={() => setMode('whatsapp')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all"
        >
          <MessageCircle size={14} />
          WhatsApp
        </button>
        <button
          onClick={() => setMode('email')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all"
        >
          <Mail size={14} />
          E-mail
        </button>
        {compact && (
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-500 text-slate-600 hover:bg-dark-400 rounded-xl text-sm font-medium transition-all border border-dark-400/50"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Link'}
          </button>
        )}
      </div>
    </div>
  )
}
