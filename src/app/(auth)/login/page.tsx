'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-dark-900">

      {/* ── PAINEL ESQUERDO (desktop) / TOPO (mobile) ── */}
      <div
        className="flex flex-col justify-between p-8 lg:p-12 lg:w-1/2 text-white"
        style={{ background: 'linear-gradient(160deg, #06070D 0%, #0F1120 55%, #151829 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center font-black text-lg shadow-lg shadow-brand-600/30">
            E
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight">E-CREDac</span>
            <span className="hidden lg:block text-xs text-slate-500 mt-0.5">by Rede Ampara Tec</span>
          </div>
        </div>

        {/* Hero — compacto no mobile, expandido no desktop */}
        <div className="mt-8 lg:mt-0">
          <h1 className="text-3xl lg:text-5xl font-black leading-tight mb-3">
            O Maior Motor<br />
            de Créditos de<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-400">ICMS do Brasil.</span>
          </h1>
          <p className="text-sm lg:text-lg text-white/70 max-w-lg mb-6 lg:mb-10 leading-relaxed">
            Conectamos cedentes e cessionários com compliance SEFAZ-SP nativo —
            da originação ao último centavo utilizado.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 lg:gap-6 mb-6 lg:mb-10">
            {[
              { value: 'R$ 8,2B', label: 'em créditos' },
              { value: '1.240+', label: 'empresas' },
              { value: '98%', label: 'taxa de sucesso' },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3 lg:p-4 border border-white/10">
                <p className="text-xl lg:text-3xl font-bold text-brand-300">{s.value}</p>
                <p className="text-[10px] lg:text-sm text-white/50 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Diferenciais — só aparece no mobile, desktop já tem espaço */}
          <div className="grid grid-cols-2 gap-2 lg:hidden">
            {[
              { icon: '🛡️', text: 'LGPD Compliant' },
              { icon: '🔑', text: 'ICP-Brasil' },
              { icon: '⚡', text: 'Matching por IA' },
              { icon: '🏛️', text: 'SEFAZ-SP Integrado' },
            ].map((d) => (
              <div key={d.text} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 text-xs text-white/60">
                <span>{d.icon}</span> {d.text}
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé desktop */}
        <div className="hidden lg:flex gap-6 text-sm text-white/30">
          <span>🛡️ LGPD Compliant</span>
          <span>•</span>
          <span>🔑 ICP-Brasil</span>
          <span>•</span>
          <span>⚡ Matching por IA</span>
          <span>•</span>
          <span>🏛️ SEFAZ-SP</span>
        </div>
      </div>

      {/* ── PAINEL DIREITO (desktop) / FUNDO (mobile) ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-8 bg-dark-900">
        <div className="w-full max-w-md">
          {/* Card no desktop, sem card no mobile */}
          <div className="bg-dark-800 lg:bg-dark-800 rounded-2xl lg:shadow-2xl lg:shadow-black/20 p-6 lg:p-8 w-full">

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Bem-vindo de volta</h2>
              <p className="text-slate-500 text-sm mt-1">Acesse sua conta para gerenciar seus créditos</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
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
                  className="w-full rounded-xl border border-dark-500/50 px-4 py-3 text-sm bg-dark-700 text-white placeholder:text-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-300">Senha</label>
                  <Link href="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    required
                    className="w-full rounded-xl border border-dark-500/50 px-4 py-3 pr-12 text-sm bg-dark-700 text-white placeholder:text-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50 text-sm"
              >
                {loading ? 'Entrando...' : 'Entrar na plataforma'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-5">
              Ainda não tem conta?{' '}
              <Link href="/register" className="text-brand-400 hover:text-brand-300 font-semibold">
                Cadastre-se grátis
              </Link>
            </p>

            <div className="mt-5 pt-5 border-t border-dark-500/40 flex items-center justify-center gap-5 text-xs text-slate-600">
              <span>🔒 LGPD</span>
              <span>🔑 256-bit SSL</span>
              <span>📄 ICP-Brasil</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
