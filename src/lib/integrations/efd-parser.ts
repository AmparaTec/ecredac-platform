/**
 * EFD-Contribuições Parser — Trilho A (Federal)
 *
 * Faz parse de arquivos SPED EFD-Contribuições (texto posicional)
 * e extrai dados de créditos PIS/COFINS acumulados.
 *
 * Referência: Guia Prático EFD-Contribuições v1.35 (RFB)
 *
 * Blocos relevantes:
 * - Bloco 0: Abertura e identificação
 * - Bloco C: Documentos fiscais (NF-e)
 * - Bloco D: Documentos fiscais (serviços)
 * - Bloco M: Apuração PIS/COFINS (core)
 * - Bloco 9: Controle e encerramento
 */

import { createServerSupabase } from '@/lib/supabase/server'

// ============================================================
// TYPES
// ============================================================

export interface EfdHeader {
  tipo_escrituracao: string   // 0=Original, 1=Retificadora
  cnpj: string
  razao_social: string
  periodo_inicio: string      // DDMMYYYY
  periodo_fim: string         // DDMMYYYY
  codigo_municipio: string
  uf: string
  indicador_atividade: string // 0=Industrial, 1=Outros
}

export interface EfdRegistroC100 {
  tipo_operacao: string       // 0=Entrada, 1=Saída
  tipo_emitente: string       // 0=Próprio, 1=Terceiro
  cnpj_participante: string
  modelo_documento: string    // 55=NF-e, 65=NFC-e
  chave_nfe: string
  data_emissao: string
  valor_total: number
  valor_mercadoria: number
  // PIS
  cst_pis: string
  valor_base_pis: number
  aliquota_pis: number
  valor_pis: number
  // COFINS
  cst_cofins: string
  valor_base_cofins: number
  aliquota_cofins: number
  valor_cofins: number
}

export interface EfdApuracaoM200 {
  // M200 - Apuração PIS
  total_creditos_pis: number
  total_debitos_pis: number
  credito_disponivel_pis: number
  saldo_credor_periodo_anterior_pis: number
  saldo_credor_pis: number
}

export interface EfdApuracaoM600 {
  // M600 - Apuração COFINS
  total_creditos_cofins: number
  total_debitos_cofins: number
  credito_disponivel_cofins: number
  saldo_credor_periodo_anterior_cofins: number
  saldo_credor_cofins: number
}

export interface EfdParseResult {
  header: EfdHeader
  registros_c100: EfdRegistroC100[]
  apuracao_pis: EfdApuracaoM200 | null
  apuracao_cofins: EfdApuracaoM600 | null
  resumo: {
    total_creditos_pis: number
    total_creditos_cofins: number
    total_debitos_pis: number
    total_debitos_cofins: number
    saldo_credor_pis: number
    saldo_credor_cofins: number
    saldo_credor_total: number
    qtd_nfe_entrada: number
    qtd_nfe_saida: number
    qtd_registros_c: number
    qtd_registros_d: number
    periodo: string
  }
  erros: string[]
}

// ============================================================
// CSTs de crédito PIS/COFINS (permitem apropriação de crédito)
// ============================================================

const CST_CREDITO_PIS = ['50', '51', '52', '53', '54', '55', '56', '60', '61', '62', '63', '64', '65', '66', '67']
const CST_CREDITO_COFINS = CST_CREDITO_PIS // Mesmos CSTs

// ============================================================
// PARSER
// ============================================================

function parseField(line: string, campos: number[], index: number): string {
  // EFD usa pipe-delimited: |REG|CAMPO1|CAMPO2|...|
  const parts = line.split('|')
  // parts[0] é vazio (antes do primeiro pipe)
  // parts[1] é o REG
  // parts[2+] são os campos
  return (parts[index + 1] || '').trim()
}

function parseDecimal(value: string): number {
  if (!value || value.trim() === '') return 0
  // SPED usa vírgula como separador decimal
  return parseFloat(value.replace(',', '.')) || 0
}

export function parseEfdContribuicoes(content: string): EfdParseResult {
  const lines = content.split('\n').filter(l => l.trim().length > 0)
  const erros: string[] = []

  let header: EfdHeader = {
    tipo_escrituracao: '',
    cnpj: '',
    razao_social: '',
    periodo_inicio: '',
    periodo_fim: '',
    codigo_municipio: '',
    uf: '',
    indicador_atividade: '',
  }

  const registros_c100: EfdRegistroC100[] = []
  let apuracao_pis: EfdApuracaoM200 | null = null
  let apuracao_cofins: EfdApuracaoM600 | null = null

  let qtd_registros_d = 0
  let currentC100: Partial<EfdRegistroC100> | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const parts = line.split('|')
    const reg = (parts[1] || '').trim()

    try {
      switch (reg) {
        // ---- Bloco 0: Abertura ----
        case '0000': {
          // |0000|TIPO_ESCRIT|...|DT_INI|DT_FIN|NOME|CNPJ|UF|COD_MUN|...|IND_ATIV|
          header.tipo_escrituracao = parseField(line, [], 2)
          header.periodo_inicio = parseField(line, [], 4)
          header.periodo_fim = parseField(line, [], 5)
          header.razao_social = parseField(line, [], 6)
          header.cnpj = parseField(line, [], 7)
          header.uf = parseField(line, [], 8)
          header.codigo_municipio = parseField(line, [], 9)
          header.indicador_atividade = parseField(line, [], 13)
          break
        }

        // ---- Bloco C: Documentos Fiscais (NF-e) ----
        case 'C100': {
          // |C100|IND_OPER|IND_EMIT|COD_PART|COD_MOD|...|CHV_NFE|DT_EMISSAO|...|VL_DOC|...|VL_MERC|
          currentC100 = {
            tipo_operacao: parseField(line, [], 2),
            tipo_emitente: parseField(line, [], 3),
            cnpj_participante: parseField(line, [], 4),
            modelo_documento: parseField(line, [], 5),
            chave_nfe: parseField(line, [], 9),
            data_emissao: parseField(line, [], 10),
            valor_total: parseDecimal(parseField(line, [], 12)),
            valor_mercadoria: parseDecimal(parseField(line, [], 16)),
            cst_pis: '',
            valor_base_pis: 0,
            aliquota_pis: 0,
            valor_pis: 0,
            cst_cofins: '',
            valor_base_cofins: 0,
            aliquota_cofins: 0,
            valor_cofins: 0,
          }
          break
        }

        // C170: Itens do documento (detalhes de PIS/COFINS por item)
        case 'C170': {
          if (currentC100) {
            const cst_pis = parseField(line, [], 25)
            const vl_bc_pis = parseDecimal(parseField(line, [], 26))
            const aliq_pis = parseDecimal(parseField(line, [], 27))
            const vl_pis = parseDecimal(parseField(line, [], 29))
            const cst_cofins = parseField(line, [], 30)
            const vl_bc_cofins = parseDecimal(parseField(line, [], 31))
            const aliq_cofins = parseDecimal(parseField(line, [], 32))
            const vl_cofins = parseDecimal(parseField(line, [], 34))

            // Acumular no C100 pai
            if (CST_CREDITO_PIS.includes(cst_pis)) {
              currentC100.cst_pis = cst_pis
              currentC100.valor_base_pis = (currentC100.valor_base_pis || 0) + vl_bc_pis
              currentC100.aliquota_pis = aliq_pis
              currentC100.valor_pis = (currentC100.valor_pis || 0) + vl_pis
            }
            if (CST_CREDITO_COFINS.includes(cst_cofins)) {
              currentC100.cst_cofins = cst_cofins
              currentC100.valor_base_cofins = (currentC100.valor_base_cofins || 0) + vl_bc_cofins
              currentC100.aliquota_cofins = aliq_cofins
              currentC100.valor_cofins = (currentC100.valor_cofins || 0) + vl_cofins
            }
          }
          break
        }

        // Quando encontra próximo C100 ou fim do bloco, salva o anterior
        case 'C190':
        case 'C990': {
          if (currentC100 && currentC100.chave_nfe) {
            registros_c100.push(currentC100 as EfdRegistroC100)
          }
          currentC100 = null
          break
        }

        // ---- Bloco D: Serviços ----
        case 'D100':
        case 'D500': {
          qtd_registros_d++
          break
        }

        // ---- Bloco M: Apuração PIS ----
        case 'M200': {
          // |M200|VL_TOT_CONT_NC_PER|VL_TOT_CRED_DESC|...|VL_TOT_CONT_NC_DEV|...|VL_TOT_CRED_DESC_ANT|...|
          apuracao_pis = {
            total_debitos_pis: parseDecimal(parseField(line, [], 2)),
            total_creditos_pis: parseDecimal(parseField(line, [], 3)),
            credito_disponivel_pis: parseDecimal(parseField(line, [], 5)),
            saldo_credor_periodo_anterior_pis: parseDecimal(parseField(line, [], 7)),
            saldo_credor_pis: parseDecimal(parseField(line, [], 9)),
          }
          break
        }

        // ---- Bloco M: Apuração COFINS ----
        case 'M600': {
          // |M600|VL_TOT_CONT_NC_PER|VL_TOT_CRED_DESC|...|
          apuracao_cofins = {
            total_debitos_cofins: parseDecimal(parseField(line, [], 2)),
            total_creditos_cofins: parseDecimal(parseField(line, [], 3)),
            credito_disponivel_cofins: parseDecimal(parseField(line, [], 5)),
            saldo_credor_periodo_anterior_cofins: parseDecimal(parseField(line, [], 7)),
            saldo_credor_cofins: parseDecimal(parseField(line, [], 9)),
          }
          break
        }
      }
    } catch (e) {
      erros.push('Erro na linha ' + (i + 1) + ' (reg ' + reg + '): ' + String(e))
    }
  }

  // Salvar último C100 se existir
  if (currentC100 && currentC100.chave_nfe) {
    registros_c100.push(currentC100 as EfdRegistroC100)
  }

  // Calcular resumo
  const total_creditos_pis = apuracao_pis?.total_creditos_pis || 0
  const total_creditos_cofins = apuracao_cofins?.total_creditos_cofins || 0
  const total_debitos_pis = apuracao_pis?.total_debitos_pis || 0
  const total_debitos_cofins = apuracao_cofins?.total_debitos_cofins || 0
  const saldo_credor_pis = apuracao_pis?.saldo_credor_pis || 0
  const saldo_credor_cofins = apuracao_cofins?.saldo_credor_cofins || 0

  const qtd_nfe_entrada = registros_c100.filter(r => r.tipo_operacao === '0').length
  const qtd_nfe_saida = registros_c100.filter(r => r.tipo_operacao === '1').length

  // Formatar período
  const dtIni = header.periodo_inicio
  const periodo = dtIni.length === 8
    ? dtIni.substring(4, 8) + '-' + dtIni.substring(2, 4)
    : 'indefinido'

  // Validações básicas
  if (!header.cnpj) erros.push('CNPJ nao encontrado no registro 0000')
  if (!header.periodo_inicio) erros.push('Periodo de inicio nao encontrado')
  if (!apuracao_pis && !apuracao_cofins) erros.push('Registros M200/M600 de apuracao nao encontrados')
  if (header.tipo_escrituracao === '1') erros.push('ATENCAO: EFD retificadora (tipo=1)')

  return {
    header,
    registros_c100,
    apuracao_pis,
    apuracao_cofins,
    resumo: {
      total_creditos_pis,
      total_creditos_cofins,
      total_debitos_pis,
      total_debitos_cofins,
      saldo_credor_pis,
      saldo_credor_cofins,
      saldo_credor_total: saldo_credor_pis + saldo_credor_cofins,
      qtd_nfe_entrada,
      qtd_nfe_saida,
      qtd_registros_c: registros_c100.length,
      qtd_registros_d,
      periodo,
    },
    erros,
  }
}

// ============================================================
// SCORE DE VERIFICAÇÃO
// ============================================================

export interface ScoreVerificacao {
  score: number             // 0-100
  nivel: 'baixo' | 'medio' | 'alto' | 'verificado'
  fatores: {
    nome: string
    peso: number
    valor: number
    detalhe: string
  }[]
  riscos: string[]
}

export function calcularScoreVerificacao(
  parseResult: EfdParseResult,
  nfeValidadas: number,
  nfeTotal: number
): ScoreVerificacao {
  const fatores: ScoreVerificacao['fatores'] = []
  const riscos: string[] = []

  // Fator 1: EFD parseada com sucesso (20 pontos)
  const efdOk = parseResult.erros.filter(e => !e.startsWith('ATENCAO')).length === 0
  fatores.push({
    nome: 'EFD valida',
    peso: 20,
    valor: efdOk ? 20 : 5,
    detalhe: efdOk ? 'EFD parseada sem erros' : parseResult.erros.length + ' erros encontrados',
  })

  // Fator 2: Registros M200/M600 presentes (15 pontos)
  const temApuracao = !!parseResult.apuracao_pis || !!parseResult.apuracao_cofins
  fatores.push({
    nome: 'Apuracao presente',
    peso: 15,
    valor: temApuracao ? 15 : 0,
    detalhe: temApuracao ? 'M200/M600 encontrados' : 'Sem registros de apuracao',
  })

  // Fator 3: Saldo credor positivo (20 pontos)
  const saldoPositivo = parseResult.resumo.saldo_credor_total > 0
  fatores.push({
    nome: 'Saldo credor positivo',
    peso: 20,
    valor: saldoPositivo ? 20 : 0,
    detalhe: saldoPositivo
      ? 'R$ ' + parseResult.resumo.saldo_credor_total.toFixed(2)
      : 'Sem saldo credor',
  })

  // Fator 4: Cruzamento NF-e (30 pontos)
  const percNfe = nfeTotal > 0 ? (nfeValidadas / nfeTotal) * 100 : 0
  const pontosNfe = nfeTotal > 0 ? Math.round((percNfe / 100) * 30) : 0
  fatores.push({
    nome: 'Cruzamento NF-e',
    peso: 30,
    valor: pontosNfe,
    detalhe: nfeTotal > 0
      ? nfeValidadas + '/' + nfeTotal + ' NF-e validadas (' + percNfe.toFixed(1) + '%)'
      : 'Nenhuma NF-e para cruzar',
  })

  // Fator 5: Não é retificadora (15 pontos)
  const ehOriginal = parseResult.header.tipo_escrituracao !== '1'
  fatores.push({
    nome: 'Escrituracao original',
    peso: 15,
    valor: ehOriginal ? 15 : 5,
    detalhe: ehOriginal ? 'EFD original' : 'EFD retificadora (risco elevado)',
  })
  if (!ehOriginal) riscos.push('EFD retificadora — risco de contestacao pela RFB')

  // Calcular score total
  const score = fatores.reduce((sum, f) => sum + f.valor, 0)

  // Riscos adicionais
  if (parseResult.resumo.qtd_nfe_entrada < 5) {
    riscos.push('Poucas NF-e de entrada — base de creditos concentrada')
  }
  if (percNfe < 70 && nfeTotal > 0) {
    riscos.push('Menos de 70% das NF-e foram validadas no cruzamento')
  }

  // Determinar nível
  const nivel = score >= 85 ? 'verificado'
    : score >= 65 ? 'alto'
    : score >= 40 ? 'medio'
    : 'baixo'

  return { score, nivel, fatores, riscos }
}

// ============================================================
// HELPERS DE PERSISTÊNCIA
// ============================================================

export async function salvarParseResult(
  supabase: ReturnType<typeof createServerSupabase>,
  uploadId: string,
  result: EfdParseResult
) {
  const { error } = await supabase
    .from('efd_uploads')
    .update({
      cnpj: result.header.cnpj,
      razao_social: result.header.razao_social,
      periodo_inicio: formatSpedDate(result.header.periodo_inicio),
      periodo_fim: formatSpedDate(result.header.periodo_fim),
      tipo_escrituracao: result.header.tipo_escrituracao === '1' ? 'Retificadora' : 'Original',
      status: result.erros.filter(e => !e.startsWith('ATENCAO')).length > 0 ? 'error' : 'parsed',
      error_message: result.erros.length > 0 ? result.erros.join('; ') : null,
      total_creditos_pis: result.resumo.total_creditos_pis,
      total_creditos_cofins: result.resumo.total_creditos_cofins,
      total_debitos_pis: result.resumo.total_debitos_pis,
      total_debitos_cofins: result.resumo.total_debitos_cofins,
      saldo_credor_pis: result.resumo.saldo_credor_pis,
      saldo_credor_cofins: result.resumo.saldo_credor_cofins,
      qtd_registros_c: result.resumo.qtd_registros_c,
      qtd_registros_d: result.resumo.qtd_registros_d,
      parsed_data: {
        header: result.header,
        resumo: result.resumo,
        apuracao_pis: result.apuracao_pis,
        apuracao_cofins: result.apuracao_cofins,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', uploadId)

  if (error) throw new Error('Erro ao salvar parse result: ' + error.message)

  // Inserir registros de NF-e para cruzamento futuro
  if (result.registros_c100.length > 0) {
    const nfeRecords = result.registros_c100
      .filter(r => r.chave_nfe && r.chave_nfe.length > 0)
      .map(r => ({
        efd_upload_id: uploadId,
        chave_nfe: r.chave_nfe,
        numero_nfe: r.chave_nfe.substring(25, 34),
        serie: r.chave_nfe.substring(22, 25),
        cnpj_emitente: r.tipo_emitente === '0' ? result.header.cnpj : r.cnpj_participante,
        cnpj_destinatario: r.tipo_emitente === '0' ? r.cnpj_participante : result.header.cnpj,
        data_emissao: r.data_emissao ? formatSpedDate(r.data_emissao) : null,
        valor_total: r.valor_total,
        credito_pis_declarado: r.valor_pis,
        credito_cofins_declarado: r.valor_cofins,
        status: 'pendente',
      }))

    if (nfeRecords.length > 0) {
      // Insert em batches de 100
      for (let i = 0; i < nfeRecords.length; i += 100) {
        const batch = nfeRecords.slice(i, i + 100)
        await supabase.from('nfe_cruzamentos').insert(batch)
      }
    }
  }
}

function formatSpedDate(spedDate: string): string | null {
  // DDMMYYYY → YYYY-MM-DD
  if (!spedDate || spedDate.length !== 8) return null
  return spedDate.substring(4, 8) + '-' + spedDate.substring(2, 4) + '-' + spedDate.substring(0, 2)
}
