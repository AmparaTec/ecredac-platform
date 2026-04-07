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
    <div className="min-h-screen bg-[#07090C] text-slate-300 font-sans selection:bg-[#c9a84c]/20 selection:text-white font-['Outfit',_sans-serif]">

      {/* ─── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-[#07090C]/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[26px] font-black text-white tracking-widest">RELIUS</span>
          </div>
          <div className="flex items-center gap-8">
            <Link href="#como-funciona" className="text-[13px] font-medium text-slate-400 hover:text-white hidden md:block transition-colors uppercase tracking-widest">Método</Link>
            <Link href="#contadores" className="text-[13px] font-medium text-slate-400 hover:text-white hidden md:block transition-colors uppercase tracking-widest">Assessorias</Link>
            <div className="h-4 w-px bg-white/10 hidden md:block"></div>
            <Link href="/login" className="text-[13px] font-bold text-white hover:text-[#C9A84C] transition-colors uppercase tracking-widest">Entrar</Link>
            <Link href="#simular" className="group relative px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:border-[#c9a84c]/50 hover:bg-[#c9a84c]/10 transition-all overflow-hidden">
              <span className="relative z-10 text-[13px] font-bold tracking-widest text-[#c9a84c] uppercase group-hover:text-[#d4b96a]">Acessar</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 md:pt-56 md:pb-32 px-6 relative overflow-hidden flex items-center justify-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#0A2E1C]/40 rounded-[100%] blur-[120px] -z-10 pointer-events-none" />
        <div className="absolute top-32 right-1/4 w-[400px] h-[400px] bg-[#C9A84C]/10 rounded-[100%] blur-[120px] -z-10 pointer-events-none" />
        
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />
        
        <div className="max-w-4xl mx-auto text-center space-y-8 z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-white/10 bg-white/[0.03] rounded-full backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]"></span>
            <span className="text-slate-300 text-[11px] font-bold tracking-widest uppercase">Operação de antecipação ativa</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-[80px] font-black text-white leading-[1.05] tracking-tight">
            Liquidez <span className="font-light italic text-slate-400">imediata</span> para seus
            <span className="block mt-2 bg-gradient-to-r from-[#D4B96A] via-[#C9A84C] to-[#E2CB86] text-transparent bg-clip-text">ativos tributários.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
            A infraestrutura de inteligência e bolsa balcão que conecta empresas com PIS/COFINS acumulados a compradores corporativos. Seguro, anônimo e 100% digital.
          </p>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="#simular" className="group relative w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-[#07090C] hover:bg-slate-200 text-[15px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3">
              Descubra seu valor <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── O PROBLEMA ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">R$ 70 Bi engessados<br />no Brasil.</h2>
            </div>
            <p className="text-slate-500 font-light text-lg max-w-sm">A ineficiência do sistema não é técnica, é informacional. Resolvemos o atrito.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Calculator, title: 'Dinheiro Cativado', desc: 'Sua operação produz um ativo milionário que deprecia frente à inflação. Capital de giro congelado pela burocracia.', color: '#C9A84C' },
              { icon: ShieldCheck, title: 'Fricção Legal', desc: 'Processos de auditoria, garantias excessivas e um ciclo de venda que pode durar mais de dois anos no mercado tradicional.', color: '#888' },
              { icon: Briefcase, title: 'Bolsa Balcão', desc: 'Operamos um marketplace anônimo onde algoritmos criam o precing perfeito entre oferta fiscal e demanda de carga tributária.', color: '#10b981' }
            ].map((item, i) => (
              <div key={i} className="bg-[#0D1015] border border-white/5 rounded-[24px] p-10 hover:bg-[#12161b] hover:border-white/10 transition-all relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[80px] opacity-20`} style={{ background: item.color }} />
                <div className="mb-8">
                  <item.icon size={32} style={{ color: item.color }} />
                </div>
                <h3 className="text-xl font-bold text-white mb-4 tracking-tight">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed font-light text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMO FUNCIONA (METHOD) ───────────────────────────────────────── */}
      <section id="como-funciona" className="py-32 px-6 bg-[#0B0D12] relative border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-20">
            <div className="lg:w-1/3">
              <h3 className="text-[#C9A84C] font-bold tracking-widest uppercase text-[11px] mb-4">O Motor</h3>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight tracking-tight">Visibilidade<br/>total.<br/><span className="text-slate-600">Acesso<br/>zero.</span></h2>
              <p className="text-slate-400 text-lg leading-relaxed font-light">
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
                <div key={i} className="bg-white/[0.02] border border-white/5 p-8 rounded-[24px] hover:border-[#10b981]/30 transition-colors relative overflow-hidden group">
                  <div className="text-[#c9a84c] font-black text-4xl mb-6 opacity-30 group-hover:opacity-100 transition-opacity tracking-tighter">{s.step}</div>
                  <h4 className="text-lg font-bold text-white mb-3 tracking-tight">{s.title}</h4>
                  <p className="text-slate-400 text-[15px] font-light">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── PÚBLICOS ALVO (GLASS CARDS SYNEX STYLE) ──────────────────────── */}
      <section id="contadores" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8">
          
          <div className="bg-[#090C10] border border-white/[0.04] rounded-[32px] p-10 md:p-14 relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#10b981]/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-[#10b981]/30 transition-colors" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 border border-white/10 mb-8">
                <LineChart className="text-[#10b981]" size={20} />
              </div>
              <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Para Assessorias</h2>
              <p className="text-lg text-slate-400 mb-10 font-light leading-relaxed">
                Empacote inteligência M&A para seus clientes. O <strong>Painel do Consultor</strong> permite gerenciar carteiras de clientes, rastrear operações ativas e liquidar posições com tracking em tempo real da sua comissão.
              </p>
              <ul className="space-y-4 mb-12">
                {['Novo driver de receita', 'Governança trackeada', 'Execução 100% plataforma'].map(txt => (
                  <li key={txt} className="flex items-center gap-3 text-slate-300 text-sm font-medium">
                    <CheckCircle2 size={16} className="text-[#10b981]" /> {txt}
                  </li>
                ))}
              </ul>
              <Link href="#simular" className="flex items-center justify-between w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm transition-all group/btn">
                Mapeie seus clientes <ArrowRight size={16} className="text-[#10b981] group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="bg-[#090C10] border border-white/[0.04] rounded-[32px] p-10 md:p-14 relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#C9A84C]/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-[#C9A84C]/30 transition-colors" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 border border-white/10 mb-8">
                <Building2 className="text-[#C9A84C]" size={20} />
              </div>
              <h2 className="text-3xl font-black text-white mb-4 tracking-tight">CFOs & Diretorias</h2>
              <p className="text-lg text-slate-400 mb-10 font-light leading-relaxed">
                Liquidificador de balanço. Voltado para indústrias, exportadoras e beneficiadas por alíquota zero. O saldo estático em "Impostos a Recuperar" no seu balanço corporativo agora possui um botão "Sacar".
              </p>
              <ul className="space-y-4 mb-12">
                {['Validação criptográfica', 'Zero burocracia offline', 'Match direto no book'].map(txt => (
                  <li key={txt} className="flex items-center gap-3 text-slate-300 text-sm font-medium">
                    <CheckCircle2 size={16} className="text-[#C9A84C]" /> {txt}
                  </li>
                ))}
              </ul>
              <Link href="#simular" className="flex items-center justify-between w-full p-4 rounded-2xl bg-white text-[#07090C] hover:bg-slate-200 text-sm font-black uppercase tracking-widest transition-all group/btn">
                Simule a operação <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ─── URGÊNCIA TIMELINE ───────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden bg-[#07090C]">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center p-1.5 border border-white/10 rounded-full bg-white/[0.02] backdrop-blur-md mb-10">
            <span className="px-6 py-2 rounded-full text-slate-500 font-bold text-sm">2025</span>
            <ChevronRight size={14} className="text-slate-600 mx-2" />
            <span className="px-6 py-2 rounded-full text-slate-500 font-bold text-sm">2026</span>
            <ChevronRight size={14} className="text-slate-600 mx-2" />
            <span className="px-6 py-2 rounded-full bg-[#143D2B] text-[#10b981] border border-[#10b981]/30 font-black text-sm relative">
              2027 <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-7xl font-black text-white mb-8 tracking-tight leading-[1.1]">O relógio para PIS/COFINS <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 italic font-light">parou.</span></h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
            A Reforma Tributária determinou a extinção do PIS/COFINS em 2027. O deságio aumenta à medida em que a liquidez se aproxima de zero com as novas regras da RFB.
          </p>
        </div>
      </section>

      {/* ─── FORMULÁRIO DE CAPTAÇÃO ───────────────────────────────────────── */}
      <section id="simular" className="py-32 px-6 bg-[#040507] border-t border-white/5 relative">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent" />
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#090C10] border border-white/5 rounded-[32px] p-8 md:p-16 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-xl">
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[#C9A84C]/10 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="text-center mb-12 relative z-10">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">Access Point</h2>
              <p className="text-slate-400 font-light">A primeira conversa é o início da sua liquidez corporativa.</p>
            </div>

            {success ? (
              <div className="bg-[#143D2B]/20 border border-[#10b981]/30 rounded-3xl p-10 text-center animate-in fade-in zoom-in duration-500 relative z-10">
                <div className="w-16 h-16 bg-[#10b981]/20 rounded-full flex items-center justify-center mx-auto mb-6 shrink-0 ring-1 ring-[#10b981]/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 size={32} className="text-[#10b981]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Signal Captured.</h3>
                <p className="text-slate-400 font-light max-w-sm mx-auto mb-8">Nossos sistemas realizarão o screening KYC via Banco Central e RFB. Entraremos em contato via canal seguro.</p>
                <button onClick={() => setSuccess(false)} className="text-[#C9A84C] text-[13px] font-bold uppercase tracking-widest hover:text-white transition-colors">Nova requisição</button>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-6 relative z-10">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Identificação</label>
                    <input required type="text" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} className="w-full bg-white/[0.02] border border-white/5 focus:border-[#c9a84c]/50 focus:bg-[#c9a84c]/5 rounded-[16px] px-5 py-4 text-white text-[15px] font-light placeholder:text-slate-600 transition-all outline-none" placeholder="Nome do Responsável" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Endereço de Contato</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-white/[0.02] border border-white/5 focus:border-[#c9a84c]/50 focus:bg-[#c9a84c]/5 rounded-[16px] px-5 py-4 text-white text-[15px] font-light placeholder:text-slate-600 transition-all outline-none" placeholder="corp@empresa.com.br" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Linha de WhatsApp</label>
                    <input required type="text" value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: e.target.value })} className="w-full bg-white/[0.02] border border-white/5 focus:border-[#c9a84c]/50 focus:bg-[#c9a84c]/5 rounded-[16px] px-5 py-4 text-white text-[15px] font-light placeholder:text-slate-600 transition-all outline-none" placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Hash RFB (CNPJ)</label>
                    <input type="text" value={formData.cnpj} onChange={e => setFormData({ ...formData, cnpj: e.target.value })} className="w-full bg-white/[0.02] border border-white/5 focus:border-[#c9a84c]/50 focus:bg-[#c9a84c]/5 rounded-[16px] px-5 py-4 text-white text-[15px] font-light placeholder:text-slate-600 transition-all outline-none" placeholder="Opcional" />
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2 block">Natureza da Operação</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                          "px-4 py-3.5 rounded-[16px] border text-[13px] font-bold tracking-wide transition-all",
                          formData.perfil === p.id ? "bg-[#c9a84c]/10 border-[#C9A84C]/50 text-[#D4B96A]" : "bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/20 hover:bg-white/5"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Transmissão Criptografada</label>
                  <textarea value={formData.mensagem} onChange={e => setFormData({ ...formData, mensagem: e.target.value })} className="w-full bg-white/[0.02] border border-white/5 focus:border-[#c9a84c]/50 focus:bg-[#c9a84c]/5 rounded-[16px] px-5 py-4 text-white text-[15px] font-light placeholder:text-slate-600 transition-all outline-none resize-none h-28" placeholder="Inicie o contato com detalhes sobre o ativo tributário..." />
                </div>

                {errorMsg && (
                  <div className="p-4 rounded-[16px] bg-red-500/10 border border-red-500/30 text-red-400 text-[13px] font-medium flex items-center gap-3">
                    <ShieldCheck size={18} /> {errorMsg}
                  </div>
                )}

                <button 
                  disabled={loading}
                  type="submit" 
                  className="w-full py-5 rounded-[16px] bg-white hover:bg-slate-200 text-[#07090C] font-black text-[15px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-8 group"
                >
                  {loading ? 'Inicializando Handshake...' : <><Lock size={16} /> Secure Connect <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>}
                </button>
                <div className="flex items-center justify-center gap-2 mt-4 opacity-50">
                  <Lock size={12} className="text-slate-400" />
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">Conexão TLS Encriptada</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-[#040507] py-16 px-6 relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[1px] bg-gradient-to-r from-transparent via-[#c9a84c]/20 to-transparent" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-white tracking-widest">RELIUS</span>
            <span className="text-[10px] text-slate-600 ml-3 border-l border-white/10 pl-3 uppercase tracking-widest">Developed by AmparaTec</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-[12px] text-slate-500 font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Protocol</a>
            <a href="/login" className="hover:text-[#D4B96A] transition-colors border-l border-white/10 pl-6 flex items-center gap-1.5"><Lock size={12}/> Platform Access</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
