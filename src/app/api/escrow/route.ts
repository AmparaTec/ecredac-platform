/**
 * API: /api/escrow
 *
 * GET  — listar escrow parcelas da empresa
 * POST — criar escrow para um match confirmado
 */
import { createServerSupabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: company } = await (supabase as any)
    .from('companies')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const transactionId = searchParams.get('transaction_id')
  const status = searchParams.get('status')

  // Buscar transactions onde empresa é buyer ou seller
  let txQuery = (supabase as any)
    .from('transactions')
    .select('id, credit_amount, total_payment, payment_status, status, seller_company_id, buyer_company_id, created_at')
    .or(`seller_company_id.eq.${company.id},buyer_company_id.eq.${company.id}`)
    .order('created_at', { ascending: false })

  const { data: transactions } = await txQuery

  if (!transactions?.length) {
    return NextResponse.json({ parcelas: [], transactions: [] })
  }

  const txIds = transactions.map((t: any) => t.id)

  // Buscar parcelas de escrow
  let parcelasQuery = (supabase as any)
    .from('escrow_parcelas')
    .select('*')
    .in('transaction_id', transactionId ? [transactionId] : txIds)
    .order('numero_parcela', { ascending: true })

  if (status) parcelasQuery = parcelasQuery.eq('status', status)

  const { data: parcelas } = await parcelasQuery

  // Stats
  const stats = {
    total_parcelas: parcelas?.length ?? 0,
    aguardando_pagamento: parcelas?.filter((p: any) => p.status === 'aguardando_pagamento').length ?? 0,
    pagas: parcelas?.filter((p: any) => p.status === 'pago').length ?? 0,
    liberadas: parcelas?.filter((p: any) => p.status === 'liberado').length ?? 0,
    valor_total_centavos: parcelas?.reduce((sum: number, p: any) => sum + (p.valor_centavos ?? 0), 0) ?? 0,
  }

  return NextResponse.json({ parcelas: parcelas ?? [], transactions, stats })
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: company } = await (supabase as any)
    .from('companies')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

  const body = await request.json()
  const { match_id, payment_method = 'pix', parcelas_config } = body

  if (!match_id) return NextResponse.json({ error: 'match_id obrigatório' }, { status: 400 })

  // Verificar match
  const { data: match } = await (supabase as any)
    .from('matches')
    .select('*')
    .eq('id', match_id)
    .single()

  if (!match) return NextResponse.json({ error: 'Match não encontrado' }, { status: 404 })
  if (match.buyer_company_id !== company.id && match.seller_company_id !== company.id) {
    return NextResponse.json({ error: 'Sem acesso a este match' }, { status: 403 })
  }
  if (match.status !== 'confirmed') {
    return NextResponse.json({ error: 'Match deve estar confirmado para criar escrow' }, { status: 422 })
  }

  // Criar transaction se não existir
  const { data: txExist } = await (supabase as any)
    .from('transactions')
    .select('id')
    .eq('match_id', match_id)
    .single()

  let transactionId = txExist?.id

  if (!transactionId) {
    const totalPayment = Number(match.total_payment) || Number(match.matched_amount) * (1 - Number(match.agreed_discount) / 100)
    const platformFee = totalPayment * Number(match.platform_fee_pct ?? 0.02)
    const netToSeller = totalPayment - platformFee

    const { data: newTx, error: txError } = await (supabase as any)
      .from('transactions')
      .insert({
        match_id,
        seller_company_id: match.seller_company_id,
        buyer_company_id: match.buyer_company_id,
        credit_amount: match.matched_amount,
        discount_applied: match.agreed_discount,
        total_payment: totalPayment,
        platform_fee: platformFee,
        net_to_seller: netToSeller,
        payment_method,
        payment_status: 'pending',
        status: 'initiated',
      })
      .select('id')
      .single()

    if (txError || !newTx) {
      return NextResponse.json({ error: 'Erro ao criar transação', details: txError?.message }, { status: 500 })
    }
    transactionId = newTx.id
  }

  // Criar parcelas de escrow
  // Default: 3 marcos — 30% assinatura contrato, 40% protocolo SEFAZ, 30% confirmação RFB
  const defaultParcelas = [
    { numero_parcela: 1, percentual: 30, marco_liberacao: 1, status: 'aguardando_pagamento' },
    { numero_parcela: 2, percentual: 40, marco_liberacao: 2, status: 'aguardando_pagamento' },
    { numero_parcela: 3, percentual: 30, marco_liberacao: 3, status: 'aguardando_pagamento' },
  ]

  const config = parcelas_config ?? defaultParcelas
  const { data: match2 } = await (supabase as any)
    .from('transactions')
    .select('total_payment')
    .eq('id', transactionId)
    .single()

  const totalCentavos = Math.round((Number(match2?.total_payment) ?? 0) * 100)

  const parcelasData = config.map((p: any) => ({
    transaction_id: transactionId,
    numero_parcela: p.numero_parcela,
    percentual: p.percentual,
    valor_centavos: Math.round(totalCentavos * p.percentual / 100),
    marco_liberacao: p.marco_liberacao,
    status: p.status ?? 'aguardando_pagamento',
    payment_method,
  }))

  // Verificar se já existem parcelas
  const { data: existingParcelas } = await (supabase as any)
    .from('escrow_parcelas')
    .select('id')
    .eq('transaction_id', transactionId)

  if (existingParcelas?.length) {
    return NextResponse.json({
      message: 'Escrow já configurado',
      transaction_id: transactionId,
      parcelas: existingParcelas
    })
  }

  const { data: parcelas, error: parcelasError } = await (supabase as any)
    .from('escrow_parcelas')
    .insert(parcelasData)
    .select()

  if (parcelasError) {
    return NextResponse.json({ error: 'Erro ao criar parcelas', details: parcelasError.message }, { status: 500 })
  }

  // Log auditoria
  await (supabase as any).from('audit_log').insert({
    user_id: user.id,
    action: 'escrow_created',
    resource_type: 'transactions',
    resource_id: transactionId,
    metadata: { match_id, parcelas_count: parcelasData.length, total_centavos: totalCentavos },
  })

  return NextResponse.json({ transaction_id: transactionId, parcelas }, { status: 201 })
}
