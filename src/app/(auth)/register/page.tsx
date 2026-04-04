'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cnpjMask, isValidCNPJ } from '@/lib/utils'
import Link from 'next/link'

type UserRole = 'titular' | 'representante' | 'procurador'

const ROLE_CONFIG = {
  titular: {
    title: 'Empresa',
    subtitle: 'Sou proprietario ou socio da empresa',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  representante: {
    title: 'Representante',
    subtitle: 'Sou funcionario autorizado de uma empresa',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  procurador: {
    title: 'Assessor / Procurador',
    subtitle: 'Sou contador, advogado ou consultor tributario',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
} as const

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const referralCode = searchParams.get('ref') || ''

  const [step, setStep] = useState<'role' | 'form'>(referralCode ? 'form' : 'role')
  const [role, setRole] = useState<UserRole>(referralCode ? 'titular' : 'titular')

  const [form, setForm] = useState({
    fullName: '',
    cnpj: '',
    email: '',
    password: '',
    razaoSocial: '',
    tipo: 'buyer' as 'seller' | 'buyer' | 'both',
    // Procurador fields
    officeName: '',
    officeCnpj: '',
    officeCrc: '',
    officeOab: '',
    specialty: '',
    referralCode: referralCode,
  })

  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [cnpjData, setCnpjData] = useState<any>(null)
  const [cnpjError, setCnpjError] = useState('')
  const router = useRouter()
  const lastVerified = useRef('')

  const verifyCNPJ = useCallback(async (cnpjValue: string) => {
    const digits = cnpjValue.replace(/\D/g, '')
    if (digits.length !== 14) return
    if (!isValidCNPJ(digits)) {
      setCnpjError('CNPJ invalido')
      setCnpjData(null)
      return
    }
    if (lastVerified.current === digits) return
    lastVerified.current = digits
    setVerifying(true)
    setCnpjError('')
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
        setCnpjData(null)
        setCnpjError(data.error || 'CNPJ nao encontrado ou inativo')
      }
    } catch {
      setCnpjError('Erro ao verificar CNPJ')
    }
    setVerifying(false)
  }, [])

  function handleCnpjChange(value: string) {
    const masked = cnpjMask(value)
    setForm(f => ({ ...f, cnpj: masked }))
    setCnpjError('')
    if (masked.length === 18) {
      verifyCNPJ(masked)
    } else {
      setCnpjData(null)
      lastVerified.current = ''
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          role,
          // Company data (titular & representante)
          cnpj: role !== 'procurador' ? form.cnpj : form.officeCnpj,
          razaoSocial: role !== 'procurador' ? form.razaoSocial : form.officeName,
          nomeFantasia: role !== 'procurador'
            ? (cnpjData?.nome_fantasia || form.razaoSocial.split(' ')[0])
            : form.officeName,
          tipo: role !== 'procurador' ? form.tipo : 'both',
          // Procurador data
          officeName: form.officeName,
          officeCnpj: form.officeCnpj,
          officeCrc: form.officeCrc,
          officeOab: form.officeOab,
          specialty: form.specialty,
          // Referral
          referralCode: form.referralCode,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta')
        setLoading(false)
        return
      }

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

  // ─── Step 1: Role Selection ───
  if (step === 'role') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">E</div>
            <span className="text-xl font-bold">E-CREDac</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Como voce quer usar a plataforma?</h2>
          <p className="text-gray-500 mt-1 mb-6">Escolha o perfil que melhor descreve sua atuacao</p>

          <div className="space-y-3">
            {(Object.keys(ROLE_CONFIG) as UserRole[]).map((r) => {
              const config = ROLE_CONFIG[r]
              const selected = role === r
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    selected
                      ? 'border-brand-500 bg-brand-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    selected ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${selected ? 'text-brand-700' : 'text-gray-900'}`}>
                      {config.title}
                    </p>
                    <p className="text-sm text-gray-500">{config.subtitle}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selected ? 'border-brand-500' : 'border-gray-300'
                  }`}>
                    {selected && <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
                  </div>
                </button>
              )
            })}
          </div>

          {role === 'procurador' && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <p className="font-semibold">Programa de Assessores E-CREDac</p>
              <p className="mt-1">Cadastre seus clientes, intermedie operacoes de credito e ganhe comissoes sobre cada transacao. Modelo similar aos assessores de investimentos.</p>
            </div>
          )}

          <button
            onClick={() => setStep('form')}
            className="w-full mt-6 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-brand-500/25 transition-all"
          >
            Continuar
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            Ja tem conta?{' '}
            <Link href="/login" className="text-brand-600 hover:text-brand-700 font-semibold">Fazer login</Link>
          </p>
        </div>
      </div>
    )
  }

  // ─── Step 2: Registration Form ───
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">E</div>
          <span className="text-xl font-bold">E-CREDac</span>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setStep('role')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            role === 'procurador'
              ? 'bg-amber-100 text-amber-700'
              : role === 'representante'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}>
            {ROLE_CONFIG[role].title}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900">
          {role === 'procurador' ? 'Cadastro de Assessor' : 'Criar conta'}
        </h2>
        <p className="text-gray-500 mt-1 mb-6">
          {role === 'procurador'
            ? 'Cadastre seu escritorio e comece a intermediar creditos'
            : 'Cadastre sua empresa em menos de 2 minutos'}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Nome completo — todos os perfis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Seu nome completo"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* ─── Empresa fields (titular & representante) ─── */}
          {role !== 'procurador' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ da empresa</label>
                <div className="relative">
                  <input
                    value={form.cnpj}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    required
                    maxLength={18}
                    className={`w-full rounded-xl border px-4 py-2.5 pr-10 text-sm focus:ring-2 transition-colors ${
                      cnpjData
                        ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20'
                        : cnpjError
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-gray-200 focus:border-brand-500 focus:ring-brand-500/20'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {verifying && (
                      <svg className="animate-spin h-5 w-5 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    {cnpjData && !verifying && (
                      <svg className="h-5 w-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                    {cnpjError && !verifying && (
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                    )}
                  </div>
                </div>
                {cnpjData && (
                  <p className="mt-1 text-xs text-emerald-600 font-medium">
                    {cnpjData.razao_social} — {cnpjData.situacao}
                  </p>
                )}
                {cnpjError && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{cnpjError}</p>
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
            </>
          )}

          {/* ─── Procurador fields ─── */}
          {role === 'procurador' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do escritorio</label>
                <input
                  value={form.officeName}
                  onChange={(e) => setForm({ ...form, officeName: e.target.value })}
                  placeholder="Ex: Silva & Associados Contabilidade"
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ do escritorio <span className="text-gray-400 font-normal">(opcional)</span></label>
                <input
                  value={form.officeCnpj}
                  onChange={(e) => setForm({ ...form, officeCnpj: cnpjMask(e.target.value) })}
                  placeholder="00.000.000/0001-00"
                  maxLength={18}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade</label>
                <select
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Selecione...</option>
                  <option value="contabilidade">Contabilidade</option>
                  <option value="advocacia_tributaria">Advocacia Tributaria</option>
                  <option value="consultoria_fiscal">Consultoria Fiscal</option>
                  <option value="assessoria_empresarial">Assessoria Empresarial</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CRC <span className="text-gray-400 font-normal">(se contador)</span></label>
                  <input
                    value={form.officeCrc}
                    onChange={(e) => setForm({ ...form, officeCrc: e.target.value })}
                    placeholder="CRC-XX 000000"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OAB <span className="text-gray-400 font-normal">(se advogado)</span></label>
                  <input
                    value={form.officeOab}
                    onChange={(e) => setForm({ ...form, officeOab: e.target.value })}
                    placeholder="OAB-XX 000000"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>
            </>
          )}

          {/* ─── Common fields ─── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={role === 'procurador' ? 'contato@escritorio.com.br' : 'fiscal@suaempresa.com.br'}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
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

          {/* Referral code (visible when arriving via link or for titular/representante) */}
          {role !== 'procurador' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Codigo do assessor <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                value={form.referralCode}
                onChange={(e) => setForm({ ...form, referralCode: e.target.value.toUpperCase() })}
                placeholder="Ex: ABC12345"
                maxLength={20}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
              {form.referralCode && (
                <p className="mt-1 text-xs text-brand-600">Voce sera vinculado ao assessor que indicou este codigo</p>
              )}
            </div>
          )}

          <div className="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" required className="mt-1 rounded" />
            <span>Aceito os <a href="#" className="text-brand-600">Termos de Uso</a> e a <a href="#" className="text-brand-600">Politica de Privacidade</a> (LGPD)</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
          >
            {loading ? 'Criando conta...' : role === 'procurador' ? 'Cadastrar como assessor' : 'Criar conta gratuita'}
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
