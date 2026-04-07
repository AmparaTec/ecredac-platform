import { NextRequest, NextResponse } from 'next/server'

interface SimularBody {
  cnpj: string
  regime: 'lucro_real' | 'lucro_presumido'
  percentual_isento: number
  meses: number
  receita_mensal_estimada: number | null
  cnae?: string
  porte?: string
}

// Alíquotas efetivas por regime (PIS + COFINS)
const ALIQUOTAS = {
  lucro_real: 0.0925,      // 1.65% + 7.6%
  lucro_presumido: 0.0365, // 0.65% + 3.0%
}

// Faturamento médio por porte (estimativa conservadora — IBGE/SEBRAE)
const FATURAMENTO_PORTE: Record<string, number> = {
  MEI: 8_000,
  ME: 120_000,
  EPP: 1_200_000,
  MEDIO: 12_000_000,
  GRANDE: 80_000_000,
}

// Fator de acúmulo real vs crédito teórico
// Empresas não aproveitam 100% — compensações parciais, estornos, limitações
// Média de mercado: ~72% do crédito teórico fica acumulado
const FATOR_ACUMULO = 0.72

// Range de desconto praticado no mercado (PIS/COFINS federais, 2025-2026)
// Menor desconto = melhor cenário para cedente
const DESCONTO_MIN = 0.20 // 20% de desconto (melhor caso)
const DESCONTO_MAX = 0.35 // 35% de desconto (caso conservador)

// Comissão Relius
const COMISSAO_RELIUS = 0.10

// Ajuste por CNAE: setores com maior liquidez pagam menos desconto
const CNAE_DESCONTO_AJUSTE: Record<string, number> = {
  // Agronegócio/exportação — alta liquidez
  '0111': -0.03, '0112': -0.03, '0113': -0.03, '0114': -0.03, '0115': -0.03,
  '0119': -0.03, '0131': -0.03, '0132': -0.03, '0133': -0.03, '0134': -0.03,
  '0135': -0.03, '0139': -0.03, '0141': -0.03, '0142': -0.03, '0151': -0.03,
  '0152': -0.03, '0155': -0.03, '0159': -0.03, '0161': -0.03, '0162': -0.03,
  '0163': -0.03, '0164': -0.03, '0170': -0.03,
  // Indústria de alimentos e bebidas
  '1011': -0.02, '1012': -0.02, '1013': -0.02, '1020': -0.02, '1031': -0.02,
  '1032': -0.02, '1033': -0.02, '1091': -0.02, '1092': -0.02, '1093': -0.02,
  // Indústria de papel e celulose
  '1710': -0.02, '1721': -0.02, '1722': -0.02, '1731': -0.02, '1732': -0.02,
  // Petroquímica / refinaria
  '1910': -0.04, '1921': -0.04, '1922': -0.04, '2011': -0.04, '2012': -0.04,
  // Comércio varejista — menor liquidez
  '4711': 0.03, '4712': 0.03, '4721': 0.02, '4731': 0.02,
}

function getDescontoAjuste(cnae?: string): number {
  if (!cnae) return 0
  // Tenta pelo prefixo de 4 dígitos
  const prefixo = cnae.replace(/\D/g, '').slice(0, 4)
  return CNAE_DESCONTO_AJUSTE[prefixo] ?? 0
}

export async function POST(req: NextRequest) {
  try {
    const body: SimularBody = await req.json()
    const {
      regime = 'lucro_real',
      percentual_isento,
      meses,
      receita_mensal_estimada,
      cnae,
      porte,
    } = body

    // Validações básicas
    if (percentual_isento < 1 || percentual_isento > 100) {
      return NextResponse.json(
        { error: 'Percentual isento deve estar entre 1% e 100%.' },
        { status: 400 }
      )
    }
    if (meses < 1 || meses > 60) {
      return NextResponse.json(
        { error: 'Período deve estar entre 1 e 60 meses.' },
        { status: 400 }
      )
    }

    // Faturamento base
    const porteKey = porte?.toUpperCase().replace(/\s/g, '_') ?? ''
    const faturamentoMensal =
      (receita_mensal_estimada && receita_mensal_estimada > 0)
        ? receita_mensal_estimada
        : FATURAMENTO_PORTE[porteKey] ?? FATURAMENTO_PORTE['EPP']

    // Alíquota do regime
    const aliquota = ALIQUOTAS[regime] ?? ALIQUOTAS.lucro_real

    // Crédito gerado mensalmente (sobre parcela isenta/exportada)
    const creditoMensal =
      faturamentoMensal * (percentual_isento / 100) * aliquota * FATOR_ACUMULO

    // Crédito acumulado no período
    const creditoFaceBase = creditoMensal * meses

    // Variação de ±15% para dar range honesto
    const creditoFaceMin = Math.round(creditoFaceBase * 0.85)
    const creditoFaceMax = Math.round(creditoFaceBase * 1.15)

    // Ajuste de desconto por setor (CNAE)
    const ajuste = getDescontoAjuste(cnae)
    const descontoMin = Math.max(0.10, DESCONTO_MIN + ajuste)
    const descontoMax = Math.min(0.50, DESCONTO_MAX + ajuste)

    // Valor líquido para o cedente: face × (1 - desconto) × (1 - comissão Relius)
    const valorLiquidoMin = Math.round(creditoFaceMin * (1 - descontoMax) * (1 - COMISSAO_RELIUS))
    const valorLiquidoMax = Math.round(creditoFaceMax * (1 - descontoMin) * (1 - COMISSAO_RELIUS))

    // Confiabilidade da estimativa
    const confiabilidade: 'baixa' | 'media' | 'alta' =
      receita_mensal_estimada && receita_mensal_estimada > 0
        ? 'alta'
        : porte
        ? 'media'
        : 'baixa'

    // Prazo estimado (simplificado — depende do volume e da demanda do mercado)
    const prazo = creditoFaceBase > 5_000_000 ? '30–60 dias' : '15–45 dias'

    // Label do regime
    const regimeLabel =
      regime === 'lucro_real' ? 'Lucro Real (9,25%)' : 'Lucro Presumido (3,65%)'

    return NextResponse.json({
      credito_face: { min: creditoFaceMin, max: creditoFaceMax },
      valor_liquido: { min: valorLiquidoMin, max: valorLiquidoMax },
      prazo_estimado: prazo,
      confiabilidade,
      metodologia: `${regimeLabel} · ${percentual_isento}% receita isenta · ${meses} meses`,
      // Dados de debug (não exibidos ao usuário)
      _debug: {
        faturamento_mensal_usado: faturamentoMensal,
        credito_mensal: Math.round(creditoMensal),
        desconto_range: [descontoMin, descontoMax],
        fator_acumulo: FATOR_ACUMULO,
      },
    })
  } catch (err) {
    console.error('[/api/simular] erro:', err)
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente.' },
      { status: 500 }
    )
  }
}
