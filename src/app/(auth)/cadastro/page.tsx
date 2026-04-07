'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

type Perfil = 'cedente' | 'comprador' | 'assessor' | null
type Step = 1 | 2 | 3

interface CompanyData {
  razao_social: string
  cnae_descricao: string
  municipio: string
  uf: string
  porte: string
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const formatCnpj = (v: string) => {
  const n = v.replace(/\D/g, '').slice(0, 14)
  return n
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

const PERFIS = [
  {
    value: 'cedente' as Perfil,
    icon: '🏭',
    titulo: 'Tenho crédito para vender',
    sub: 'Empresa com crédito PIS/COFINS acumulado',
    cor: 'border-[#c9a227] bg-[#c9a227]/8',
    corIcon: 'bg-[#c9a227]/15 text-[#c9a227]',
  },
  {
    value: 'comprador' as Perfil,
    icon: '💼',
    titulo: 'Quero comprar crédito',
    sub: 'Empresa buscando crédito com desconto',
    cor: 'border-emerald-500/60 bg-emerald-500/8',
    corIcon: 'bg-emerald-500/15 text-emerald-400',
  },
  {
    value: 'assessor' as Perfil,
    icon: '🧾',
    titulo: 'Sou contador / assessor',
    sub: 'Represento empresas e recebo comissão (3%)',
    cor: 'border-blue-400/60 bg-blue-400/8',
    corIcon: 'bg-blue-400/15 text-blue-400',
  },
]

function CadastroContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [perfil, setPerfil] = useState<Perfil>(
    (searchParams.get('perfil') as Perfil) ?? null
  )

  // Step 2 — dados
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [erroStep2, setErroStep2] = useState('')

  // Step 3 — KYC mínimo
  const [cnpj, setCnpj] = useState('')
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loadingCnpj, setLoadingCnpj] = useState(false)
  const [aceite, setAceite] = useState(false)
  const [erroStep3, setErroStep3] = useState('')
  const [loading, setLoading] = useState(false)

  // Pular step 1 se perfil já vem na URL
  useEffect(() => {
    const p = searchParams.get('perfil') as Perfil
    if (p && ['cedente', 'comprador', 'assessor'].includes(p)) {
      setPerfil(p)
      setStep(2)
    }
  }, [searchParams])

  const lookupCnpj = async (raw: string) => {
    const nums = raw.replace(/\D/g, '')
    if (nums.length !== 14) return
    setLoadingCnpj(true)
    setCompany(null)
    try {
      const res = await fetch(`/api/cnpj/${nums}`)
      if (res.ok) {
        const data = await res.json()
        if (data.status !== 'ERROR') setCompany(data)
      }
    } catch {}
    setLoadingCnpj(false)
  }

  const validarStep2 = () => {
    if (!nome.trim()) return 'Informe seu nome completo.'
    if (!email.includes('@')) return 'Email inválido.'
    if (senha.length < 8) return 'Senha deve ter ao menos 8 caracteres.'
    if (senha !== confirmar) return 'As senhas não coincidem.'
    return ''
  }

  const avancarStep2 = () => {
    const err = validarStep2()
    if (err) { setErroStep2(err); return }
    setErroStep2('')
    setStep(3)
  }

  const finalizar = async () => {
    if (!aceite) { setErroStep3('Aceite os Termos de Uso para continuar.'); return }
    if (cnpj.replace(/\D/g, '').length !== 14) { setErroStep3('CNPJ inválido.'); return }
    setLoading(true)
    setErroStep3('')
    try {
      // 1. Criar conta no Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            full_name: nome,
            perfil,
            cnpj: cnpj.replace(/\D/g, ''),
            razao_social: company?.razao_social ?? '',
          },
        },
      })
      if (authErr) throw authErr

      // 2. Redirecionar para dashboard
      if (authData.user) {
        const destino =
          perfil === 'comprador' ? '/marketplace' :
          perfil === 'assessor'  ? '/assessor' :
          '/dashboard'
        router.push(destino)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar conta.'
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setErroStep3('Este email já está cadastrado. Faça login.')
      } else {
        setErroStep3(msg)
      }
    }
    setLoading(false)
  }

  const stepLabels = ['Perfil', 'Dados', 'KYC']
  const perfilAtual = PERFIS.find(p => p.value === perfil)

  return (
    <div className="min-h-screen bg-[#0a1f12] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10 max-w-5xl mx-auto">
        <a href="/" className="text-[#c9a227] font-bold text-xl tracking-tight">Relius</a>
        <span className="text-white/50 text-sm">
          Já tem conta?{' '}
          <a href="/login" className="text-[#c9a227] hover:underline font-medium">Entrar</a>
        </span>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Criar conta grátis</h1>
          <p className="text-white/60 text-sm">
            Plataforma gratuita no lançamento. Sem cartão de crédito.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center mb-8">
          {stepLabels.map((label, i) => {
            const n = (i + 1) as Step
            const done = step > n
            const active = step === n
            return (
              <div key={n} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    done ? 'bg-[#c9a227] border-[#c9a227] text-[#0a1f12]' :
                    active ? 'border-[#c9a227] text-[#c9a227] bg-[#c9a227]/10' :
                    'border-white/20 text-white/30'
                  }`}>
                    {done ? '✓' : n}
                  </div>
                  <span className={`text-xs hidden sm:block ${active ? 'text-[#c9a227]' : done ? 'text-white/60' : 'text-white/25'}`}>
                    {label}
                  </span>
                </div>
                {i < 2 && (
                  <div className={`flex-1 h-0.5 mx-2 mt-[-10px] sm:mt-[-20px] transition-all ${step > n ? 'bg-[#c9a227]' : 'bg-white/10'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* ─── STEP 1: PERFIL ─── */}
        {step === 1 && (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-7">
            <h2 className="text-lg font-semibold mb-1">Qual é o seu perfil?</h2>
            <p className="text-white/60 text-sm mb-6">Isso personaliza toda a sua experiência na plataforma.</p>

            <div className="space-y-3 mb-6">
              {PERFIS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPerfil(p.value)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    perfil === p.value ? p.cor : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                    perfil === p.value ? p.corIcon : 'bg-white/5'
                  }`}>
                    {p.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{p.titulo}</div>
                    <div className="text-white/55 text-xs mt-0.5">{p.sub}</div>
                  </div>
                  {perfil === p.value && (
                    <div className="ml-auto text-[#c9a227] text-lg flex-shrink-0">✓</div>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => perfil && setStep(2)}
              disabled={!perfil}
              className="w-full bg-[#c9a227] text-[#0a1f12] font-bold py-4 rounded-xl hover:bg-[#e0b730] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Continuar →
            </button>
          </div>
        )}

        {/* ─── STEP 2: DADOS ─── */}
        {step === 2 && (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-7">
            {perfilAtual && (
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/8">
                <span className="text-lg">{perfilAtual.icon}</span>
                <span className="text-white/60 text-sm">{perfilAtual.titulo}</span>
                <button onClick={() => setStep(1)} className="ml-auto text-white/35 text-xs hover:text-white/60 transition-colors">
                  Alterar
                </button>
              </div>
            )}

            <h2 className="text-lg font-semibold mb-5">Seus dados de acesso</h2>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-white/75 mb-1.5">Nome completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="João Silva"
                  autoFocus
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-[#c9a227] transition-colors placeholder-white/25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/75 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="joao@empresa.com.br"
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-[#c9a227] transition-colors placeholder-white/25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/75 mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    type={showSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-[#c9a227] transition-colors placeholder-white/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors text-sm"
                  >
                    {showSenha ? '🙈' : '👁'}
                  </button>
                </div>
                {senha.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {[4, 6, 8, 10].map(n => (
                      <div key={n} className={`flex-1 h-1 rounded-full transition-all ${
                        senha.length >= n
                          ? senha.length >= 10 ? 'bg-emerald-400' : senha.length >= 8 ? 'bg-[#c9a227]' : 'bg-orange-400'
                          : 'bg-white/10'
                      }`} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/75 mb-1.5">Confirmar senha</label>
                <input
                  type="password"
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  placeholder="Repita a senha"
                  className={`w-full bg-white/5 border rounded-xl px-4 py-3 focus:outline-none transition-colors placeholder-white/25 ${
                    confirmar && confirmar !== senha
                      ? 'border-red-400/50 focus:border-red-400'
                      : confirmar && confirmar === senha
                      ? 'border-emerald-400/50 focus:border-emerald-400'
                      : 'border-white/20 focus:border-[#c9a227]'
                  }`}
                />
              </div>
            </div>

            {erroStep2 && (
              <p className="text-red-400 text-sm mb-4 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {erroStep2}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-white/15 text-white/60 font-semibold py-3 rounded-xl hover:border-white/30 transition-colors text-sm"
              >
                ← Voltar
              </button>
              <button
                onClick={avancarStep2}
                className="flex-[2] bg-[#c9a227] text-[#0a1f12] font-bold py-3 rounded-xl hover:bg-[#e0b730] transition-all"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: KYC MÍNIMO ─── */}
        {step === 3 && (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-7">
            <h2 className="text-lg font-semibold mb-1">Dados da empresa</h2>
            <p className="text-white/60 text-sm mb-6">
              KYC mínimo obrigatório por regulação. Leva 30 segundos.
            </p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-white/75 mb-1.5">CNPJ da empresa</label>
              <div className="relative">
                <input
                  type="text"
                  value={cnpj}
                  onChange={e => {
                    const fmt = formatCnpj(e.target.value)
                    setCnpj(fmt)
                    if (fmt.replace(/\D/g, '').length === 14) lookupCnpj(fmt)
                  }}
                  placeholder="00.000.000/0001-00"
                  autoFocus
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 font-mono focus:outline-none focus:border-[#c9a227] transition-colors placeholder-white/25"
                />
                {loadingCnpj && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {company && (
              <div className="bg-[#c9a227]/8 border border-[#c9a227]/25 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#c9a227]/20 rounded-lg flex items-center justify-center text-[#c9a227] font-bold text-sm flex-shrink-0">
                    {company.razao_social.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[#c9a227] text-sm truncate">{company.razao_social}</div>
                    <div className="text-white/55 text-xs truncate">{company.cnae_descricao}</div>
                    <div className="text-white/45 text-xs">{company.municipio}/{company.uf}</div>
                  </div>
                  <span className="ml-auto text-emerald-400 text-sm flex-shrink-0">✓</span>
                </div>
              </div>
            )}

            {/* Aceite */}
            <label className="flex items-start gap-3 cursor-pointer mb-6 group">
              <div
                onClick={() => setAceite(!aceite)}
                className={`w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center border-2 transition-all ${
                  aceite ? 'bg-[#c9a227] border-[#c9a227]' : 'border-white/30 group-hover:border-white/50'
                }`}
              >
                {aceite && <span className="text-[#0a1f12] text-xs font-bold">✓</span>}
              </div>
              <span className="text-white/65 text-sm leading-relaxed">
                Li e aceito os{' '}
                <a href="/compliance/termos" target="_blank" className="text-[#c9a227] hover:underline">Termos de Uso</a>
                {' '}e a{' '}
                <a href="/compliance/privacidade" target="_blank" className="text-[#c9a227] hover:underline">Política de Privacidade</a>.
                Entendo que a Relius não acessa meus sistemas fiscais.
              </span>
            </label>

            {erroStep3 && (
              <p className="text-red-400 text-sm mb-4 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {erroStep3}
                {erroStep3.includes('login') && (
                  <a href="/login" className="ml-2 underline font-semibold">Ir para login →</a>
                )}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 border border-white/15 text-white/60 font-semibold py-3 rounded-xl hover:border-white/30 transition-colors text-sm"
              >
                ← Voltar
              </button>
              <button
                onClick={finalizar}
                disabled={loading || !aceite}
                className="flex-[2] bg-[#c9a227] text-[#0a1f12] font-bold py-3 rounded-xl hover:bg-[#e0b730] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#0a1f12] border-t-transparent rounded-full animate-spin" />
                    Criando conta...
                  </span>
                ) : 'Criar minha conta grátis →'}
              </button>
            </div>

            <p className="text-center text-white/35 text-xs mt-4">
              Plataforma gratuita no lançamento. Sem cartão de crédito.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CadastroPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a1f12] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CadastroContent />
    </Suspense>
  )
}
