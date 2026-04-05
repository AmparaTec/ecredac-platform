'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cnpjMask } from '@/lib/utils'
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
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white"
        style={{ background: 'linear-gradient(135deg, #06070D, #0F1120 50%, #151829)' }}>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center font-black text-lg">E</div>
            <span className="text-2xl font-bold tracking-tight">E-CREDac</span>
          </div>
          <p className="text-slate-400 text-sm">Plataforma de Intermediação de Créditos de ICMS</p>
        </div>
        <div>
          <h1 className="text-5xl font-black leading-tight mb-4">
            O Maior amigo<br />do Caixa de<br />
            <span className="text-blue-300">sua empresa.</span>
          </h1>
          <p className="text-xl text-white/80 max-w-lg mb-8">
            Acesso a Créditos de ICMS - Da originação ao último centavo utilizado. Transparência total, zero burocracia, compliance nativo.
          </p>
          <div className="flex gap-8">
            <div><p className="text-3xl font-bold">R$ 8,2B</p><p className="text-sm text-white/60">em créditos</p></div>
            <div><p className="text-3xl font-bold">1.240+</p><p className="text-sm text-white/60">empresas</p></div>
            <div><p className="text-3xl font-bold">98%</p><p className="text-sm text-white/60">taxa de sucesso</p></div>
          </div>
        </div>
        <div className="flex gap-6 text-sm text-white/40">
          <span>LGPD Compliant</span><span>•</span><span>ICP-Brasil</span><span>•</span><span>SEFAZ-SP Integrado</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-dark-900">
        <div className="bg-dark-800 rounded-2xl shadow-2xl shadow-black/20 p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold text-white">Bem-vindo de volta</h2>
          <p className="text-slate-500 mt-1 mb-8">Acesse sua conta para gerenciar seus créditos</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar na plataforma'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Ainda não tem conta?{' '}
            <Link href="/register" className="text-brand-400 hover:text-brand-300 font-semibold">
              Cadastre-se grátis
            </Link>
          </p>

          <div className="mt-6 pt-6 border-t border-dark-500/40 flex items-center justify-center gap-4 text-xs text-slate-600">
            <span>🔒 LGPD</span>
            <span>🔑 256-bit SSL</span>
            <span>📄 ICP-Brasil</span>
          </div>
        </div>
      </div>
    </div>
  )
}
