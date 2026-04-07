'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, ShieldCheck, Zap,
  Briefcase, Calculator, CheckCircle2,
  Clock, LineChart, Building2, Lock, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LandingPage() {
  const [formData, setFormData] = useState({
    nome: '', email: '', telefone: '', cnpj: '', perfil: 'empresa' as string, mensagem: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar.')
      setSuccess(true)
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-accent-200 selection:text-slate-900 overflow-hidden relative">
      
      {/* ─── RAMBUS BACKGROUND GRID ─── */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>

      {/* ─── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-black tracking-tight">RELIUS</span>
          </div>
          <div className="flex items-center gap-8">
            <Link href="#como-funciona" className="text-[14px] font-semibold text-slate-600 hover:text-black hidden md:block transition-colors">Método</Link>
            <Link href="#contadores" className="text-[14px] font-semibold text-slate-600 hover:text-black hidden md:block transition-colors">Assessorias</Link>
            <div className="h-4 w-px bg-slate-300 hidden md:block"></div>
            <Link href="/login" className="text-[14px] font-bold text-black hover:text-accent-600 transition-colors">Entrar</Link>
            <Link href="#simular" className="group relative px-6 py-2.5 rounded-full bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm">
              <span className="text-[14px] font-bold text-black">Acessar</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="pt-40 pb-24 md:pt-56 md:pb-32 px-6 relative flex items-center justify-center z-10">
        
        {/* Rambus style blobs */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-rambus-peach/80 rounded-full blur-[100px] -z-10 pointer-events-none" />
        <div className="absolute top-32 right-1/4 w-[400px] h-[400px] bg-accent-100/80 rounded-full blur-[100px] -z-10 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-20">
          <div className="inline-flex items-center gap-2 px-5 py-2 border border-slate-200 bg-white rounded-full shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-accent-500 animate-pulse"></span>
            <span className="text-slate-700 text-sm font-bold tracking-wide">Operação de antecipação ativa</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-[88px] font-black text-black leading-[1.05] tracking-tight">
            Liquidez <span className="text-slate-400 font-medium italic">imediata</span> para seus
            <span className="block mt-2 font-black text-black">ativos tributários.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
            A infraestrutura de inteligência e bolsa balcão que conecta empresas com PIS/COFINS acumulados a compradores corporativos. Seguro, anônimo e digital.
          </p>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="#simular" className="group relative w-full sm:w-auto px-8 py-4 rounded-full bg-black text-white hover:bg-slate-800 text-[16px] font-bold transition-all flex items-center justify-center gap-3 shadow-float">
              Descubra seu valor <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── O PROBLEMA ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative z-10 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-6xl font-black text-black tracking-tight leading-tight">R$ 70 Bi engessados<br />no Brasil.</h2>
            </div>
            <p className="text-slate-500 font-semibold text-xl max-w-sm">A ineficiência do sistema não é técnica, é informacional.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Calculator, title: 'Dinheiro Cativado', desc: 'Sua operação produz um ativo milionário que deprecia frente à inflação. Capital de giro congelado pela burocracia.', color: '#000' },
              { icon: ShieldCheck, title: 'Fricção Legal', desc: 'Processos de auditoria, garantias excessivas e um ciclo de venda que pode durar mais de dois anos no mercado convencional.', color: '#000' },
              { icon: Briefcase, title: 'Bolsa Balcão', desc: 'Operamos um marketplace anônimo onde algoritmos criam o precing perfeito entre oferta fiscal e demanda tributária.', color: '#4ADE80' }
            ].map((item, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-[32px] p-10 hover:border-slate-300 hover:shadow-soft transition-all relative overflow-hidden group">
                <div className="mb-8 w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-accent-50 transition-colors">
                  <item.icon size={28} style={{ color: item.color }} />
                </div>
                <h3 className="text-2xl font-bold text-black mb-4 tracking-tight">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed font-medium text-16px">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMO FUNCIONA (METHOD) ───────────────────────────────────────── */}
      <section id="como-funciona" className="py-32 px-6 bg-slate-50 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-20">
            <div className="lg:w-1/3">
              <h3 className="text-slate-900 font-extrabold tracking-widest uppercase text-sm mb-6 inline-flex border border-slate-200 bg-white rounded-full px-4 py-1">O Motor</h3>
              <h2 className="text-5xl md:text-6xl font-black text-black mb-8 leading-[1.1] tracking-tight">Visibilidade<br/>total.<br/><span className="text-slate-400 font-medium">Acesso<br/>zero.</span></h2>
              <p className="text-slate-600 text-lg leading-relaxed font-medium">
                Compradores validam seu crédito através do nosso motor criptográfico. Sem exposição de notas fiscais, sem quebra de sigilo comercial.
              </p>
            </div>
            
            <div className="lg:w-2/3 grid sm:grid-cols-2 gap-6 leading-relaxed">
              {[
                { step: '01', title: 'Data Engine', desc: 'Parse automático de obrigações magnéticas (SPED) e cálculo matemático do Score de Risco Relius.' },
                { step: '02', title: 'Listing Cego', desc: 'Oferta no book de crédito preservando 100% da identidade corporativa do originador.' },
                { step: '03', title: 'Matching', desc: 'Conexão via IA com empresas pagadoras de alto volume que buscam otimização imediata na DRE.' },
                { step: '04', title: 'Liquidação', desc: 'Escrow account nativo para garantir segurança atômica simultânea da transferência financeira do acordo.' }
              ].map((s, i) => (
                <div key={i} className="bg-white border border-slate-200 p-8 rounded-[32px] hover:shadow-soft transition-all relative overflow-hidden group">
                  <div className="text-slate-200 font-black text-5xl mb-6 group-hover:text-accent-200 transition-colors tracking-tighter">{s.step}</div>
                  <h4 className="text-xl font-bold text-black mb-3 tracking-tight">{s.title}</h4>
                  <p className="text-slate-500 text-md font-medium">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── PÚBLICOS ALVO ──────────────────────── */}
      <section id="contadores" className="py-24 px-6 relative z-10 bg-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8">
          
          <div className="bg-white border border-slate-200 rounded-[40px] p-10 md:p-14 relative overflow-hidden group shadow-sm hover:shadow-soft transition-shadow">
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-accent-100 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white border border-slate-200 shadow-sm mb-8">
                <LineChart className="text-black" size={24} />
              </div>
              <h2 className="text-4xl font-black text-black mb-6 tracking-tight">Para Assessorias</h2>
              <p className="text-xl text-slate-600 mb-10 font-medium leading-relaxed">
                Empacote inteligência M&A para seus clientes. O <strong>Painel do Consultor</strong> permite gerenciar carteiras, rastrear operações e liquidar posições rastreando comissões in-time.
              </p>
              <ul className="space-y-4 mb-12">
                {['Novo driver de receita', 'Governança trackeada', 'Execução 100% plataforma'].map(txt => (
                  <li key={txt} className="flex items-center gap-3 text-slate-700 text-md font-bold">
                    <CheckCircle2 size={20} className="text-accent-500" /> {txt}
                  </li>
                ))}
              </ul>
              <Link href="#simular" className="flex items-center justify-between w-full p-5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-black font-bold text-md transition-all group/btn">
                Mapeie seus clientes <ArrowRight size={20} className="text-black group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="bg-black border border-black rounded-[40px] p-10 md:p-14 relative overflow-hidden group shadow-float">
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-rambus-orange/20 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-slate-800 border border-slate-700 mb-8">
                <Building2 className="text-white" size={24} />
              </div>
              <h2 className="text-4xl font-black text-white mb-6 tracking-tight">CFOs & Diretorias</h2>
              <p className="text-xl text-slate-300 mb-10 font-medium leading-relaxed">
                Liquidificador de balanço. Indústrias e exportadoras: O saldo estático em "Impostos a Recuperar" no seu balanço corporativo agora possui um botão "Sacar".
              </p>
              <ul className="space-y-4 mb-12">
                {['Validação criptográfica', 'Zero burocracia offline', 'Match direto no book'].map(txt => (
                  <li key={txt} className="flex items-center gap-3 text-white text-md font-bold">
                    <CheckCircle2 size={20} className="text-accent-400" /> {txt}
                  </li>
                ))}
              </ul>
              <Link href="#simular" className="flex items-center justify-between w-full p-5 rounded-full bg-white text-black hover:bg-slate-100 font-bold text-md transition-all group/btn">
                Simule a operação <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ─── URGÊNCIA TIMELINE ───────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden bg-slate-50 z-10">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center p-2 border border-slate-200 rounded-full bg-white mb-10 shadow-sm">
            <span className="px-6 py-2 rounded-full text-slate-500 font-bold text-sm">2025</span>
            <ChevronRight size={16} className="text-slate-300 mx-2" />
            <span className="px-6 py-2 rounded-full text-slate-500 font-bold text-sm">2026</span>
            <ChevronRight size={16} className="text-slate-300 mx-2" />
            <span className="px-6 py-2 rounded-full bg-accent-100 text-accent-700 font-black text-sm relative">
              2027 <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent-500 animate-ping" />
            </span>
          </div>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-black mb-8 tracking-tight leading-[1.05]">O relógio extinguiu <span className="text-slate-400 italic font-medium">PIS/COFINS.</span></h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
            A Reforma Tributária determinou a extinção em 2027. O deságio aumenta à medida em que a liquidez se aproxima de zero com as novas regras da RFB.
          </p>
        </div>
      </section>

      {/* ─── FORMULÁRIO DE CAPTAÇÃO ───────────────────────────────────────── */}
      <section id="simular" className="py-32 px-6 bg-white relative z-10 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-[40px] p-8 md:p-16 shadow-float relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rambus-peach/40 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="text-center mb-14 relative z-10">
              <h2 className="text-4xl md:text-5xl font-black text-black mb-4 tracking-tight">Access Point</h2>
              <p className="text-slate-500 font-medium text-lg">A primeira conversa é o início da sua liquidez corporativa.</p>
            </div>

            {success ? (
              <div className="bg-accent-50 border border-accent-200 rounded-[32px] p-12 text-center animate-in fade-in zoom-in duration-500 relative z-10">
                <div className="w-20 h-20 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-8 shrink-0">
                  <CheckCircle2 size={40} className="text-accent-600" />
                </div>
                <h3 className="text-3xl font-black text-black mb-4 tracking-tight">Sinal Capturado.</h3>
                <p className="text-slate-600 font-medium max-w-md mx-auto mb-10 text-lg">Nossos sistemas realizarão o screening completo KYC via Banco Central e RFB. Entraremos em contato via canal seguro.</p>
                <button onClick={() => setSuccess(false)} className="text-accent-700 text-[14px] font-bold hover:text-black transition-colors">Enviar nova solicitação</button>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-8 relative z-10">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest pl-2">Identificação</label>
                    <input required type="text" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-black focus:bg-white rounded-[20px] px-6 py-5 text-black text-[16px] font-medium placeholder:text-slate-400 transition-all outline-none" placeholder="Nome do Responsável" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest pl-2">Email Corporativo</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-black focus:bg-white rounded-[20px] px-6 py-5 text-black text-[16px] font-medium placeholder:text-slate-400 transition-all outline-none" placeholder="corp@empresa.com.br" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest pl-2">Linha Segura (Celular/WA)</label>
                    <input required type="text" value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-black focus:bg-white rounded-[20px] px-6 py-5 text-black text-[16px] font-medium placeholder:text-slate-400 transition-all outline-none" placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest pl-2">CNPJ (Cross-check)</label>
                    <input type="text" value={formData.cnpj} onChange={e => setFormData({ ...formData, cnpj: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-black focus:bg-white rounded-[20px] px-6 py-5 text-black text-[16px] font-medium placeholder:text-slate-400 transition-all outline-none" placeholder="Opcional" />
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest pl-2 block">Perfil Registrado</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'empresa', label: 'Empresa Cedente' },
                      { id: 'contador', label: 'Assessoria Fiscal' },
                      { id: 'advogado', label: 'Escritório Jurídico' }
                    ].map(p => (
                      <button 
                        key={p.id} 
                        type="button" 
                        onClick={() => setFormData({ ...formData, perfil: p.id })}
                        className={cn(
                          "px-5 py-4 rounded-[20px] border text-[14px] font-bold transition-all",
                          formData.perfil === p.id ? "bg-black border-black text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest pl-2">Contexto da Operação</label>
                  <textarea value={formData.mensagem} onChange={e => setFormData({ ...formData, mensagem: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-black focus:bg-white rounded-[20px] px-6 py-5 text-black text-[16px] font-medium placeholder:text-slate-400 transition-all outline-none resize-none h-32" placeholder="Dúvidas adicionais ou características iniciais da tese..." />
                </div>

                {errorMsg && (
                  <div className="p-5 rounded-[20px] bg-red-50 border border-red-200 text-red-600 text-[14px] font-bold flex items-center gap-3">
                    <ShieldCheck size={20} /> {errorMsg}
                  </div>
                )}

                <button 
                  disabled={loading}
                  type="submit" 
                  className="w-full py-6 rounded-full bg-black hover:bg-slate-800 text-white font-black text-[16px] transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-10 shadow-float group"
                >
                  {loading ? 'Inicializando Handshake...' : <><Lock size={18} /> Iniciar Securitização <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
                </button>
                <div className="flex items-center justify-center gap-2 mt-6 opacity-60">
                  <Lock size={14} className="text-slate-500" />
                  <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Conexão TLS Encriptada E2E</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-16 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-black tracking-tight">RELIUS</span>
            <span className="text-[11px] text-slate-400 font-bold ml-4 border-l border-slate-200 pl-4 uppercase tracking-widest">AmparaTec</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-[12px] text-slate-500 font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-black transition-colors">Privacy</a>
            <a href="#" className="hover:text-black transition-colors">Terms</a>
            <a href="/login" className="text-black hover:text-accent-600 transition-colors border-l border-slate-200 pl-8 flex items-center gap-1.5"><Lock size={14}/> Plataforma</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
