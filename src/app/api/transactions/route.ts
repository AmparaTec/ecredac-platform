import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server'

// GET /api/transactions — List transactions for the authenticated user
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Empresa nao encontrada' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  let query = supabase
    .from('transactions')
    .select(`
      *,
      seller_company:companies!seller_company_id(id, nome_fantasia, razao_social, cnpj),
      buyer_company:companies!buyer_company_id(id, nome_fantasia, razao_social, cnpj),
      match:matches(*)
    `, { count: 'exact' })
    .or(`seller_company_id.eq.${company.id},buyer_company_id.eq.${company.id}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    transactions: data,
    total: count,
    page,
    limit,
  })
}

// POST /api/transactions — Create transaction from a confirmed match
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const adminSupabase = createAdminSupabase()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const { match_id, payment_method } = body

  if (!match_id) {
    return NextResponse.json({ error: 'match_id obrigatorio' }, { status: 400 })
  }

  // Validate match exists and is confirmed
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', match_id)
    .eq('status', 'confirmed')
    .single()

  if (matchError || !match) {
    return NextResponse.json({ error: 'Match nao encontrado ou nao confirmado' }, { status: 404 })
  }

  // Check no existing transaction for this match
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('match_id', match_id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Transacao ja existe para este match' }, { status: 409 })
  }

  // Create transaction
  const { data: transaction, error: txError } = await adminSupabase
    .from('transactions')
    .insert({
      match_id: match.id,
      seller_company_id: match.seller_company_id,
      buyer_company_id: match.buyer_company_id,
      credit_amount: match.matched_amount,
      discount_applied: match.agreed_discount,
      total_payment: match.total_payment,
      platform_fee: match.platform_fee,
      net_to_seller: match.net_to_seller,
      payment_method: payment_method || null,
      payment_status: 'pending',
      status: 'pending_payment',
    })
    .select()
    .single()

  if (txError) {
    return NextResponse.json({ error: 'Erro ao criar transacao: ' + txError.message }, { status: 500 })
  }

  // Update match status
  await adminSupabase
    .from('matches')
    .update({ status: 'confirmed' })
    .eq('id', match_id)

  // Update listing status
  await adminSupabase
    .from('credit_listings')
    .update({ status: 'sold' })
    .eq('id', match.listing_id)

  // Update request status
  await adminSupabase
    .from('credit_requests')
    .update({ status: 'fulfilled' })
    .eq('id', match.request_id)

  // Audit log
  await adminSupabase.from('audit_log').insert({
    company_id: match.seller_company_id,
    action: 'transaction_created',
    entity_type: 'transaction',
    entity_id: transaction.id,
    details: { match_id, payment_method },
  })

  // Notify both parties
  const notifications = [
    {
      company_id: match.seller_company_id,
      type: 'transaction_created',
      title: 'Nova transacao criada',
      body: `Transacao de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(match.matched_amount)} iniciada. Aguardando pagamento.`,
      reference_type: 'transaction',
      reference_id: transaction.id,
    },
    {
      company_id: match.buyer_company_id,
      type: 'transaction_created',
      title: 'Nova transacao criada',
      body: `Transacao de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(match.matched_amount)} iniciada. Realize o pagamento para prosseguir.`,
      reference_type: 'transaction',
      reference_id: transaction.id,
    },
  ]

  await adminSupabase.from('notifications').insert(notifications)

  return NextResponse.json({ transaction }, { status: 201 })
}
