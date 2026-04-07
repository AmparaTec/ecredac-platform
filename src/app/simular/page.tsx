'use client'

import { useState } from 'react'

type Step = 1 | 2 | 3
type Regime = 'lucro_real' | 'lucro_presumido'

interface CompanyData {
  razao_social: string
  cnae_descricao: string
  porte: string
  municipio: string
  uf: string
  cnae_principal: string
}

interface SimulacaoResult {
  credito_face: { min: number; max: number }
  valor_liquido: { min: number; max: number }
  prazo_estimado: string
  confiabilidade: 'baixa' | 'media' | 'alta'
  metodologia: string
}

const formatCnpjMask = (v: string) => {
  const n = v.replace(/\D/g, '').slice(0, 14)
  return n
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const formatInputMoney = (v: string) =>
  v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export default function SimularPage() {
  const [step, setStep] = useState<Step>(1)
  const [cnpj, setCnpj] = useState('')
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loadingCnpj, setLoadingCnpj] = useState(false)
  const [cnpjError, setCnpjError] = useState('')
  const [regime, setRegime] = useState<Regime>('lucro_real')
  const [percentualIsento, setPercentualIsento] = useState(60)
  const [meses, setMeses] = useState(12)
  const [receitaMensal, setReceitaMensal] = useState('')
  const [result, setResult] = useState<SimulacaoResult | null>(null)
  const [loadingCalc, setLoadingCalc] = useState(false)
  const [calcError, setCalcError] = useState('')

  const lookupCnpj = async (raw: string) => {
    const nums = raw.replace(/\D/g, '')
    if (nums.length !== 14) return
    setLoadingCnpj(true)
    setCnpjError('')
    setCompany(null)
    try {
      const res = await fetch(`/api/cnpj/${nums}`)
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'ERROR' || !data.razao_social) {
          setCnpjError('CNPJ não encontrado. Verifique o número e tente novamente.')
        } else {
          setCompany(data)
        }
      } else {
        setCnpjError('Não foi possível consultar o CNPJ agora. Continue assim mesmo.')
      }
    } catch {
      setCnpjError('Não foi possível consultar o CNPJ agora. Continue assim mesmo.')
    }
    setLoadingCnpj(false)
  }

  const calcular = async () => {
    setLoadingCalc(true)
    setCalcError('')
    try {
      const res = await fetch('/api/simular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnpj: cnpj.replace(/\D/g, ''),
          regime,
          percentual_isento: percentualIsento,
          meses,
          receita_mensal_estimada: receitaMensal
            ? Number(receitaMensal.replace(/\./g, ''))
            : null,
          cnae: company?.cnae_principal,
          porte: company?.porte,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
        setStep(3)
      } else {
        setCalcError('Erro no cálculo. Tente novamente.')
      }
    } catch {
      setCalcError('Erro de conexão. Tente novamente.')
    }
    setLoadingCalc(false)
  }

  const stepLabels = ['Empresa', 'Parâmetros', 'Resultado']

  return (
    <div className="min-h-screen bg-[#0a1f12] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10 max-w-5xl mx-auto">
        <a href="/" className="text-[#c9a227] font-bold text-xl tracking-tight">
          Relius
        </a>
        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5"
          >
            Entrar
          </a>
          <a
            href="/cadastro"
            className="text-sm bg-[#c9a227] text-[#0a1f12] px-4 py-1.5 rounded-lg font-semibold hover:bg-[#e0b730] transition-colors"
          >
            Cadastrar grátis
          </a>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#c9a227]/10 border border-[#c9a227]/30 text-[#c9a227] text-xs font-semibold px-3 py-1.5 rounded-full mb-4 tracking-wide">
            ⚡ RESULTADO EM 30 SEGUNDOS
          </div>
          <h1 className="text-3xl font-bold mb-3 leading-tight">
            Quanto vale o seu<br />crédito PIS/COFINS?
          </h1>
          <p className="text-white/50 text-base">
            Estimativa gratuita. Sem upload de arquivo. Sem compromisso.
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center mb-8">
          {stepLabels.map((label, i) => {
            const n = i + 1
            const active = step === n
            const done = step > n
            return (
              <div key={n} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                      done
                        ? 'bg-[#c9a227] border-[#c9a227] text-[#0a1f12]'
                        : active
                        ? 'border-[#c9a227] text-[#c9a227] bg-[#c9a227]/10'
                        : 'border-white/20 text-white/30'
                    }`}
                  >
                    {done ? '✓' : n}
                  </div>
                  <span
                    className={`text-xs hidden sm:block ${
                      active ? 'text-[#c9a227]' : done ? 'text-white/50' : 'text-white/20'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < 2 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mt-[-10px] sm:mt-[-20px] transition-all duration-300 ${
                      step > n ? 'bg-[#c9a227]' : 'bg-white/10'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* ─── STEP 1: CNPJ ─── */}
        {step === 1 && (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-7">
            <h2 className="text-lg font-semibold mb-1">Qual é o CNPJ da empresa?</h2>
            <p className="text-white/40 text-sm mb-6">
              Buscamos os dados automaticamente na Receita Federal.
            </p>

            <div className="relative mb-2">
              <input
                type="text"
                value={cnpj}
                onChange={(e) => {
                  const fmt = formatCnpjMask(e.target.value)
                  setCnpj(fmt)
                  setCnpjError('')
                  if (fmt.replace(/\D/g, '').length === 14) lookupCnpj(fmt)
                }}
                placeholder="00.000.000/0001-00"
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-4 text-lg font-mono focus:outline-none focus:border-[#c9a227] transition-colors placeholder-white/20"
                autoFocus
              />
              {loadingCnpj && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {cnpjError && (
              <p className="text-yellow-400/80 text-xs mb-4 px-1">{cnpjError}</p>
            )}

            {company && (
              <div className="bg-[#c9a227]/8 border border-[#c9a227]/25 rounded-xl p-4 mb-5 mt-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#c9a227]/20 rounded-lg flex items-center justify-center text-[#c9a227] font-bold text-base flex-shrink-0">
                    {company.razao_social.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[#c9a227] text-sm truncate">
                      {company.razao_social}
                    </div>
                    <div className="text-white/40 text-xs truncate">{company.cnae_descricao}</div>
                    <div className="text-white/30 text-xs mt-0.5">
                      {company.municipio}/{company.uf} · {company.porte}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={cnpj.replace(/\D/g, '').length < 14 || loadingCnpj}
              className="w-full bg-[#c9a227] text-[#0a1f12] font-bold py-4 rounded-xl text-base hover:bg-[#e0b730] transition-all disabled:opacity-30 disabled:cursor-not-allowed mt-2"
            >
              Continuar →
            </button>

            <p className="text-center text-white/20 text-xs mt-4">
              Não temos acesso aos seus sistemas fiscais.
            </p>
          </div>
        )}

        {/* ─── STEP 2: PARÂMETROS ─── */}
        {step === 2 && (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-7">
            <h2 className="text-lg font-semibold mb-1">Perfil tributário</h2>
            <p className="text-white/40 text-sm mb-6">
              Ajuste os parâmetros para uma estimativa mais precisa.
            </p>

            {/* Regime */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-white/60 mb-2">
                Regime de apuração
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'lucro_real', label: 'Lucro Real', sub: 'PIS 1,65% + COFINS 7,6%' },
                  { value: 'lucro_presumido', label: 'Lucro Presumido', sub: 'PIS 0,65% + COFINS 3,0%' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRegime(opt.value as Regime)}
                    className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                      regime === opt.value
                        ? 'border-[#c9a227] bg-[#c9a227]/10'
                        : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-white/35 text-xs mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* % Isento */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-white/60 mb-2">
                Receita com exportação, isenção ou alíquota zero
                <span className="text-[#c9a227] font-bold ml-2">{percentualIsento}%</span>
              </label>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={percentualIsento}
                onChange={(e) => setPercentualIsento(Number(e.target.value))}
                className="w-full accent-[#c9a227] cursor-pointer"
              />
              <div className="flex justify-between text-xs text-white/25 mt-1">
                <span>10% — misto</span>
                <span>100% — exportador puro</span>
              </div>
            </div>

            {/* Meses */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-white/60 mb-2">
                Período de crédito acumulado
                <span className="text-[#c9a227] font-bold ml-2">{meses} meses</span>
              </label>
              <input
                type="range"
                min={3}
                max={36}
                step={3}
                value={meses}
                onChange={(e) => setMeses(Number(e.target.value))}
                className="w-full accent-[#c9a227] cursor-pointer"
              />
              <div className="flex justify-between text-xs text-white/25 mt-1">
                <span>3 meses</span>
                <span>36 meses</span>
              </div>
            </div>

            {/* Faturamento (opcional) */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white/60 mb-2">
                Faturamento mensal médio{' '}
                <span className="text-white/25 font-normal">(opcional — melhora precisão)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                  R$
                </span>
                <input
                  type="text"
                  value={receitaMensal}
                  onChange={(e) => setReceitaMensal(formatInputMoney(e.target.value))}
                  placeholder="0"
                  className="w-full bg-white/5 border border-white/20 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#c9a227] transition-colors placeholder-white/20"
                />
              </div>
            </div>

            {calcError && (
              <p className="text-red-400/80 text-xs mb-3 px-1">{calcError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-white/15 text-white/50 font-semibold py-3 rounded-xl hover:border-white/30 hover:text-white/70 transition-colors text-sm"
              >
                ← Voltar
              </button>
              <button
                onClick={calcular}
                disabled={loadingCalc}
                className="flex-[2] bg-[#c9a227] text-[#0a1f12] font-bold py-3 rounded-xl hover:bg-[#e0b730] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingCalc ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#0a1f12] border-t-transparent rounded-full animate-spin" />
                    Calculando...
                  </span>
                ) : (
                  'Ver minha estimativa →'
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: RESULTADO ─── */}
        {step === 3 && result && (
          <div>
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-7 mb-4">
              {/* Empresa resumo */}
              {company && (
                <div className="flex items-center gap-2 mb-6 pb-5 border-b border-white/10">
                  <div className="w-7 h-7 bg-[#c9a227]/20 rounded-md flex items-center justify-center text-[#c9a227] font-bold text-xs flex-shrink-0">
                    {company.razao_social.charAt(0)}
                  </div>
                  <span className="text-white/50 text-sm truncate">{company.razao_social}</span>
                  <span
                    className={`ml-auto text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      result.confiabilidade === 'alta'
                        ? 'bg-green-500/20 text-green-400'
                        : result.confiabilidade === 'media'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-white/10 text-white/40'
                    }`}
                  >
                    Estimativa {result.confiabilidade === 'alta' ? 'boa' : result.confiabilidade === 'media' ? 'média' : 'indicativa'}
                  </span>
                </div>
              )}

              {/* Valor principal */}
              <div className="text-center mb-6">
                <div className="text-white/50 text-sm mb-1">Crédito acumulado estimado</div>
                <div className="text-4xl sm:text-5xl font-bold text-[#c9a227] leading-tight mb-1">
                  {formatBRL(result.credito_face.min)}
                  <span className="text-2xl text-[#c9a227]/60 mx-2">–</span>
                  {formatBRL(result.credito_face.max)}
                </div>
                <div className="text-white/30 text-xs">valor de face · base {result.metodologia}</div>
              </div>

              {/* Grid secundário */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-[#0a1f12] border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-white/40 text-xs mb-1.5">Você recebe (estimado)</div>
                  <div className="text-xl font-bold text-emerald-400">
                    {formatBRL(result.valor_liquido.min)}
                    <span className="text-sm text-emerald-400/60 mx-1">–</span>
                    {formatBRL(result.valor_liquido.max)}
                  </div>
                  <div className="text-white/25 text-xs mt-1">após desconto + comissão</div>
                </div>
                <div className="bg-[#0a1f12] border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-white/40 text-xs mb-1.5">Prazo para receber</div>
                  <div className="text-xl font-bold">{result.prazo_estimado}</div>
                  <div className="text-white/25 text-xs mt-1">após assinatura</div>
                </div>
              </div>

              {/* Aviso */}
              <div className="bg-[#c9a227]/5 border border-[#c9a227]/15 rounded-xl p-3.5 mb-6 flex gap-3">
                <span className="text-[#c9a227] flex-shrink-0 mt-0.5">⚡</span>
                <p className="text-white/50 text-xs leading-relaxed">
                  Esta é uma <strong className="text-white/80">estimativa preliminar</strong> baseada nos parâmetros informados.
                  Para precisão real, faça upload da EFD-Contribuições na plataforma.{' '}
                  <strong className="text-white/80">Não acessamos seus sistemas fiscais.</strong>
                </p>
              </div>

              {/* CTA principal */}
              <a
                href="/cadastro"
                className="block w-full text-center bg-[#c9a227] text-[#0a1f12] font-bold py-4 rounded-xl text-base hover:bg-[#e0b730] transition-all mb-3"
              >
                Quero monetizar esse crédito — Cadastrar grátis
              </a>
              <a
                href="/"
                className="block w-full text-center border border-white/15 text-white/50 py-2.5 rounded-xl text-sm hover:border-white/30 hover:text-white/70 transition-colors"
              >
                Saber mais sobre a Relius
              </a>
            </div>

            <p className="text-center text-white/20 text-xs px-4">
              Estimativa baseada em alíquotas vigentes (RFB) e parâmetros informados. Não constitui assessoria fiscal ou jurídica. Relius não executa PER/DCOMP em seu nome.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
