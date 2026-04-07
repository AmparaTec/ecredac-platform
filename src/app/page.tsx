import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'

export default async function HomePage() {
  // Usuário autenticado → vai direto ao dashboard
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[#0a1f12] text-white overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-[#0a1f12]/90 backdrop-blur border-b border-white/8">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#c9a227] font-bold text-xl tracking-tight">Relius</span>
            <span className="hidden sm:block text-white/20 text-xs border border-white/10 px-2 py-0.5 rounded-full">
              PIS/COFINS
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm text-white/60 hover:text-white transition-colors hidden sm:block">
              Entrar
            </a>
            <a
              href="/simular"
              className="text-sm bg-[#c9a227] text-[#0a1f12] px-4 py-2 rounded-lg font-semibold hover:bg-[#e0b730] transition-colors"
            >
              Simular agora
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-[#c9a227]/10 border border-[#c9a227]/25 text-[#c9a227] text-xs font-semibold px-4 py-1.5 rounded-full mb-6 tracking-wide">
          🏆 JANELA 2025–2026 · REFORMA TRIBUTÁRIA EXTINGUE PIS/COFINS EM 2027
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-6 max-w-4xl mx-auto">
          Transforme seu crédito<br />
          PIS/COFINS acumulado em{' '}
          <span className="text-[#c9a227]">dinheiro no caixa</span>
        </h1>

        <p className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Empresas exportadoras e setores isentos acumulam bilhões em créditos que não conseguem usar.
          A Relius conecta você a compradores qualificados. 100% digital. Zero acesso aos seus sistemas fiscais.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <a
            href="/simular"
            className="inline-flex items-center justify-center gap-2 bg-[#c9a227] text-[#0a1f12] font-bold px-8 py-4 rounded-xl text-lg hover:bg-[#e0b730] transition-all shadow-lg shadow-[#c9a227]/20"
          >
            ⚡ Simular meu crédito — 30 segundos
          </a>
          <a
            href="/cadastro"
            className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-8 py-4 rounded-xl text-lg hover:border-white/40 hover:bg-white/5 transition-all"
          >
            Criar conta grátis
          </a>
        </div>

        <p className="text-white/30 text-sm">
          Gratuito · Sem upload de arquivo · Resultado em 30 segundos
        </p>
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-y border-white/8 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { value: 'R$ 70 bi', label: 'em créditos sem liquidez (estimativa de mercado)', color: 'text-[#c9a227]' },
            { value: '2027', label: 'fim do PIS/COFINS com a Reforma Tributária', color: 'text-red-400' },
            { value: '100%', label: 'digital — sem acesso aos seus sistemas fiscais', color: 'text-white' },
            { value: '30–90d', label: 'prazo médio para receber após assinatura', color: 'text-emerald-400' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className={`text-2xl sm:text-3xl font-bold ${s.color} mb-1`}>{s.value}</div>
              <div className="text-white/40 text-xs leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Como funciona</h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Do crédito parado à liquidez no caixa. Sem fricção humana no caminho crítico.
          </p>
        </div>

        <div className="grid sm:grid-cols-5 gap-4">
          {[
            {
              step: '01',
              title: 'Simule em 30s',
              desc: 'Informe o CNPJ e parâmetros básicos. Receba uma estimativa do seu crédito imediatamente.',
              icon: '⚡',
            },
            {
              step: '02',
              title: 'Faça o upload da EFD',
              desc: 'Envie sua EFD-Contribuições. O motor de IA calcula o crédito exato e gera o score de confiabilidade.',
              icon: '📊',
            },
            {
              step: '03',
              title: 'Marketplace',
              desc: 'Seu crédito verificado é publicado anonimamente. Compradores qualificados fazem propostas.',
              icon: '🏦',
            },
            {
              step: '04',
              title: 'Contrato digital',
              desc: 'Match feito → contrato de cessão gerado automaticamente e assinado eletronicamente na plataforma.',
              icon: '✍️',
            },
            {
              step: '05',
              title: 'Escrow + Recebimento',
              desc: 'Pagamento em escrow liberado conforme marcos. Você realiza o PER/DCOMP no e-CAC. Relius monitora.',
              icon: '💰',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 relative"
            >
              <div className="text-3xl mb-3">{item.icon}</div>
              <div className="text-[#c9a227] text-xs font-bold mb-1 tracking-widest">{item.step}</div>
              <div className="font-semibold mb-2 text-sm">{item.title}</div>
              <div className="text-white/45 text-xs leading-relaxed">{item.desc}</div>
              {i < 4 && (
                <div className="hidden sm:block absolute top-8 -right-2 text-white/15 text-lg">›</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── PARA QUEM É ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Cedente */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8">
            <div className="w-12 h-12 bg-[#c9a227]/15 rounded-xl flex items-center justify-center text-2xl mb-5">
              🏭
            </div>
            <h3 className="text-xl font-bold mb-3">Para quem tem crédito</h3>
            <p className="text-white/50 text-sm mb-5 leading-relaxed">
              Exportadores, indústrias com insumos isentos, empresas do Lucro Real com saídas não tributadas. Seu crédito PIS/COFINS acumulado pode virar caixa agora — antes de 2027.
            </p>
            <ul className="space-y-2 text-sm text-white/60 mb-6">
              {[
                'Verificação automática via EFD + NF-e',
                'Precificação baseada em mercado',
                'Contrato e escrow automatizados',
                'Você realiza o PER/DCOMP — Relius monitora',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#c9a227] flex-shrink-0 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="/simular"
              className="block text-center bg-[#c9a227] text-[#0a1f12] font-bold py-3 rounded-xl hover:bg-[#e0b730] transition-colors"
            >
              Simular meu crédito →
            </a>
          </div>

          {/* Comprador */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8">
            <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center text-2xl mb-5">
              💼
            </div>
            <h3 className="text-xl font-bold mb-3">Para quem quer comprar</h3>
            <p className="text-white/50 text-sm mb-5 leading-relaxed">
              Empresas com débitos de PIS/COFINS ou IRPJ/CSLL podem adquirir créditos com desconto para compensação, reduzindo o custo tributário de forma legal e segura.
            </p>
            <ul className="space-y-2 text-sm text-white/60 mb-6">
              {[
                'Créditos verificados com score de confiabilidade',
                'Marketplace anônimo — identidade revelada no match',
                'Due diligence fiscal automatizada',
                'Escrow com liberação por marcos',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="/cadastro?perfil=comprador"
              className="block text-center border border-emerald-500/40 text-emerald-400 font-bold py-3 rounded-xl hover:bg-emerald-500/10 transition-colors"
            >
              Acessar marketplace →
            </a>
          </div>
        </div>
      </section>

      {/* ── SEGURANÇA E COMPLIANCE ── */}
      <section className="border-y border-white/8 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold mb-2">Seguro. Auditável. Sem acesso fiscal.</h2>
          <p className="text-white/50 mb-10 max-w-xl mx-auto text-sm">
            Sua empresa nunca cede acesso ao e-CAC, SEFAZ ou certificado digital. Todo o processo é rastreável.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: '🔐', title: 'KYC completo', desc: 'Validação de empresas e responsáveis antes de qualquer operação' },
              { icon: '✍️', title: 'Contrato eletrônico', desc: 'Assinatura digital com validade jurídica' },
              { icon: '🏦', title: 'Escrow protegido', desc: 'Pagamento em custódia liberado por marcos contratuais' },
              { icon: '📋', title: 'LGPD & Auditoria', desc: 'Log imutável de todas as ações. Dados excluídos em 45 dias.' },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white/[0.03] border border-white/8 rounded-xl p-5 text-left"
              >
                <div className="text-2xl mb-3">{item.icon}</div>
                <div className="font-semibold text-sm mb-1">{item.title}</div>
                <div className="text-white/40 text-xs leading-snug">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
          Descubra quanto você tem<br />
          parado em crédito{' '}
          <span className="text-[#c9a227]">agora</span>
        </h2>
        <p className="text-white/50 mb-8 text-lg max-w-xl mx-auto">
          Em 30 segundos você sabe o quanto pode transformar em caixa antes que a janela feche.
        </p>
        <a
          href="/simular"
          className="inline-flex items-center gap-2 bg-[#c9a227] text-[#0a1f12] font-bold px-10 py-4 rounded-xl text-lg hover:bg-[#e0b730] transition-all shadow-lg shadow-[#c9a227]/20 mb-4"
        >
          ⚡ Simular grátis — sem cadastro
        </a>
        <p className="text-white/25 text-sm">
          Resultado imediato. Cadastro opcional para ver o relatório completo.
        </p>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/8">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-[#c9a227] font-bold text-lg mb-1">Relius</div>
            <div className="text-white/30 text-xs">
              Plataforma de intermediação de créditos PIS/COFINS. Brasil, 2026.
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-white/40 text-xs text-center">
            <a href="/compliance/termos" className="hover:text-white/70 transition-colors">
              Termos de Uso
            </a>
            <a href="/compliance/privacidade" className="hover:text-white/70 transition-colors">
              Política de Privacidade
            </a>
            <a href="/login" className="hover:text-white/70 transition-colors">
              Login
            </a>
            <a href="/cadastro" className="hover:text-white/70 transition-colors">
              Cadastro
            </a>
          </div>
          <div className="text-white/20 text-xs text-center sm:text-right">
            © 2026 Relius · Todos os direitos reservados<br />
            Não somos assessores fiscais. Não executamos PER/DCOMP.
          </div>
        </div>
      </footer>

    </div>
  )
}
