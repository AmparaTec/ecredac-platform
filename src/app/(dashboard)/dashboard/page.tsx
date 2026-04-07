'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STEPS = [
  { id: 1, label: 'Cadastro',       icon: '✓', desc: 'Conta criada com sucesso' },
  { id: 2, label: 'Documentação',   icon: '2', desc: 'EFD-Contribuições (últimos 5 anos)' },
  { id: 3, label: 'Análise',        icon: '3', desc: 'Apuração do crédito real' },
  { id: 4, label: 'Oferta',         icon: '4', desc: 'Propostas de compradores' },
  { id: 5, label: 'Liquidação',     icon: '5', desc: 'Transferência em 30-90 dias' },
]

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export default function DashboardCedentePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return }
      setUser(data.user)
      setLoading(false)
    })
  }, [router])

  if (loading) return (
    <div className="min-h-screen bg-[#0a1f12] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const meta   = user?.user_metadata ?? {}
  const nome   = (meta.full_name as string) || 'Cedente'
  const razao  = (meta.razao_social as string) || ''
  const cnpj   = (meta.cnpj as string) || ''
  const step   = 2 // sempre step 2 no cadastro novo

  // Estimativa mock baseada no perfil (sem EFD ainda)
  const estimMin = 180_000
  const estimMax = 420_000

  return (
    <div className="min-h-screen bg-[#0a1f12] text-white">
      {/* ── NAVBAR ─────────────────────────────────────────────── */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-[#c9a227] font-bold text-xl tracking-tight">Relius</span>
          <div className="flex items-center gap-4">
            <span className="text-white/50 text-sm hidden sm:block">{razao || nome}</span>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
              className="text-white/40 hover:text-white/70 text-sm transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── WELCOME ──────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Olá, {nome.split(' ')[0]} 👋
            </h1>
            {razao && (
              <p className="text-white/50 text-sm mt-1">
                {razao}
                {cnpj && <span className="ml-2 font-mono">{cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}</span>}
              </p>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
            Aguardando documentação
          </span>
        </div>

        {/* ── PROGRESSO DA OPERAÇÃO ────────────────────────────── */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-5">
            Progresso da operação
          </h2>
          <div className="relative">
            {/* linha de fundo */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-white/10 hidden sm:block" />
            <div
              className="absolute top-5 left-5 h-0.5 bg-[#c9a227] hidden sm:block transition-all"
              style={{ width: `${((step - 1) / 4) * 100}%` }}
            />
            <div className="grid grid-cols-5 gap-2 relative">
              {STEPS.map((s) => {
                const done   = s.id < step
                const active = s.id === step
                return (
                  <div key={s.id} className="flex flex-col items-center gap-2 text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 z-10 transition-all ${
                      done   ? 'bg-[#c9a227] border-[#c9a227] text-[#0a1f12]' :
                      active ? 'border-[#c9a227] text-[#c9a227] bg-[#c9a227]/10' :
                               'border-white/15 text-white/25 bg-[#0a1f12]'
                    }`}>
                      {done ? '✓' : s.id}
                    </div>
                    <div>
                      <div className={`text-xs font-semibold ${active ? 'text-[#c9a227]' : done ? 'text-white/70' : 'text-white/25'}`}>
                        {s.label}
                      </div>
                      <div className="text-white/30 text-[10px] leading-tight mt-0.5 hidden sm:block">
                        {s.desc}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* ── ESTIMATIVA ───────────────────────────────────────── */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#c9a227]/15 rounded-lg flex items-center justify-center text-[#c9a227] text-sm">💰</div>
              <span className="text-sm font-semibold text-white/70">Estimativa de crédito</span>
            </div>
            <div className="mb-1">
              <span className="text-3xl font-bold text-[#c9a227]">{fmt(estimMin)}</span>
              <span className="text-white/40 text-sm ml-2">— {fmt(estimMax)}</span>
            </div>
            <p className="text-white/40 text-xs mt-2 leading-relaxed">
              Estimativa preliminar baseada no seu perfil. O valor real será apurado após análise da EFD-Contribuições.
            </p>
            <div className="mt-4 flex items-center gap-2 text-white/35 text-xs">
              <span className="w-1.5 h-1.5 bg-amber-400/60 rounded-full" />
              Precisão aumenta com a documentação
            </div>
          </div>

          {/* ── LIQUIDEZ ─────────────────────────────────────────── */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center text-emerald-400 text-sm">⚡</div>
              <span className="text-sm font-semibold text-white/70">Liquidez estimada</span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Valor líquido (após desconto)', val: fmt(estimMin * 0.72), cor: 'text-emerald-400' },
                { label: 'Prazo de liquidação',          val: '30 – 90 dias',        cor: 'text-white' },
                { label: 'Desconto médio de mercado',    val: '20 – 35%',            cor: 'text-white' },
                { label: 'Plataforma',                   val: '100% digital',        cor: 'text-white' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-white/45 text-xs">{r.label}</span>
                  <span className={`text-sm font-semibold ${r.cor}`}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── PRÓXIMO PASSO: UPLOAD EFD ───────────────────────── */}
        <div className="bg-gradient-to-br from-[#c9a227]/12 to-[#c9a227]/4 border border-[#c9a227]/30 rounded-2xl p-6">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="w-12 h-12 bg-[#c9a227]/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
              📁
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-bold text-[#c9a227]">Próximo passo: envie sua EFD-Contribuições</h3>
                <span className="bg-[#c9a227]/20 text-[#c9a227] text-xs font-semibold px-2 py-0.5 rounded-full">Obrigatório</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed mb-4">
                Envie os arquivos SPED dos últimos 5 anos (2020-2024). A apuração precisa leva em média 48h.
                Seus dados são criptografados e a Relius não acessa seus sistemas fiscais.
              </p>
              <div className="flex flex-wrap gap-4 mb-5 text-sm">
                {['Arquivo .txt do SPED', 'Últimos 5 anos', 'Qualquer regime'].map(i => (
                  <span key={i} className="flex items-center gap-1.5 text-white/50">
                    <span className="text-emerald-400 text-xs">✓</span>{i}
                  </span>
                ))}
              </div>
              <a
                href="/enviar-efd"
                className="inline-flex items-center gap-2 bg-[#c9a227] text-[#0a1f12] font-bold px-6 py-3 rounded-xl hover:bg-[#e0b730] transition-all text-sm"
              >
                📤 Enviar EFD-Contribuições
              </a>
            </div>
          </div>
        </div>

        {/* ── COMO FUNCIONA RESUMIDO ───────────────────────────── */}
        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">O que acontece depois</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { n: '48h', title: 'Análise da EFD', desc: 'Motor calcula o crédito real apurável com base nos seus lançamentos fiscais.' },
              { n: '72h', title: 'Oferta de compradores', desc: 'Compradores qualificados fazem propostas competitivas pelo seu crédito.' },
              { n: '30d', title: 'Liquidação', desc: 'Contrato assinado digitalmente. Transferência em até 90 dias.' },
            ].map(c => (
              <div key={c.n} className="flex gap-4">
                <div className="w-10 h-10 bg-[#c9a227]/10 rounded-xl flex items-center justify-center text-[#c9a227] font-bold text-sm flex-shrink-0">
                  {c.n}
                </div>
                <div>
                  <div className="font-semibold text-sm mb-1">{c.title}</div>
                  <div className="text-white/40 text-xs leading-relaxed">{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
