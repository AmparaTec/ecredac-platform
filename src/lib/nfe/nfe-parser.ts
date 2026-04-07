/**
 * NF-e XML Parser
 * Extracts structured data from NF-e XML files for ICMS credit crossing
 */

export interface NfeHeader {
  chaveNfe: string
  numeroNfe: string
  serie: string
  dataEmissao: string
  naturezaOperacao: string
  cnpjEmitente: string
  nomeEmitente: string
  ufEmitente: string
  cnpjDestinatario: string
  nomeDestinatario: string
  ufDestinatario: string
  valorTotal: number
  valorIcms: number
  baseCalculoIcms: number
}

export interface NfeItem {
  numeroItem: number
  codigoProduto: string
  descricaoProduto: string
  ncm: string
  cfop: string
  unidade: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  baseCalculoIcms: number
  aliquotaIcms: number
  valorIcms: number
  cstIcms: string
}

export interface NfeParsed {
  header: NfeHeader
  itens: NfeItem[]
  xmlOriginal: string
}

/**
 * Simple XML tag extractor (no external dependency)
 */
function getTag(xml: string, tag: string): string {
  // Try with namespace prefix first
  const nsPatterns = [
    new RegExp(`<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, 'i'),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'),
  ]
  for (const pattern of nsPatterns) {
    const match = xml.match(pattern)
    if (match) return match[1].trim()
  }
  return ''
}

function getTagNum(xml: string, tag: string): number {
  const val = getTag(xml, tag)
  return val ? parseFloat(val) || 0 : 0
}

/**
 * Extract chave de acesso from protNFe or infNFe
 */
function extractChave(xml: string): string {
  // From protNFe
  const chProt = getTag(xml, 'chNFe')
  if (chProt && chProt.length === 44) return chProt

  // From infNFe Id attribute
  const idMatch = xml.match(/Id="NFe(\d{44})"/)
  if (idMatch) return idMatch[1]

  return ''
}

/**
 * Parse NF-e XML string into structured data
 */
export function parseNfeXml(xmlString: string): NfeParsed {
  const xml = xmlString

  // Extract header data
  const ide = getTag(xml, 'ide')
  const emit = getTag(xml, 'emit')
  const dest = getTag(xml, 'dest')
  const icmsTot = getTag(xml, 'ICMSTot')

  const header: NfeHeader = {
    chaveNfe: extractChave(xml),
    numeroNfe: getTag(ide, 'nNF'),
    serie: getTag(ide, 'serie'),
    dataEmissao: getTag(ide, 'dhEmi') || getTag(ide, 'dEmi'),
    naturezaOperacao: getTag(ide, 'natOp'),
    cnpjEmitente: getTag(emit, 'CNPJ'),
    nomeEmitente: getTag(emit, 'xNome'),
    ufEmitente: getTag(getTag(emit, 'enderEmit'), 'UF'),
    cnpjDestinatario: getTag(dest, 'CNPJ'),
    nomeDestinatario: getTag(dest, 'xNome'),
    ufDestinatario: getTag(getTag(dest, 'enderDest'), 'UF'),
    valorTotal: getTagNum(icmsTot, 'vNF'),
    valorIcms: getTagNum(icmsTot, 'vICMS'),
    baseCalculoIcms: getTagNum(icmsTot, 'vBC'),
  }

  // Extract items
  const itens: NfeItem[] = []
  const detMatches = xml.matchAll(/<det\s+nItem="(\d+)"[^>]*>([\s\S]*?)<\/det>/gi)

  for (const match of detMatches) {
    const nItem = parseInt(match[1])
    const detXml = match[2]
    const prod = getTag(detXml, 'prod')
    const imposto = getTag(detXml, 'imposto')
    const icms = getTag(imposto, 'ICMS')

    // ICMS can be in different tags: ICMS00, ICMS10, ICMS20, etc.
    const icmsInner = icms.match(/<ICMS\d{2}>([\s\S]*?)<\/ICMS\d{2}>/)?.[1] || icms

    itens.push({
      numeroItem: nItem,
      codigoProduto: getTag(prod, 'cProd'),
      descricaoProduto: getTag(prod, 'xProd'),
      ncm: getTag(prod, 'NCM'),
      cfop: getTag(prod, 'CFOP'),
      unidade: getTag(prod, 'uCom'),
      quantidade: getTagNum(prod, 'qCom'),
      valorUnitario: getTagNum(prod, 'vUnCom'),
      valorTotal: getTagNum(prod, 'vProd'),
      baseCalculoIcms: getTagNum(icmsInner, 'vBC'),
      aliquotaIcms: getTagNum(icmsInner, 'pICMS'),
      valorIcms: getTagNum(icmsInner, 'vICMS'),
      cstIcms: getTag(icmsInner, 'CST') || getTag(icmsInner, 'CSOSN'),
    })
  }

  return { header, itens, xmlOriginal: xmlString }
}

/**
 * Parse multiple NF-e XMLs from a batch upload
 */
export function parseNfeXmlBatch(xmlStrings: string[]): NfeParsed[] {
  return xmlStrings.map(parseNfeXml).filter(nfe => nfe.header.chaveNfe)
}

/**
 * Validate parsed NF-e data for ICMS crossing
 */
export function validateNfeForIcms(nfe: NfeParsed): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!nfe.header.chaveNfe || nfe.header.chaveNfe.length !== 44) {
    errors.push('Chave de acesso inválida ou ausente')
  }
  if (!nfe.header.cnpjEmitente) {
    errors.push('CNPJ do emitente não encontrado')
  }
  if (nfe.header.valorIcms <= 0) {
    warnings.push('NF-e sem valor de ICMS destacado')
  }
  if (nfe.itens.length === 0) {
    warnings.push('Nenhum item encontrado na NF-e')
  }

  // Check CFOP patterns for operações que geram crédito ICMS
  const cfopsCredito = ['1', '2', '3'] // Entradas
  const hasCfopEntrada = nfe.itens.some(item => {
    const firstDigit = item.cfop?.charAt(0)
    return cfopsCredito.includes(firstDigit)
  })
  if (!hasCfopEntrada) {
    warnings.push('Nenhum item com CFOP de entrada (crédito ICMS)')
  }

  return { valid: errors.length === 0, errors, warnings }
}
