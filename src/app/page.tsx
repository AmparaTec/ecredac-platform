import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = {
  title: 'Relius | Plataforma de Intermediação de Créditos PIS/COFINS',
  description:
    'Conectamos empresas com créditos PIS/COFINS acumulados a compradores qualificados. Verificação automática, contrato digital e liquidação segura.',
}

export default async function LandingPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-[#0a1f12] text-white">

      {/* ── NAV ── */}
      <nav className="border-b border-[#1e3d28] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-white">Relius</span>
            <span className="text-xs text-[#c9a227] font-medium uppercase tracking-widest">E-CREDac</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-300 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link
              href="/register"
              className="bg-[#c9a227] hover:bg-[#b8921f] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Cadastrar empresa
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block bg-[#c9a227]/10 border border-[#c9a227]/30 text-[#c9a227] text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-8">
            Janela 2025–2026 · Reforma Tributária extingue PIS/COFINS em 2027
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            O mercado de créditos{' '}
            <span className="text-[#c9a227]">PIS/COFINS</span>{' '}
            está aberto.
            <br />Mas fecha em 2027.
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Relius conecta empresas com créditos acumulados a compradores qualificados.
            Verificação automática por EFD + NF-e. Contrato digital. Escrow seguro.
            100% digital, sem burocracia.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register?perfil=cedente"
              className="bg-[#c9a227] hover:bg-[#b8921f] text-black font-bold px-8 py-4 rounded-xl text-lg transition-colors"
            >
              Tenho créditos para vender →
            </Link>
            <Link
              href="/register?perfil=comprador"
              className="border border-[#c9a227]/40 hover:border-[#c9a227] text-[#c9a227] font-bold px-8 py-4 rounded-xl text-lg transition-colors"
            >
              Quero comprar créditos →
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="border-y border-[#1e3d28] px-6 py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 'R$ 70 bi', label: 'em créditos parados no Brasil' },
            { value: '24 meses', label: 'de janela até a Reforma' },
            { value: '100%', label: 'digital — sem visita presencial' },
            { value: '72h', label: 'da verificação ao contrato' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-[#c9a227] mb-1">{s.value}</div>
              <div className="text-sm text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMO FUNCIONA — CEDENTE ── */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Como funciona para quem tem créditos</h2>
            <p className="text-gray-400">Processo 100% automatizado para cedentes PIS/COFINS</p>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {[
              { n: '01', title: 'Cadastro', desc: 'Empresa + KYC digital em minutos' },
              { n: '02', title: 'Upload EFD', desc: 'Arquivo SPED pipe-delimitado' },
              { n: '03', title: 'Verificação', desc: 'Parser + cruzamento NF-e + SEFAZ' },
              { n: '04', title: 'Marketplace', desc: 'Score + precificação automática' },
              { n: '05', title: 'Liquidação', desc: 'Contrato ClickSign + Escrow Pagar.me' },
            ].map((step, i) => (
              <div key={step.n} className="relative">
                <div className="bg-[#0d2818] border border-[#1e3d28] rounded-xl p-4 h-full">
                  <div className="text-[#c9a227] text-xs font-bold mb-2">{step.n}</div>
                  <div className="font-semibold text-sm mb-1">{step.title}</div>
                  <div className="text-xs text-gray-400 leading-relaxed">{step.desc}</div>
                </div>
                {i < 4 && (
                  <div className="hidden md:flex absolute top-1/2 -right-2.5 text-[#c9a227] text-xs z-10">›</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARA QUEM ── */}
      <section className="px-6 py-16 bg-[#0d2818]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
          <div>
            <div className="inline-block text-[#c9a227] text-xs font-semibold uppercase tracking-widest mb-4">
              Para cedentes
            </div>
            <h3 className="text-2xl font-bold mb-4">Sua empresa acumula créditos PIS/COFINS?</h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Exportadoras, indústrias, empresas em regime de substituição tributária e setores
              desonerados acumulam créditos que nunca serão ressarcidos pelo governo.
              Relius transforma esse passivo em caixa imediato.
            </p>
            <ul className="space-y-2">
              {[
                'Exportadores (crédito de insumos)',
                'Indústrias com não-cumulatividade',
                'Empresas com saldo credor recorrente',
                'Setores com alíquota zero na saída',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-[#c9a227]">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="inline-block text-[#c9a227] text-xs font-semibold uppercase tracking-widest mb-4">
              Para compradores
            </div>
            <h3 className="text-2xl font-bold mb-4">Reduza débitos federais com desconto</h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Adquira créditos PIS/COFINS verificados com deságio e use para quitar
              débitos tributários federais via PER/DCOMP. Economia real, crédito
              rastreado e auditado pela plataforma.
            </p>
            <ul className="space-y-2">
              {[
                'Créditos verificados por EFD + NF-e',
                'Deságio negociado via marketplace',
                'Contrato digital com validade jurídica',
                'Monitoramento PER/DCOMP em tempo real',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-[#c9a227]">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── TRILHO A vs B ── */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Dois mercados. Uma plataforma.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#0d2818] border border-[#c9a227]/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-[#c9a227] text-black text-xs font-bold px-2 py-0.5 rounded">Trilho A</span>
                <span className="text-sm font-semibold">Federal — PIS/COFINS</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                100% automatizado. EFD parser, cruzamento NF-e, precificação por algoritmo,
                contrato ClickSign e escrow Pagar.me. Do cadastro ao recebimento em dias.
              </p>
              <div className="text-xs text-[#c9a227] font-medium">✓ Disponível agora</div>
            </div>
            <div className="bg-[#0d2818] border border-[#1e3d28] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-gray-600 text-white text-xs font-bold px-2 py-0.5 rounded">Trilho B</span>
                <span className="text-sm font-semibold">Estadual — ICMS E-CredAc</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                Pipeline curado pelo fundador. Créditos de ICMS acumulados (SP e outros estados).
                Operação tailor-made para operações de maior complexidade.
              </p>
              <div className="text-xs text-gray-400 font-medium">Em breve — cadastre interesse</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEGURANÇA ── */}
      <section className="px-6 py-16 bg-[#0d2818] border-y border-[#1e3d28]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">Visibilidade total. Acesso zero.</h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              Compradores acompanham o crédito em tempo real sem nunca acessar sistemas
              fiscais do cedente. Segregação total de informações sensíveis.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '🔒',
                title: 'KYC + PLD',
                desc: 'Verificação de identidade, CNPJ e compliance automatizados antes de qualquer operação',
              },
              {
                icon: '📋',
                title: 'Contrato jurídico',
                desc: 'Assinatura digital via ClickSign com validade legal e rastreabilidade completa',
              },
              {
                icon: '🏦',
                title: 'Escrow seguro',
                desc: 'Pagar.me bloqueia o pagamento em escrow. Liberação por marcos verificados',
              },
            ].map((f) => (
              <div key={f.title} className="text-center">
                <div className="text-3xl mb-3">{f.icon}</div>
                <div className="font-semibold mb-2">{f.title}</div>
                <div className="text-sm text-gray-400 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">
            A janela fecha em{' '}
            <span className="text-[#c9a227]">2027.</span>
          </h2>
          <p className="text-gray-300 mb-10 text-lg">
            Cadastre sua empresa hoje. A verificação é gratuita.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-[#c9a227] hover:bg-[#b8921f] text-black font-bold px-10 py-4 rounded-xl text-lg transition-colors"
            >
              Começar agora — é gratuito
            </Link>
            <Link
              href="/login"
              className="border border-white/20 hover:border-white/40 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-colors"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#1e3d28] px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <div>
            <span className="text-white font-bold">Relius</span>
            <span className="text-[#c9a227] text-xs font-medium ml-2 uppercase tracking-widest">E-CREDac</span>
            <span className="ml-4">© {new Date().getFullYear()} AmparaTec. Todos os direitos reservados.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/termos-de-uso" className="hover:text-white transition-colors">Termos de uso</Link>
            <Link href="/politica-de-privacidade" className="hover:text-white transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>

    </main>
  )
}
