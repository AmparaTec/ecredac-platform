'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cnpjMask, isValidCNPJ } from '@/lib/utils'
import Link from 'next/link'

export default function RegisterPage() {
  const [form, setForm] = useState({
    cnpj: '', email: '', password: '', razaoSocial: '', tipo: 'buyer' as const
  })
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [cnpjData, setCnpjData] = useState<any>(null)
  const router = useRouter()

  async function verifyCNPJ() {
    const digits = form.cnpj.replace(/\D/g, '')
    if (!isValidCNPJ(digits)) {
      setError('CNPJ invalido')
      return
    }
    setVerifying(true)
    setError('')
    try {
      const res = await fetch('/api/auth/cnpj-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: digits }),
      })
      const data = await res.json()
      if (data.valid) {
        setCnpjData(data)
        setForm(f => ({ ...f, razaoSocial: data.razao_social }))
      } else {
        setError(data.error || 'CNPJ nao encontrado ou inativo')
      }
    } catch {
      setError('Erro ao verificar CNPJ')
    }
    setVerifying(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 1. Call server-side register API (admin client — bypasses RLS & email confirmation)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          cnpj: form.cnpj,
          razaoSocial: form.razaoSocial,
          nomeFantasia: cnpjData?.nome_fantasia || form.razaoSocial.split(' ')[0],
          tipo: form.tipo,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta')
        setLoading(false)
        return
      }

      // 2. Sign in the user (now that account exists and is confirmed)
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })

      if (signInError) {
        setError('Conta criada! Mas houve erro no login automatico. Tente fazer login manualmente.')
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Erro de conexao. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">E</div>
          <span className="text-xl font-bold">E-CREDac</span>
        </div>

        <h2 className="text-2xl font-bold text-gray-900">Criar conta</h2>
        <p className="text-gray-500 mt-1 mb-6">Cadastre sua empresa em menos de 2 minutos</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
            <div className="flex gap-2">
              <input
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: cnpjMask(e.target.value) })}
                placeholder="00.000.000/0001-00"
                required
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
              <button
                type="button"
                onClick={verifyCNPJ}
                disabled={verifying}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200 disabled:opacity-50"
              >
                {verifying ? 'Verificando...' : 'Verificar'}
              </button>
            </div>
            {cnpjData && (
              <p className="mt-1 text-xs text-emerald-600 font-medium">
                ✓ {cnpjData.razao_social} — {cnpjData.situacao}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Razao Social</label>
            <input
              value={form.razaoSocial}
              onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })}
              placeholder="Nome da empresa"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email corporativo</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="fiscal@suaempresa.com.br"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de operacao</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as any })}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="seller">Cedente (tenho creditos para vender)</option>
              <option value="buyer">Cessionario (preciso de creditos)</option>
              <option value="both">Ambos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimo 8 caracteres"
                required
                minLength={8}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-12 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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

          <div className="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" required className="mt-1 rounded" />
            <span>Aceito os <a href="#" className="text-brand-600">Termos de Uso</a> e a <a href="#" className="text-brand-600">Politica de Privacidade</a> (LGPD)</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
          >
            {loading ? 'Criando conta...' : 'Criar conta gratuita'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Ja tem conta?{' '}
          <Link href="/login" className="text-brand-600 hover:text-brand-700 font-semibold">Fazer login</Link>
        </p>
      </div>
    </div>
  )
}
