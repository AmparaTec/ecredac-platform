// =============================================================
// Consultas Públicas — Integração direta com portais governamentais
// Fonte: portais oficiais gratuitos (sem intermediários pagos)
// =============================================================

import { createClient } from '@supabase/supabase-js'

// ---- Types ----

export type ConsultaTipo = 
  | 'cnpj' | 'cadesp' | 'cnd_federal' | 'cnd_estadual'
  | 'cadin' | 'conta_fiscal' | 'sintegra' | 'certidao_cadastral'

export interface CadespData {
  cnpj: string
  inscricao_estadual: string
  razao_social: string
  nome_fantasia: string
  situacao_cadastral: 'ATIVO' | 'INATIVO' | 'SUSPENSO' | 'BAIXADO' | 'NULA'
  data_situacao: string
  regime_apuracao: 'RPA' | 'SN' | 'ISENTO' | null
  data_inicio_atividade: string
  cnae_principal: string
  cnae_descricao: string
  endereco: {
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    municipio: string
    uf: string
    cep: string
  }
  consulta_em: string
  fonte: 'download_lote' | 'consulta_publica'
}

export interface CndData {
  cnpj: string
  situacao: 'NEGATIVA' | 'POSITIVA' | 'POSITIVA_COM_EFEITO'
  data_emissao: string
  data_validade: string
  codigo_controle: string
  certidao_pdf_path: string | null
  consulta_em: string
}

export interface CadinData {
  cnpj: string
  inscrito: boolean
  orgao_credor: string | null
  consulta_em: string
}

export interface ContaFiscalData {
  cnpj: string
  inscricao_estadual: string
  tem_debitos_abertos: boolean
  debitos_nao_inscritos: number
  parcelamentos_ativos: number
  situacao_geral: 'REGULAR' | 'IRREGULAR' | 'PENDENCIAS'
  consulta_em: string
}

export interface DebitoEstadualData {
  cnpj: string
  tem_debitos: boolean
  total_debitos: number
  certidao_situacao: 'NEGATIVA' | 'POSITIVA' | 'POSITIVA_COM_EFEITO'
  consulta_em: string
}

export interface DueDiligenceResult {
  cnpj: string
  cadesp: CadespData | null
  cnd_federal: CndData | null
  cnd_estadual: DebitoEstadualData | null
  cadin: CadinData | null
  conta_fiscal: ContaFiscalData | null
  apto_transacao: boolean
  motivos_bloqueio: string[]
  score: {
    ecredac: number
    regularidade: number
    cadastral: number
    plataforma: number
    total: number
    grade: string
  }
}

// ---- Cache Layer ----

const CACHE_TTL: Record<ConsultaTipo, number> = {
  cnpj:                7 * 24 * 3600,  // 7 dias
  cadesp:              24 * 3600,      // 24h
  cnd_federal:         30 * 24 * 3600, // 30 dias
  cnd_estadual:        30 * 24 * 3600, // 30 dias
  cadin:               7 * 24 * 3600,  // 7 dias
  conta_fiscal:        24 * 3600,      // 24h
  sintegra:            24 * 3600,      // 24h
  certidao_cadastral:  7 * 24 * 3600,  // 7 dias
}

// URLs oficiais dos portais públicos
export const PORTAIS_PUBLICOS = {
  cadesp_consulta: 'https://www.cadesp.fazenda.sp.gov.br/Pages/Cadastro/Consultas/ConsultaPublica/ConsultaPublica.aspx',
  cadesp_download: 'https://www.cadesp.fazenda.sp.gov.br/Pages/Cadastro/Consultas/ConsultaPublica/DownloadDadosPublicos.aspx',
  cadesp_certidao: 'https://www.cadesp.fazenda.sp.gov.br/Pages/Cadastro/Certidoes/CertidaoSituacaoCadastral.aspx',
  cnd_federal:     'https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Consultar/',
  cnpj_rfb:        'https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp',
  pge_sp_crda:     'https://www.dividaativa.pge.sp.gov.br/sc/pages/crda/emitirCrda.jsf',
  pge_sp_debitos:  'https://www.dividaativa.pge.sp.gov.br/sc/pages/consultas/consultarDebito.jsf',
  cadin_sp:        'https://www.fazenda.sp.gov.br/cadin_estadual/pages/publ/cadin.aspx',
  conta_fiscal:    'https://portal.fazenda.sp.gov.br/servicos/cficms',
  ecredac:         'https://portal.fazenda.sp.gov.br/servicos/credito-acumulado',
  sintegra_sp:     'https://portal.fazenda.sp.gov.br/servicos/icms/Paginas/Sintegra.aspx',
} as const

/**
 * Busca resultado no cache. Retorna null se expirado ou inexistente.
 */
export async function getCachedConsulta<T>(
  supabase: ReturnType<typeof createClient>,
  tipo: ConsultaTipo,
  chave: string
): Promise<T | null> {
  const { data } = await supabase
    .from('consultas_publicas_cache')
    .select('dados, valido_ate')
    .eq('tipo', tipo)
    .eq('chave', chave)
    .single()

  if (!data) return null

  const agora = new Date()
  const validade = new Date(data.valido_ate)
  if (agora > validade) return null

  return data.dados as T
}

/**
 * Salva resultado no cache com TTL baseado no tipo.
 */
export async function setCachedConsulta(
  supabase: ReturnType<typeof createClient>,
  tipo: ConsultaTipo,
  chave: string,
  dados: Record<string, unknown>,
  fonteUrl?: string,
  userId?: string
): Promise<void> {
  const ttl = CACHE_TTL[tipo]
  const valido_ate = new Date(Date.now() + ttl * 1000).toISOString()

  await supabase
    .from('consultas_publicas_cache')
    .upsert({
      tipo,
      chave,
      dados,
      fonte_url: fonteUrl,
      valido_ate,
      consultado_em: new Date().toISOString(),
      consultado_por: userId || null,
    }, { onConflict: 'tipo,chave' })
}

/**
 * Limpa entradas expiradas do cache.
 */
export async function limparCacheExpirado(
  supabase: ReturnType<typeof createClient>
): Promise<number> {
  const { data } = await supabase
    .from('consultas_publicas_cache')
    .delete()
    .lt('valido_ate', new Date().toISOString())
    .select('id')

  return data?.length || 0
}

// ---- Score Relius v2 Calculator ----

export function calcularScoreRelius(dd: DueDiligenceResult): DueDiligenceResult['score'] {
  let ecredac = 0
  let regularidade = 0
  let cadastral = 0
  const plataforma = 0 // preenchido externamente com dados da plataforma

  // Componente cadastral (max 20)
  if (dd.cadesp) {
    if (dd.cadesp.situacao_cadastral === 'ATIVO') cadastral += 10
    if (dd.cadesp.regime_apuracao === 'RPA') cadastral += 5

    const inicio = new Date(dd.cadesp.data_inicio_atividade)
    const anosAtividade = (Date.now() - inicio.getTime()) / (365.25 * 24 * 3600 * 1000)
    if (anosAtividade >= 5) cadastral += 5
    else if (anosAtividade >= 2) cadastral += 3
    else cadastral += 1
  }

  // Componente regularidade (max 25)
  if (dd.cnd_federal) {
    if (dd.cnd_federal.situacao === 'NEGATIVA') regularidade += 10
    else if (dd.cnd_federal.situacao === 'POSITIVA_COM_EFEITO') regularidade += 5
  }
  if (dd.cnd_estadual) {
    if (dd.cnd_estadual.certidao_situacao === 'NEGATIVA') regularidade += 8
    else if (dd.cnd_estadual.certidao_situacao === 'POSITIVA_COM_EFEITO') regularidade += 4
  }
  if (dd.cadin) {
    regularidade += dd.cadin.inscrito ? -5 : 5
  }
  if (dd.conta_fiscal) {
    if (dd.conta_fiscal.situacao_geral === 'REGULAR') regularidade += 2
    else if (dd.conta_fiscal.situacao_geral === 'IRREGULAR') regularidade -= 5
  }

  // Clamp
  regularidade = Math.max(0, Math.min(25, regularidade))
  cadastral = Math.max(0, Math.min(20, cadastral))

  const total = ecredac + regularidade + cadastral + plataforma
  const grade = total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : total >= 40 ? 'D' : 'E'

  return { ecredac, regularidade, cadastral, plataforma, total, grade }
}

// ---- Due Diligence Engine ----

/**
 * Executa due diligence completa para um CNPJ.
 * Consulta todas as bases públicas e calcula o Score Relius v2.
 * Para a Sprint 1, retorna dados do cache quando disponíveis.
 */
export async function executarDueDiligence(
  supabase: ReturnType<typeof createClient>,
  cnpj: string,
  userId?: string
): Promise<DueDiligenceResult> {
  // Buscar dados do cache
  const [cadesp, cnd_federal, cnd_estadual, cadin, conta_fiscal] = await Promise.all([
    getCachedConsulta<CadespData>(supabase, 'cadesp', cnpj),
    getCachedConsulta<CndData>(supabase, 'cnd_federal', cnpj),
    getCachedConsulta<DebitoEstadualData>(supabase, 'cnd_estadual', cnpj),
    getCachedConsulta<CadinData>(supabase, 'cadin', cnpj),
    getCachedConsulta<ContaFiscalData>(supabase, 'conta_fiscal', cnpj),
  ])

  // Verificar bloqueios
  const motivos_bloqueio: string[] = []

  if (cadesp?.situacao_cadastral && cadesp.situacao_cadastral !== 'ATIVO') {
    motivos_bloqueio.push('CADESP: situacao ' + cadesp.situacao_cadastral)
  }
  if (cadesp?.regime_apuracao && cadesp.regime_apuracao !== 'RPA') {
    motivos_bloqueio.push('CADESP: regime ' + cadesp.regime_apuracao + ' (requer RPA)')
  }
  if (cnd_federal?.situacao === 'POSITIVA') {
    motivos_bloqueio.push('CND Federal: POSITIVA (débitos federais)')
  }
  if (cnd_estadual?.tem_debitos) {
    motivos_bloqueio.push('PGE-SP: débitos em dívida ativa estadual')
  }
  if (cadin?.inscrito) {
    motivos_bloqueio.push('CADIN-SP: empresa inscrita')
  }
  if (conta_fiscal?.situacao_geral === 'IRREGULAR') {
    motivos_bloqueio.push('Conta Fiscal ICMS: situação IRREGULAR')
  }

  const result: DueDiligenceResult = {
    cnpj,
    cadesp,
    cnd_federal,
    cnd_estadual,
    cadin,
    conta_fiscal,
    apto_transacao: motivos_bloqueio.length === 0,
    motivos_bloqueio,
    score: { ecredac: 0, regularidade: 0, cadastral: 0, plataforma: 0, total: 0, grade: 'E' },
  }

  result.score = calcularScoreRelius(result)

  // Persistir resultado
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('cnpj', cnpj)
    .maybeSingle()

  if (company) {
    await supabase.from('due_diligence_results').upsert({
      company_id: company.id,
      cnpj,
      cadesp_situacao: cadesp?.situacao_cadastral,
      cadesp_regime: cadesp?.regime_apuracao,
      cadesp_ie: cadesp?.inscricao_estadual,
      cadesp_consultado_em: cadesp?.consulta_em,
      cnd_federal_situacao: cnd_federal?.situacao,
      cnd_federal_validade: cnd_federal?.data_validade,
      cnd_federal_consultado_em: cnd_federal?.consulta_em,
      cnd_estadual_situacao: cnd_estadual?.certidao_situacao,
      cnd_estadual_tem_debitos: cnd_estadual?.tem_debitos,
      cnd_estadual_consultado_em: cnd_estadual?.consulta_em,
      cadin_inscrito: cadin?.inscrito,
      cadin_consultado_em: cadin?.consulta_em,
      conta_fiscal_situacao: conta_fiscal?.situacao_geral,
      conta_fiscal_debitos_abertos: conta_fiscal?.debitos_nao_inscritos,
      conta_fiscal_consultado_em: conta_fiscal?.consulta_em,
      score_ecredac: result.score.ecredac,
      score_regularidade: result.score.regularidade,
      score_cadastral: result.score.cadastral,
      score_plataforma: result.score.plataforma,
      apto_transacao: result.apto_transacao,
      motivos_bloqueio: result.motivos_bloqueio,
    }, { onConflict: 'company_id' })
  }

  return result
}
