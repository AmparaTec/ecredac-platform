'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// Translate common Supabase Auth error messages to PT-BR
function translateAuthError(message: string): string {
  const translations: Record<string, string> = {
    'Password should contain at least one character of each': 'A senha deve conter pelo menos: uma letra minúscula, uma letra maiúscula e um número.',
    'Password is known to be weak and easy to guess': 'Está senha é muito comum e fácil de adivinhar. Escolha uma senha mais forte.',
    'New password should be different from the old password': 'A nova senha deve ser diferente da senha atual.',
    'Auth session missing': 'Sessão expirada. Solicite um novo link de redefinição.',
    'Invalid login credentials': 'Credenciais inválidas.',
    'User not found': 'Usuário não encontrado.',
    'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
    'Password should be at least 8 characters': 'A senha deve ter pelo menos 8 caracteres.',
  }

  for (const [en, pt] of Object.entries(translations)) {
    if (message.includes(en)) return pt
  }

  // Generic fallback for unknown messages
  if (message.includes('Password should contain')) {
    return 'A senha deve conter letras maiúsculas, minúsculas e números.'
  }

  return message
}

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  // After PKCE flow: /auth/callback exchanges the code and redirects here
  // with an active session. We also handle ?code= as a fallback in case
  // the user lands here directly with a code param.
  useEffect(() => {
    const supabase = createClient()
    const code = searchParams.get('code')

    if (code) {
      // Fallback: exchange code directly if user bypassed /auth/callback
      supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
        if (err) {
          setError('Link inválido ou expirado. Solicite um novo link de redefinição.')
        }
      })
    }

    // Also listen for PASSWORD_RECOVERY event (legacy hash-based flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Session is ready, user can set a new password
      }
    })
    return () => subscription.unsubscribe()
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    setLoading(true)
    setError('')

    // Use server-side admin API to bypass "require current password" restriction
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      setError(data.error || 'Erro ao redefinir senha. Tente novamente.')
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)

    // Redirect to dashboard after 2.5 seconds
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 2500)
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Senha redefinida!</h2>
        <p className="text-slate-400 mb-6">Sua senha foi atualizada com sucesso.</p>
        <p className="text-slate-500 text-sm">Redirecionando para o dashboard...</p>
        <div className="mt-4 flex justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-white">Redefinir senha</h2>
      <p className="text-slate-500 mt-1 mb-8">
        Escolha uma nova senha segura para sua conta.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nova senha */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Nova senha</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              className="w-full rounded-xl border border-dark-500/50 px-4 py-2.5 pr-12 text-sm bg-dark-700 text-white placeholder:text-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {/* Password strength indicator */}
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => {
                  const strength = password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)
                    ? 4
                    : password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)
                    ? 3
                    : password.length >= 8
                    ? 2
                    : 1
                  return (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        level <= strength
                          ? strength === 1 ? 'bg-red-500' : strength === 2 ? 'bg-amber-500' : strength === 3 ? 'bg-blue-500' : 'bg-emerald-500'
                          : 'bg-dark-600'
                      }`}
                    />
                  )
                })}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {password.length < 8 ? 'Muito curta' : password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 'Muito forte' : password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'Forte' : 'Razoável'}
              </p>
            </div>
          )}
        </div>

        {/* Confirmar senha */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Confirmar nova senha</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              id="confirm-password"
              name="confirm-password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repita a nova senha"
              required
              className={`w-full rounded-xl border px-4 py-2.5 pr-12 text-sm bg-dark-700 text-white placeholder:text-slate-500 focus:ring-2 transition-all ${
                confirm.length > 0
                  ? password === confirm
                    ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20'
                    : 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-dark-500/50 focus:border-brand-500 focus:ring-brand-500/20'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
            {confirm.length > 0 && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                {password === confirm ? (
                  <svg className="h-4 w-4 text-emerald-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || password !== confirm || password.length < 8}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Redefinir senha'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        <Link href="/login" className="text-brand-400 hover:text-brand-300 font-semibold">
          Voltar ao login
        </Link>
      </p>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-6">
      <div className="bg-dark-800 rounded-2xl shadow-2xl shadow-black/20 p-8 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">E</div>
          <span className="text-xl font-bold text-white">E-CREDac</span>
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
