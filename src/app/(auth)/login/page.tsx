'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

/* ─── Ícones inline (evita import extra) ─────────────────────────── */
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
)
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)
const ArrowDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
  </svg>
)
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

/* ─── Dados ──────────────────────────────────────────────────────── */
const stats = [
  { value: 'R$ 8,2B', label: 'em créditos gerenciados' },
  { value: '1.240+', label: 'empresas cadastradas' },
  { value: '98%', label: 'taxa de sucesso nas operações' },
]

const audiences = [
  {
    emoji: '🏭',
    title: 'Cedente',
    subtitle: 'Tem crédito acumulado',
    desc: 'Sua empresa acumulou saldo de ICMS? Monetize agora — com segurança jurídica e liquidez imediata.',
    cta: 'Quero ceder crédito',
  },
  {
    emoji: '🛒',
    title: 'Cessionário',
    subtitle: 'Quer comprar crédito',
    desc: 'Adquira créditos de ICMS com deságio e reduza sua carga tributária de forma legal e rastreável.',
    cta: 'Quero adquirir crédito',
  },
  {
    emoji: '🤝',
    title: 'Assessor',
    subtitle: 'Intermediador certificado',
    desc: 'Conecte seus clientes ao maior motor de matching de ICMS do Brasil e ganhe comissões por operação.',
    cta: 'Quero ser assessor',
  },
]

const howItWorks = [
  { step: '01', title: 'Cadastro e KYC', desc: 'Onboarding digital com verificação ICP-Brasil e due diligence completa via SEFAZ-SP.' },
  { step: '02', title: 'Matching por IA', desc: 'Nosso motor identifica os melhores pares cedente-cessionário por perfil, volume e timing.' },
  { step: '03', title: 'Operação e liquidação', desc: 'Contrato digital, transferência monitorada e relatório de utilização até o último centavo.' },
]

const differentials = [
  { icon: '🛡️', title: 'LGPD Compliant', desc: 'Dados protegidos com criptografia 256-bit e políticas auditadas.' },
  { icon: '🔑', title: 'ICP-Brasil', desc: 'Assinatura eletrônica com validade jurídica plena.' },
  { icon: '🏛️', title: 'SEFAZ-SP Nativo', desc: 'Integração direta com a Secretaria da Fazenda de São Paulo.' },
  { icon: '⚡', title: 'Matching por IA', desc: 'Algoritmo proprietário com 98% de efetividade nas operações.' },
  { icon: '📋', title: 'Auditoria Total', desc: 'Rastreabilidade completa da origem à destinação do crédito.' },
  { icon: '💼', title: 'Suporte Jurídico', desc: 'Equipe especializada em direito tributário e ICMS.' },
]

/* ─── Componente principal ────────────────────────────────────────── */
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const formRef = useRef<HTMLDivElement>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError('Email ou senha incorretos. Tente novamente.'); return }
      router.push('/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /* ── Formulário de login (reutilizado em mobile e desktop) ─────── */
  const LoginForm = () => (
    <div className="w-full">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white">Acessar plataforma</h2>
        <p className="text-slate-500 text-sm mt-0.5">Entre com seu e-mail e senha</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">E-mail</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="fiscal@suaempresa.com.br"
            required
            className="w-full rounded-xl border border-dark-500/60 px-4 py-3.5 text-sm bg-dark-700 text-white placeholder:text-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all outline-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-300">Senha</label>
            <Link href="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-dark-500/60 px-4 py-3.5 pr-12 text-sm bg-dark-700 text-white placeholder:text-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
              tabIndex={-1}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-500 active:scale-[0.98] text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50 text-sm mt-1"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" />
              Entrando...
            </span>
          ) : 'Entrar na plataforma'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-4">
        Ainda não tem conta?{' '}
        <Link href="/register" className="text-brand-400 hover:text-brand-300 font-semibold">
          Cadastre-se grátis
        </Link>
      </p>

      <div className="mt-4 pt-4 border-t border-dark-500/30 flex items-center justify-center gap-4 text-xs text-slate-600">
        <span>🔒 256-bit SSL</span>
        <span>•</span>
        <span>🔑 ICP-Brasil</span>
        <span>•</span>
        <span>🛡️ LGPD</span>
      </div>
    </div>
  )

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          DESKTOP — split layout (esquerda: empresa | direita: form)
      ═══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex min-h-screen bg-dark-900">

        {/* Painel esquerdo — empresa */}
        <div
          className="w-1/2 flex flex-col justify-between p-14 text-white overflow-y-auto"
          style={{ background: 'linear-gradient(160deg, #06070D 0%, #0F1120 55%, #151829 100%)' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center font-black text-xl shadow-lg shadow-brand-600/30">E</div>
            <div>
              <span className="text-2xl font-bold tracking-tight">E-CREDac</span>
              <span className="block text-xs text-slate-500 mt-0.5">by Rede Ampara Tec</span>
            </div>
          </div>

          {/* Hero */}
          <div className="my-12">
            <h1 className="text-5xl font-black leading-tight mb-4">
              O Maior Motor<br />de Créditos de<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-400">ICMS do Brasil.</span>
            </h1>
            <p className="text-lg text-white/65 max-w-md leading-relaxed mb-10">
              Conectamos cedentes e cessionários com compliance SEFAZ-SP nativo — da originação ao último centavo utilizado.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-10">
              {stats.map((s) => (
                <div key={s.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-3xl font-bold text-brand-300">{s.value}</p>
                  <p className="text-xs text-white/50 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Como funciona */}
            <div className="space-y-4">
              {howItWorks.map((h) => (
                <div key={h.step} className="flex gap-4">
                  <span className="text-brand-500 font-black text-lg w-8 flex-shrink-0">{h.step}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{h.title}</p>
                    <p className="text-xs text-white/50 mt-0.5">{h.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rodapé */}
          <div className="flex flex-wrap gap-4 text-xs text-white/30">
            {differentials.slice(0, 4).map(d => (
              <span key={d.title}>{d.icon} {d.title}</span>
            ))}
          </div>
        </div>

        {/* Painel direito — formulário */}
        <div className="w-1/2 flex items-center justify-center p-10 bg-dark-900">
          <div className="w-full max-w-sm bg-dark-800 rounded-2xl p-8 shadow-2xl shadow-black/30 border border-dark-600/30">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MOBILE — página completa scrollável com landing + login
      ═══════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen bg-dark-900 text-white">

        {/* ── Cabeçalho fixo mobile ───────────────────────────── */}
        <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-3.5 bg-dark-900/95 backdrop-blur-sm border-b border-dark-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center font-black text-sm shadow-md">E</div>
            <span className="text-base font-bold tracking-tight">E-CREDac</span>
          </div>
          <button
            onClick={scrollToForm}
            className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 rounded-lg text-xs font-bold transition-colors"
          >
            Entrar
          </button>
        </header>

        {/* ── Hero mobile ─────────────────────────────────────── */}
        <section
          className="px-5 pt-10 pb-8 text-center"
          style={{ background: 'linear-gradient(180deg, #06070D 0%, #0F1120 60%, #0d0f1e 100%)' }}
        >
          <div className="inline-flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/25 rounded-full px-3 py-1 text-[11px] text-brand-300 font-medium mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            Plataforma ativa · 1.240+ empresas
          </div>

          <h1 className="text-4xl font-black leading-tight mb-3">
            O Maior Motor<br />de Créditos de<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-400">ICMS do Brasil.</span>
          </h1>

          <p className="text-sm text-white/60 leading-relaxed mb-7 max-w-xs mx-auto">
            Conectamos cedentes e cessionários de crédito de ICMS com compliance SEFAZ-SP nativo e inteligência artificial.
          </p>

          {/* CTA mobile */}
          <div className="flex flex-col gap-2.5 max-w-xs mx-auto mb-8">
            <button
              onClick={scrollToForm}
              className="w-full bg-brand-600 hover:bg-brand-500 active:scale-[0.98] text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-500/20 transition-all text-sm"
            >
              Acessar minha conta
            </button>
            <Link
              href="/register"
              className="w-full bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold py-3.5 rounded-xl transition-all text-sm text-center"
            >
              Cadastrar minha empresa
            </Link>
          </div>

          {/* Scroll hint */}
          <button
            onClick={() => document.getElementById('sobre')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex flex-col items-center gap-1.5 text-white/30 hover:text-white/50 transition-colors mx-auto"
          >
            <span className="text-[10px] uppercase tracking-wider">Saiba mais</span>
            <ArrowDown />
          </button>
        </section>

        {/* ── Stats ───────────────────────────────────────────── */}
        <section className="px-5 py-6" style={{ background: '#0d0f1e' }}>
          <div className="grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3.5 border border-white/10 text-center">
                <p className="text-2xl font-bold text-brand-300 leading-tight">{s.value}</p>
                <p className="text-[10px] text-white/40 mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── O que é crédito de ICMS? ─────────────────────────── */}
        <section id="sobre" className="px-5 py-8 border-t border-dark-700/40">
          <div className="bg-gradient-to-br from-brand-500/8 to-accent-500/5 border border-brand-500/15 rounded-2xl p-5">
            <span className="text-[11px] text-brand-400 font-semibold uppercase tracking-wider">O que é</span>
            <h2 className="text-lg font-bold text-white mt-1 mb-3">Crédito de ICMS</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              Empresas que geram mais ICMS do que devem pagar acumulam saldo credor junto à SEFAZ. Esse saldo pode ser negociado — <strong className="text-white/90">cedido para empresas que têm débito de ICMS</strong> a pagar, com benefício mútuo: o cedente monetiza o crédito parado, o cessionário reduz sua carga tributária.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-brand-300">
              <CheckIcon />
              <span>100% legal · Previsto no RICMS-SP e legislação federal</span>
            </div>
          </div>
        </section>

        {/* ── Para quem é? ─────────────────────────────────────── */}
        <section className="px-5 pb-8">
          <h2 className="text-lg font-bold text-white mb-4">Para quem é a plataforma?</h2>
          <div className="space-y-3">
            {audiences.map((a) => (
              <div key={a.title} className="bg-dark-800/60 border border-dark-600/40 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{a.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-white">{a.title}</span>
                      <span className="text-[11px] text-slate-500">{a.subtitle}</span>
                    </div>
                    <p className="text-xs text-white/55 mt-1.5 leading-relaxed">{a.desc}</p>
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-1 mt-2.5 text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
                    >
                      {a.cta} →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Como funciona ────────────────────────────────────── */}
        <section className="px-5 pb-8 border-t border-dark-700/40 pt-8">
          <h2 className="text-lg font-bold text-white mb-5">Como funciona</h2>
          <div className="space-y-5">
            {howItWorks.map((h, i) => (
              <div key={h.step} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/25 flex items-center justify-center text-brand-400 font-black text-sm">
                  {h.step}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm font-semibold text-white">{h.title}</p>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed">{h.desc}</p>
                </div>
                {i < howItWorks.length - 1 && (
                  <div className="absolute ml-5 mt-10 w-px h-5 bg-brand-500/20" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Diferenciais ─────────────────────────────────────── */}
        <section className="px-5 pb-8 border-t border-dark-700/40 pt-8">
          <h2 className="text-lg font-bold text-white mb-4">Por que a E-CREDac?</h2>
          <div className="grid grid-cols-2 gap-3">
            {differentials.map((d) => (
              <div key={d.title} className="bg-dark-800/60 border border-dark-600/30 rounded-xl p-3.5">
                <span className="text-xl">{d.icon}</span>
                <p className="text-xs font-semibold text-white mt-2">{d.title}</p>
                <p className="text-[11px] text-white/45 mt-1 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Formulário de login ──────────────────────────────── */}
        <section
          ref={formRef}
          id="login"
          className="px-5 pb-8 pt-8 border-t border-dark-700/40"
        >
          <div className="bg-dark-800 border border-dark-600/40 rounded-2xl p-5 shadow-xl shadow-black/20">
            <LoginForm />
          </div>
        </section>

        {/* ── Rodapé mobile ───────────────────────────────────── */}
        <footer className="px-5 pb-10 pt-4 border-t border-dark-700/30">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center font-black text-xs">E</div>
            <span className="text-sm font-bold">E-CREDac</span>
            <span className="text-xs text-slate-600">by Rede Ampara Tec</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-600">
            <Link href="/institucional" className="hover:text-slate-400 transition-colors">Quem Somos</Link>
            <span>·</span>
            <Link href="/termos" className="hover:text-slate-400 transition-colors">Termos de Uso</Link>
            <span>·</span>
            <Link href="/privacidade" className="hover:text-slate-400 transition-colors">Privacidade</Link>
            <span>·</span>
            <a href="mailto:contato@relius.com.br" className="hover:text-slate-400 transition-colors">Contato</a>
          </div>
          <p className="text-center text-[10px] text-slate-700 mt-3">
            © {new Date().getFullYear()} Rede Ampara Tec · CNPJ 00.000.000/0001-00 · Todos os direitos reservados
          </p>
        </footer>
      </div>
    </>
  )
}
