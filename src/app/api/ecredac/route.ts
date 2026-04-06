import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import {
  createEcredacProvider,
  registrarSaldoManual,
  atualizarProtocolo,
  verificarProcuracaoAtiva,
  listarOperacoesPendentes,
} from '@/lib/integrations/ecredac-provider'

// GET /api/ecredac?cnpj=xxx -- Buscar saldo e operacoes e-CredAc
// GET /api/ecredac?cnpj=xxx&action=extrato -- Buscar extrato
// GET /api/ecredac?cnpj=xxx&action=pendentes -- Listar operacoes pendentes
// GET /api/ecredac?cnpj=xxx&action=procuracao -- Verificar procuracao
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const cnpj = searchParams.get('cnpj')
  const action = searchParams.get('action')

  if (!cnpj) {
    return NextResponse.json({ error: 'cnpj obrigatorio' }, { status: 400 })
  }

  const cnpjLimpo = cnpj.replace(/\\D/g, '')
  if (cnpjLimpo.length !== 14) {
    return NextResponse.json({ error: 'CNPJ invalido (deve ter 14 digitos)' }, { status: 400 })
  }

  // Verificar se usuario tem acesso a este CNPJ
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('cnpj', cnpjLimpo)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  // Tambem permitir procuradores
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  const isProcurador = profile?.role === 'procurador'

  if (!company && !isProcurador) {
    return NextResponse.json({ error: 'Acesso negado a este CNPJ' }, { status: 403 })
  }

  if (action === 'procuracao') {
    const procuracao = await verificarProcuracaoAtiva(supabase, cnpjLimpo)
    return NextResponse.json({ cnpj: cnpjLimpo, procuracao })
  }

  if (action === 'pendentes') {
    const pendentes = await listarOperacoesPendentes(supabase, cnpjLimpo)
    return NextResponse.json({ cnpj: cnpjLimpo, operacoes_pendentes: pendentes })
  }

  // Buscar saldo via provider
  const provider = createEcredacProvider()

  if (action === 'extrato') {
    const extrato = await provider.consultarExtrato(cnpjLimpo)
    return NextResponse.json({ cnpj: cnpjLimpo, extrato })
  }

  // Default: buscar saldo
  const saldo = await provider.consultarSaldo(cnpjLimpo)
  return NextResponse.json({ cnpj: cnpjLimpo, saldo })
}

// POST /api/ecredac -- Registrar saldo manual ou iniciar transferencia
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const { action } = body as { action: string }

  if (action === 'registrar_saldo') {
    const { cnpj, saldo_disponivel, saldo_bloqueado, conta_corrente, referencia } = body as {
      cnpj: string
      saldo_disponivel: number
      saldo_bloqueado?: number
      conta_corrente?: string
      referencia?: string
    }

    if (!cnpj || saldo_disponivel === undefined) {
      return NextResponse.json(
        { error: 'cnpj e saldo_disponivel sao obrigatorios' },
        { status: 400 }
      )
    }

    const cnpjLimpo = cnpj.replace(/\\D/g, '')
    const result = await registrarSaldoManual(supabase, {
      cnpj: cnpjLimpo,
      saldo_disponivel,
      saldo_bloqueado: saldo_bloqueado || 0,
      conta_corrente: conta_corrente || null,
      referencia: referencia || null,
      registrado_por: user.id,
    })

    // Audit log
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (company) {
      await supabase.from('audit_log').insert({
        user_id: user.id,
        company_id: company.id,
        action: 'create',
        entity_type: 'ecredac_saldo',
        entity_id: cnpjLimpo,
        description: 'Saldo e-CredAc registrado: R$ ' + saldo_disponivel.toFixed(2),
      })
    }

    return NextResponse.json({
      sucesso: true,
      saldo: result,
      mensagem: 'Saldo registrado com sucesso',
    })
  }

  if (action === 'iniciar_transferencia') {
    const { cnpj_origem, cnpj_destino, valor, tipo_credito } = body as {
      cnpj_origem: string
      cnpj_destino: string
      valor: number
      tipo_credito: string
    }

    if (!cnpj_origem || !cnpj_destino || !valor) {
      return NextResponse.json(
        { error: 'cnpj_origem, cnpj_destino e valor sao obrigatorios' },
        { status: 400 }
      )
    }

    const provider = createEcredacProvider()
    const protocolo = await provider.iniciarTransferencia({
      cnpj_origem: cnpj_origem.replace(/\\D/g, ''),
      cnpj_destino: cnpj_destino.replace(/\\D/g, ''),
      valor,
      tipo_credito: tipo_credito || 'ICMS',
    })

    return NextResponse.json({
      sucesso: true,
      protocolo,
      mensagem: 'Transferencia iniciada -- acompanhe pelo protocolo',
    })
  }

  if (action === 'atualizar_protocolo') {
    const { protocolo, status, observacao } = body as {
      protocolo: string
      status: string
      observacao?: string
    }

    if (!protocolo || !status) {
      return NextResponse.json(
        { error: 'protocolo e status sao obrigatorios' },
        { status: 400 }
      )
    }

    await atualizarProtocolo(supabase, protocolo, status, observacao)

    return NextResponse.json({
      sucesso: true,
      protocolo,
      status,
      mensagem: 'Protocolo atualizado',
    })
  }

  return NextResponse.json(
    { error: 'action invalida. Acoes aceitas: registrar_saldo, iniciar_transferencia, atualizar_protocolo' },
    { status: 400 }
  )
}
