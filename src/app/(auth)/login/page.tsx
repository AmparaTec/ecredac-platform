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
        style={{ background: 'linear-gradient(135deg, #132857, #1359e1 50%, #338dff)' }}>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">E</div>
            <span className="text-2xl font-bold tracking-tight">E-CREDac</span>
          </div>
          <p className="text-white/60 text-sm">Plataforma de Intermediacao de Creditos de ICMS</p>
        </div>
        <div>
          <h1 className="text-5xl font-black leading-tight mb-4">
            O maior broker<br />de creditos de<br />
            <span className="text-blue-300">ICMS do Brasil.</span>
          </h1>
          <p className="text-xl text-white/80 max-w-lg mb-8">
            Da originacao ao ultimo centavo utilizado. Transparencia total, zero burocracia, compliance nativo.
          </p>
          <div className="flex gap-8">
            <div><p className="text-3xl font-bold">R$ 8,2B</p><p className="text-sm text-white/60">em creditos</p></div>
            <div><p className="text-3xl font-bold">1.240+</p><p className="text-sm text-white/60">empresas</p></div>
            <div><p className="text-3xl font-bold">98%</p><p className="text-sm text-white/60">taxa de sucesso</p></div>
          </div>
        </div>
        <div className="flex gap-6 text-sm text-white/40">
          <span>LGPD Compliant</span><span>•</span><span>ICP-Brasil</span><span>•</span><span>SEFAZ-SP Integrado</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gray-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h2>
          <p className="text-gray-500 mt-1 mb-8">Acesse sua conta para gerenciar seus creditos</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="fiscal@suaempresa.com.br"
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar na plataforma'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Ainda nao tem conta?{' '}
            <Link href="/register" className="text-brand-600 hover:text-brand-700 font-semibold">
              Cadastre-se gratis
            </Link>
          </p>

          <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-center gap-4 text-xs text-gray-400">
            <span>🔒 LGPD</span>
            <span>🔑 256-bit SSL</span>
            <span>📄 ICP-Brasil</span>
          </div>
        </div>
      </div>
    </div>
  )
}
