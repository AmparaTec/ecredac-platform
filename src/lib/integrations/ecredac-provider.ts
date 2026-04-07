// =============================================================
// e-CredAc Provider — Integração com sistema SEFAZ-SP
// Strategy pattern: Manual → RPA → API (quando disponível)
// =============================================================

import { createClient } from '@supabase/supabase-js'

// ---- Types ----

export interface EcredacSaldo {
  cnpj: string
  inscricao_estadual: string
  saldo_principal: number
  saldo_auxiliar: number
  saldo_bloqueado: number
  saldo_disponivel: number
  data_consulta: string
  fonte: 'manual' | 'rpa'
}

export interface EcredacExtrato {
  cnpj: string
  inscricao_estadual: string
  periodo: string
  movimentacoes: Array<{
    data: string
    tipo: 'credito' | 'debito'
    descricao: string
    valor: number
    saldo_apos: number
    protocolo?: string
  }>
}

export interface TransferenciaParams {
  cedente_cnpj: string
  cedente_ie: string
  cessionario_cnpj: string
  cessionario_ie: string
  valor: number
  natureza: 'nao_interdependente_art73' | 'fornecedor' | 'industria' | 'exportacao'
  transaction_id?: string
  listing_id?: string
}

export interface EcredacProtocolo {
  protocolo: string
  status: string
  data_protocolo: string
  valor: number
  prazo_aceite_expira?: string
}

export interface AceiteResult {
  protocolo: string
  aceito: boolean
  data_aceite: string
  motivo_rejeicao?: string
}

export interface EcredacStatus {
  protocolo: string
  status: string
  data_ultima_atualizacao: string
  observacoes?: string
}

// ---- Provider Interface ----

export interface IEcredacProvider {
  nome: string
  consultarSaldo(cnpj: string, ie: string): Promise<EcredacSaldo>
  consultarExtrato(cnpj: string, ie: string, periodo: string): Promise<EcredacExtrato>
  solicitarTransferencia(params: TransferenciaParams): Promise<EcredacProtocolo>
  confirmarAceite(protocolo: string): Promise<AceiteResult>
  consultarStatus(protocolo: string): Promise<EcredacStatus>
}

// ---- Manual Provider (Fase 1) ----

/**
 * Provider manual: operador registra dados consultados no e-CredAc manualmente.
 * Fase 1 da integração — requer procuração eletrônica ativa.
 */
export class EcredacManualProvider implements IEcredacProvider {
  nome = 'manual'
  private supabase: ReturnType<typeof createClient>

  constructor(supabase: ReturnType<typeof createClient>) {
    this.supabase = supabase
  }

  async consultarSaldo(cnpj: string, ie: string): Promise<EcredacSaldo> {
    // Buscar último saldo registrado manualmente
    const { data } = await this.supabase
      .from('ecredac_saldos')
      .select('*')
      .eq('cnpj', cnpj)
      .eq('inscricao_estadual', ie)
      .order('data_consulta', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) {
      return {
        cnpj, inscricao_estadual: ie,
        saldo_principal: 0, saldo_auxiliar: 0,
        saldo_bloqueado: 0, saldo_disponivel: 0,
        data_consulta: new Date().toISOString(),
        fonte: 'manual',
      }
    }

    return {
      cnpj: data.cnpj,
      inscricao_estadual: data.inscricao_estadual,
      saldo_principal: Number(data.saldo_principal),
      saldo_auxiliar: Number(data.saldo_auxiliar || 0),
      saldo_bloqueado: Number(data.saldo_bloqueado || 0),
      saldo_disponivel: Number(data.saldo_disponivel || 0),
      data_consulta: data.data_consulta,
      fonte: data.fonte,
    }
  }

  async consultarExtrato(_cnpj: string, _ie: string, _periodo: string): Promise<EcredacExtrato> {
    // Na fase manual, extrato é registrado pelo operador
    throw new Error('Extrato requer consulta manual no portal e-CredAc')
  }

  async solicitarTransferencia(params: TransferenciaParams): Promise<EcredacProtocolo> {
    // Cria registro pendente — operador executa no portal e registra protocolo
    const { data, error } = await this.supabase
      .from('ecredac_operations')
      .insert({
        transaction_id: params.transaction_id || null,
        listing_id: params.listing_id || null,
        operation_type: 'pedido_transferencia',
        cedente_cnpj: params.cedente_cnpj,
        cedente_ie: params.cedente_ie,
        cessionario_cnpj: params.cessionario_cnpj,
        cessionario_ie: params.cessionario_ie,
        valor: params.valor,
        natureza_transferencia: params.natureza,
        status: 'pendente',
      })
      .select('id')
      .single()

    if (error) throw new Error(`Erro ao criar operação: ${error.message}`)

    return {
      protocolo: `MANUAL-${data.id}`,
      status: 'pendente',
      data_protocolo: new Date().toISOString(),
      valor: params.valor,
    }
  }

  async confirmarAceite(protocolo: string): Promise<AceiteResult> {
    // Operador registra aceite feito no portal
    const id = protocolo.replace('MANUAL-', '')
    const { error } = await this.supabase
      .from('ecredac_operations')
      .update({
        status: 'aceito',
        ecredac_data_aceite: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw new Error(`Erro ao confirmar aceite: ${error.message}`)

    return {
      protocolo,
      aceito: true,
      data_aceite: new Date().toISOString(),
    }
  }

  async consultarStatus(protocolo: string): Promise<EcredacStatus> {
    const id = protocolo.replace('MANUAL-', '')
    const { data } = await this.supabase
      .from('ecredac_operations')
      .select('*')
      .eq('id', id)
      .single()

    if (!data) throw new Error(`Operação ${protocolo} não encontrada`)

    return {
      protocolo: data.ecredac_protocolo || protocolo,
      status: data.status,
      data_ultima_atualizacao: data.updated_at,
      observacoes: data.observacoes,
    }
  }
}

// ---- Saldo Registration (operador) ----

export async function registrarSaldoManual(
  supabase: ReturnType<typeof createClient>,
  params: {
    company_id: string
    cnpj: string
    inscricao_estadual: string
    saldo_principal: number
    saldo_auxiliar?: number
    saldo_bloqueado?: number
    consultado_por: string
    screenshot_path?: string
  }
): Promise<void> {
  await supabase.from('ecredac_saldos').insert({
    company_id: params.company_id,
    cnpj: params.cnpj,
    inscricao_estadual: params.inscricao_estadual,
    saldo_principal: params.saldo_principal,
    saldo_auxiliar: params.saldo_auxiliar || 0,
    saldo_bloqueado: params.saldo_bloqueado || 0,
    consultado_por: params.consultado_por,
    screenshot_path: params.screenshot_path,
    fonte: 'manual',
  })
}

// ---- Protocolo Update (operador) ----

export async function atualizarProtocolo(
  supabase: ReturnType<typeof createClient>,
  operationId: string,
  params: {
    ecredac_protocolo: string
    status: string
    ecredac_data_autorizacao?: string
    prazo_aceite_expira?: string
    observacoes?: string
    comprovante_path?: string
  }
): Promise<void> {
  await supabase
    .from('ecredac_operations')
    .update({
      ecredac_protocolo: params.ecredac_protocolo,
      status: params.status,
      ecredac_data_protocolo: new Date().toISOString(),
      ecredac_data_autorizacao: params.ecredac_data_autorizacao,
      prazo_aceite_expira: params.prazo_aceite_expira,
      observacoes: params.observacoes,
      comprovante_path: params.comprovante_path,
    })
    .eq('id', operationId)
}

// ---- Procuração Management ----

export async function verificarProcuracaoAtiva(
  supabase: ReturnType<typeof createClient>,
  cnpj: string
): Promise<boolean> {
  const { data } = await supabase
    .from('ecredac_procuracoes')
    .select('id')
    .eq('cnpj', cnpj)
    .eq('status', 'ativa')
    .gte('data_fim', new Date().toISOString().split('T')[0])
    .limit(1)
    .maybeSingle()

  return !!data
}

export async function listarOperacoesPendentes(
  supabase: ReturnType<typeof createClient>,
  operadorId?: string
): Promise<any[]> {
  let query = supabase
    .from('ecredac_operations')
    .select('*, transactions(id, status)')
    .in('status', ['pendente', 'protocolado', 'em_analise', 'autorizado', 'aguardando_aceite'])
    .order('created_at', { ascending: false })

  if (operadorId) {
    query = query.eq('operador_id', operadorId)
  }

  const { data } = await query
  return data || []
}

// ---- Factory ----

export function createEcredacProvider(
  supabase: ReturnType<typeof createClient>,
  mode: 'manual' | 'rpa' | 'api' = 'manual'
) as any: IEcredacProvider {
  switch (mode) {
    case 'manual':
      return new EcredacManualProvider(supabase as any)
    case 'rpa':
      // TODO: Sprint 5 — EcredacRpaProvider
      console.warn('RPA provider not yet implemented, falling back to manual')
      return new EcredacManualProvider(supabase as any)
    case 'api':
      // TODO: Fase 3 — quando SEFAZ disponibilizar API
      console.warn('API provider not available, falling back to manual')
      return new EcredacManualProvider(supabase as any)
    default:
      return new EcredacManualProvider(supabase as any)
  }
}
