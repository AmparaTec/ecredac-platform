import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// GET /api/scores?listing_id=xxx — Buscar score de um credito
// GET /api/scores — Buscar todos os scores (com filtros)
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const listingId = searchParams.get('listing_id')
  const grade = searchParams.get('grade')
  const minScore = searchParams.get('min_score')

  if (listingId) {
    // Buscar score especifico
    const { data, error } = await supabase
      .from('credit_scores')
      .select('*')
      .eq('listing_id', listingId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ score: data })
  }

  // Buscar multiplos scores
  let query = supabase
    .from('credit_scores')
    .select(`
      *,
      listing:credit_listings(
        id, credit_id, credit_type, origin, amount, remaining_amount,
        min_discount, max_discount, homologation_status, status,
        company:companies(id, razao_social, nome_fantasia, cnpj, sefaz_status)
      )
    `)
    .order('score', { ascending: false })

  if (grade) {
    query = query.eq('grade', grade)
  }

  if (minScore) {
    query = query.gte('score', parseFloat(minScore))
  }

  const { data, error } = await query.limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ scores: data })
}

// POST /api/scores — Calcular/recalcular score de um credito
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const { listing_id, recalculate_all } = body

  if (recalculate_all) {
    // Recalcular todos os scores de listings ativas
    const { data: listings, error: listError } = await supabase
      .from('credit_listings')
      .select('id')
      .eq('status', 'active')

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }

    const results = []
    for (const listing of listings || []) {
      const { data, error } = await supabase.rpc('calculate_credit_score', {
        p_listing_id: listing.id
      })

      if (data && data.length > 0) {
        results.push({ listing_id: listing.id, ...data[0] })
      }
    }

    return NextResponse.json({
      message: `${results.length} scores calculados`,
      scores: results
    })
  }

  if (!listing_id) {
    return NextResponse.json({ error: 'listing_id obrigatorio' }, { status: 400 })
  }

  // Calcular score usando a stored procedure
  const { data, error } = await supabase.rpc('calculate_credit_score', {
    p_listing_id: listing_id
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Criar audit log
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
      entity_type: 'credit_score',
      entity_id: listing_id,
      description: `Score calculado: ${data?.[0]?.grade} (${data?.[0]?.score})`,
    })
  }

  return NextResponse.json({
    score: data?.[0] || null
  })
}
