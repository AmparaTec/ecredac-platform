'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-6">
      <div className="bg-dark-800 rounded-2xl shadow-2xl shadow-black/20 p-8 w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">E</div>
          <span className="text-xl font-bold text-white">E-CREDac</span>
        </div>

        {sent ? (
          /* ── Success state ── */
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Email enviado!</h2>
            <p className="text-slate-400 mb-2">
              Enviamos um link de redefinição para
            </p>
            <p className="text-brand-400 font-semibold mb-6">{email}</p>
            <p className="text-slate-500 text-sm mb-8">
              Verifique sua caixa de entrada e spam. O link expira em 1 hora.
            </p>
            <Link
              href="/login"
              className="inline-block w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl text-center transition-all"
            >
              Voltar ao login
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <h2 className="text-2xl font-bold text-white">Esqueceu a senha?</h2>
            <p className="text-slate-500 mt-1 mb-8">
              Digite seu email e enviaremos um link para redefinir sua senha.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="fiscal@suaempresa.com.br"
                  required
                  className="w-full rounded-xl border border-dark-500/50 px-4 py-2.5 text-sm bg-dark-700 text-white placeholder:text-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Lembrou a senha?{' '}
              <Link href="/login" className="text-brand-400 hover:text-brand-300 font-semibold">
                Voltar ao login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
