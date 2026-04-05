import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format BRL currency
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Format number with locale
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

// Format date
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

// Format CNPJ
export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '')
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
}

// Validate CNPJ
export function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return false
  if (/^(\d)\1+$/.test(digits)) return false

  let sum = 0
  let weight = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weight[i]
  let remainder = sum % 11
  const digit1 = remainder < 2 ? 0 : 11 - remainder

  sum = 0
  weight = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weight[i]
  remainder = sum % 11
  const digit2 = remainder < 2 ? 0 : 11 - remainder

  return parseInt(digits[12]) === digit1 && parseInt(digits[13]) === digit2
}

// CNPJ mask for input
export function cnpjMask(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18)
}

// Urgency label/color
export const urgencyConfig = {
  high: { label: 'Alta', color: 'text-red-700', bg: 'bg-red-50', badge: 'bg-red-100 text-red-800' },
  medium: { label: 'Média', color: 'text-amber-700', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-800' },
  low: { label: 'Baixa', color: 'text-blue-700', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-800' },
}

// Credit type labels (conforme Art. 71 e 81 RICMS/SP)
export const creditTypeLabels: Record<string, string> = {
  acumulado: 'Crédito Acumulado',
  st: 'Subst. Tributária',
  rural: 'Produtor Rural',
  outorgado: 'Crédito Outorgado',
}

// Credit origin labels (hipóteses do Art. 71 RICMS/SP)
export const creditOriginLabels: Record<string, string> = {
  exportacao: 'Exportação (Art. 7º, V)',
  diferimento: 'Diferimento',
  aliquota_reduzida: 'Alíquota Reduzida',
  isencao: 'Isenção / Não Incidência',
  substituicao_tributaria: 'Subst. Tributária',
  aliquotas_diversificadas: 'Alíquotas Diversificadas',
}

// Modalidade de apropriação (Portaria SRE 65/2023)
export const apropriacaoModalidadeConfig: Record<string, { label: string; badge: string; description: string; limite: string }> = {
  simplificado: {
    label: 'Apuração Simplificada',
    badge: 'bg-blue-100 text-blue-800',
    description: 'Custo estimado com Percentual Médio de Crédito',
    limite: 'Até 10.000 UFESPs/mês (~R$ 353.600)',
  },
  custeio: {
    label: 'Sistemática de Custeio',
    badge: 'bg-purple-100 text-purple-800',
    description: 'Mapeamento completo de custos — acompanha fluxo do ICMS desde entrada até saída',
    limite: 'Sem limite de valor',
  },
}

// Status do arquivo digital e-CredAc
export const arquivoDigitalStatusConfig: Record<string, { label: string; badge: string }> = {
  nao_enviado: { label: 'Não Enviado', badge: 'bg-gray-100 text-gray-600' },
  transmitido: { label: 'Transmitido via TED', badge: 'bg-blue-100 text-blue-800' },
  pre_validado: { label: 'Pré-validado', badge: 'bg-cyan-100 text-cyan-800' },
  acolhido: { label: 'Acolhido pela SEFAZ', badge: 'bg-emerald-100 text-emerald-800' },
  rejeitado: { label: 'Rejeitado', badge: 'bg-red-100 text-red-800' },
}

// Homologation status (etapas da apropriação no e-CredAc)
export const homologationConfig: Record<string, { label: string; badge: string; description: string }> = {
  pendente: { label: 'Pendente', badge: 'bg-gray-100 text-gray-800', description: 'Aguardando envio do arquivo digital' },
  arquivo_enviado: { label: 'Arquivo Enviado', badge: 'bg-blue-100 text-blue-800', description: 'Arquivo digital transmitido à SEFAZ' },
  em_analise: { label: 'Em Análise Fiscal', badge: 'bg-amber-100 text-amber-800', description: 'SEFAZ analisando — cruzamento eletrônico de dados' },
  deferido: { label: 'Deferido', badge: 'bg-emerald-100 text-emerald-800', description: 'Apropriação autorizada — crédito na conta corrente' },
  deferido_condicional: { label: 'Deferido sob Condição', badge: 'bg-yellow-100 text-yellow-800', description: 'Aprovado com condições a cumprir' },
  indeferido: { label: 'Indeferido', badge: 'bg-red-100 text-red-800', description: 'Apropriação negada pela SEFAZ' },
  homologado: { label: 'Homologado', badge: 'bg-emerald-100 text-emerald-800', description: 'Crédito homologado e disponível em conta corrente' },
  rejeitado: { label: 'Rejeitado', badge: 'bg-red-100 text-red-800', description: 'Crédito rejeitado pela autoridade fiscal' },
}

// Status da conta corrente e-CredAc (Art. 4º, I, Portaria SRE 65/2023)
export const contaCorrenteStatusConfig: Record<string, { label: string; badge: string; description: string }> = {
  ativa: { label: 'Ativa', badge: 'bg-emerald-100 text-emerald-800', description: 'Conta corrente regular — crédito disponível para transferência' },
  bloqueada: { label: 'Bloqueada', badge: 'bg-red-100 text-red-800', description: 'Conta bloqueada — regularizar via SIPET' },
  sem_saldo: { label: 'Sem Saldo', badge: 'bg-gray-100 text-gray-600', description: 'Sem saldo disponível em conta corrente' },
}

// Motivos de bloqueio da conta corrente (Art. 4º Portaria SRE 65/2023)
export const motivosBloqueioContaCorrente: Record<string, string> = {
  ie_suspensa: 'IE suspensa ou inapta no Cadastro de Contribuintes',
  dados_desatualizados: 'Dados desatualizados no Cadastro de Contribuintes',
  debito_fiscal: 'Débito fiscal do ICMS (Art. 82 RICMS)',
  omissao_gia: 'Omissão na apresentação de GIA ou EFD',
  gia_substitutiva: 'GIA substitutiva ou retificação de EFD com alteração de saldo credor',
  irregularidade_efd: 'Omissão ou irregularidade na EFD (SPED Fiscal)',
  reincorporacao_pendente: 'Descumprimento de obrigação de reincorporação de crédito',
  lancamento_oficio: 'Lançamento de ofício em elaboração (implicaria débito)',
  apropriacao_irregular: 'Apropriação de crédito em desacordo com a legislação',
  deferimento_condicional: 'Condição de deferimento não satisfeita',
  parcelamento_pendente: 'Parcelas vincendas de débitos parcelados sem pedido de liquidação',
}

// Natureza da transferência (Art. 73 RICMS/SP)
export const naturezaTransferenciaConfig: Record<string, { label: string; description: string; badge: string }> = {
  interdependente: {
    label: 'Estabelecimento Interdependente',
    description: 'Transferência entre empresas do mesmo grupo econômico (Art. 73, II)',
    badge: 'bg-indigo-100 text-indigo-800',
  },
  fornecedor_mp: {
    label: 'Fornecedor de Matéria-Prima',
    description: 'Pagamento a fornecedor de matéria-prima, material secundário ou embalagem (Art. 73, III, a)',
    badge: 'bg-cyan-100 text-cyan-800',
  },
  fornecedor_energia: {
    label: 'Fornecedor de Energia/Combustível',
    description: 'Pagamento de energia elétrica ou combustível (Art. 73, III, b)',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  fornecedor_ativo: {
    label: 'Fornecedor de Ativo Imobilizado',
    description: 'Pagamento de bem do ativo imobilizado (Art. 73, IV)',
    badge: 'bg-orange-100 text-orange-800',
  },
  terceiros: {
    label: 'Transferência a Terceiros',
    description: 'Transferência a empresa não interdependente — requer autorização do Secretário (Art. 84, II)',
    badge: 'bg-purple-100 text-purple-800',
  },
}

// Match status
export const matchStatusConfig: Record<string, { label: string; badge: string }> = {
  proposed: { label: 'Proposto', badge: 'bg-amber-100 text-amber-800' },
  accepted_seller: { label: 'Aceito (cedente)', badge: 'bg-blue-100 text-blue-800' },
  accepted_buyer: { label: 'Aceito (cessionário)', badge: 'bg-blue-100 text-blue-800' },
  confirmed: { label: 'Confirmado', badge: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelado', badge: 'bg-red-100 text-red-800' },
  expired: { label: 'Expirado', badge: 'bg-gray-100 text-gray-800' },
}

// Credit Score config
export const creditScoreConfig: Record<string, { label: string; badge: string; color: string; description: string }> = {
  A: { label: 'A', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', color: '#059669', description: 'Excelente — baixo risco, alta liquidez' },
  B: { label: 'B', badge: 'bg-blue-100 text-blue-800 border-blue-300', color: '#2563eb', description: 'Bom — risco moderado, boa liquidez' },
  C: { label: 'C', badge: 'bg-amber-100 text-amber-800 border-amber-300', color: '#d97706', description: 'Regular — requer atenção, liquidez limitada' },
  D: { label: 'D', badge: 'bg-red-100 text-red-800 border-red-300', color: '#dc2626', description: 'Alto risco — liquidez muito baixa' },
}

// Score component labels
export const scoreComponentLabels: Record<string, string> = {
  sefaz_risk_score: 'Risco SEFAZ',
  homologation_score: 'Homologação',
  maturity_score: 'Maturidade',
  origin_score: 'Origem',
  documentation_score: 'Documentação',
  historical_score: 'Histórico',
}

// Market position config
export const marketPositionConfig: Record<string, { label: string; badge: string; icon: string; description: string }> = {
  premium: { label: 'Premium', badge: 'bg-purple-100 text-purple-800 border-purple-300', icon: '⭐', description: 'Preço acima do mercado — alta qualidade percebida' },
  acima_mercado: { label: 'Acima do Mercado', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: '↑', description: 'Preço levemente acima da média' },
  na_media: { label: 'Na Média', badge: 'bg-blue-100 text-blue-800 border-blue-300', icon: '≈', description: 'Preço alinhado com o mercado' },
  abaixo_mercado: { label: 'Abaixo do Mercado', badge: 'bg-amber-100 text-amber-800 border-amber-300', icon: '↓', description: 'Preço abaixo da média — venda mais rápida' },
}

// Confidence level config
export const confidenceConfig = (confidence: number) => {
  if (confidence >= 80) return { label: 'Alta', color: 'text-emerald-700', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-800' }
  if (confidence >= 60) return { label: 'Boa', color: 'text-blue-700', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-800' }
  if (confidence >= 40) return { label: 'Moderada', color: 'text-amber-700', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-800' }
  return { label: 'Baixa', color: 'text-red-700', bg: 'bg-red-50', badge: 'bg-red-100 text-red-800' }
}

// Format discount
export function formatDiscount(discount: number): string {
  return `${discount.toFixed(1)}%`
}

// Format price per real
export function formatPricePerReal(price: number): string {
  return `R$ ${price.toFixed(4)}`
}

// Execution task status config
export const executionTaskStatusConfig: Record<string, { label: string; badge: string; icon: string }> = {
  pending: { label: 'Pendente', badge: 'bg-gray-100 text-gray-700', icon: '○' },
  in_progress: { label: 'Em Andamento', badge: 'bg-blue-100 text-blue-800', icon: '◉' },
  completed: { label: 'Concluído', badge: 'bg-emerald-100 text-emerald-800', icon: '✓' },
  blocked: { label: 'Bloqueado', badge: 'bg-red-100 text-red-800', icon: '✕' },
  skipped: { label: 'Pulado', badge: 'bg-gray-100 text-gray-500', icon: '—' },
}

// SLA status config
export const slaStatusConfig: Record<string, { label: string; badge: string; color: string }> = {
  on_track: { label: 'No Prazo', badge: 'bg-emerald-100 text-emerald-800', color: '#059669' },
  at_risk: { label: 'Em Risco', badge: 'bg-amber-100 text-amber-800', color: '#d97706' },
  breached: { label: 'SLA Violado', badge: 'bg-red-100 text-red-800', color: '#dc2626' },
  completed: { label: 'Concluído', badge: 'bg-gray-100 text-gray-700', color: '#6b7280' },
}

// Responsible role config
export const responsibleRoleConfig: Record<string, { label: string; badge: string }> = {
  seller: { label: 'Cedente', badge: 'bg-purple-100 text-purple-800' },
  buyer: { label: 'Cessionário', badge: 'bg-indigo-100 text-indigo-800' },
  platform: { label: 'Plataforma', badge: 'bg-brand-100 text-brand-800' },
  sefaz: { label: 'SEFAZ', badge: 'bg-amber-100 text-amber-800' },
  legal: { label: 'Jurídico', badge: 'bg-gray-100 text-gray-800' },
  financial: { label: 'Financeiro', badge: 'bg-emerald-100 text-emerald-800' },
}

// Phase names for execution (fluxo real e-CredAc SEFAZ-SP)
export const executionPhaseNames: Record<number, string> = {
  1: 'Originação',
  2: 'Matching',
  3: 'Acordo Comercial',
  4: 'Verificação Fiscal',
  5: 'Contrato & Procuração',
  6: 'Transferência e-CredAc',
  7: 'Aceite do Cessionário',
  8: 'Liquidação & Conclusão',
}

// Descrição detalhada de cada fase (baseado no fluxo real da SEFAZ)
export const executionPhaseDescriptions: Record<number, string> = {
  1: 'Cedente cadastra crédito acumulado com protocolo e-CredAc e dados de homologação',
  2: 'Motor de matching conecta cedente e cessionário com base em tipo, valor e deságio',
  3: 'Partes negociam deságio final e condições — assinatura do termo comercial',
  4: 'Verificação de regularidade fiscal: IE ativa, sem débitos, GIA/EFD em dia, conta corrente desbloqueada',
  5: 'Contrato de cessão de crédito via Clicksign + procuração digital se necessário',
  6: 'Cedente solicita transferência no e-CredAc (Pedido > Transferência > Solicitar) com dados do cessionário',
  7: 'Cessionário tem até 10 dias para aceitar a transferência no e-CredAc',
  8: 'Pagamento ao cedente (PIX/TED/Boleto) + escrituração na EFD com visto eletrônico',
}

// Checklist de documentos por natureza da operação
export const documentosTransferencia: Record<string, string[]> = {
  geral: [
    'Protocolo e-CredAc de apropriação deferida',
    'Extrato da conta corrente e-CredAc atualizado',
    'Certidão de regularidade fiscal (ICMS)',
    'GIA ou EFD do período sem pendências',
    'Contrato de cessão de crédito assinado digitalmente',
  ],
  com_nfe: [
    'Chave de acesso da NF-e do fornecedor',
  ],
  sem_nfe: [
    'Documentos comprobatórios da operação (fatura de energia, etc.)',
    'Encaminhar documentos à Delegacia Regional',
  ],
  interdependente: [
    'Número do processo de reconhecimento de interdependência',
  ],
  terceiros: [
    'Justificativa de impossibilidade de uso próprio do crédito',
    'Autorização do Secretário da Fazenda (Art. 84, II RICMS)',
  ],
}

// Escrituração EFD — códigos de ajuste para crédito acumulado
export const codigosEFD: Record<string, { codigo: string; descricao: string }> = {
  apropriacao: { codigo: 'SP000221', descricao: 'Apropriação de crédito acumulado mediante autorização eletrônica' },
  devolucao: { codigo: 'SP000220', descricao: 'Devolução de crédito acumulado mediante autorização eletrônica' },
  recebimento: { codigo: 'SP020740', descricao: 'Recebimento de crédito acumulado mediante autorização eletrônica' },
  reincorporacao: { codigo: 'SP020741', descricao: 'Reincorporação de crédito acumulado mediante autorização eletrônica' },
}

// Format remaining time
export function formatTimeRemaining(deadline: string): string {
  const now = new Date()
  const dl = new Date(deadline)
  const diff = dl.getTime() - now.getTime()
  if (diff <= 0) return 'Vencido'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return `${Math.floor(diff / (1000 * 60))}min`
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

// Transaction status
export const transactionStatusConfig: Record<string, { label: string; badge: string }> = {
  pending_payment: { label: 'Ag. Pagamento', badge: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Pago', badge: 'bg-blue-100 text-blue-800' },
  transferring: { label: 'Transferindo', badge: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Concluído', badge: 'bg-emerald-100 text-emerald-800' },
  disputed: { label: 'Em disputa', badge: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelado', badge: 'bg-gray-100 text-gray-800' },
}
