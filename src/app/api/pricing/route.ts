import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// GET /api/pricing?listing_id=xxx — Buscar recomendacao de preco
// GET /api/pricing/benchmarks?type=acumulado&origin=exportacao — Buscar benchmarks
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const listingId = searchParams.get('listing_id')
  const creditType = searchParams.get('type')
  const origin = searchParams.get('origin')
  const grade = searchParams.get('grade')

  // Se listing_id, buscar recomendacao especifica
  if (listingId) {
    const { data, error } = await supabase
      .from('price_recommendations')
      .select('*')
      .eq('listing_id', listingId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Se nao existe ou expirou, calcular
    if (!data || new Date(data.expires_at) < new Date()) {
      const { data: calcResult, error: calcError } = await supabase.rpc(
        'calculate_price_recommendation',
        { p_listing_id: listingId }
      )

      if (calcError) {
        return NextResponse.json({ error: calcError.message }, { status: 500 })
      }

      return NextResponse.json({
        recommendation: calcResult,
        source: 'calculated',
      })
    }

    return NextResponse.json({
      recommendation: data,
      source: 'cached',
    })
  }

  // Buscar benchmarks de mercado
  let query = supabase
    .from('market_benchmarks')
    .select('*')
    .order('period_end', { ascending: false })

  if (creditType) query = query.eq('credit_type', creditType)
  if (origin) query = query.eq('origin', origin)
  if (grade) query = query.eq('credit_grade', grade)

  const { data: benchmarks, error: benchError } = await query.limit(50)

  if (benchError) {
    return NextResponse.json({ error: benchError.message }, { status: 500 })
  }

  return NextResponse.json({ benchmarks })
}

// POST /api/pricing — Calcular/recalcular recomendacao de preco
// Body: { listing_id: string } ou { recalculate_all: true }
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const body = await request.json()

  // Recalcular benchmarks de mercado
  if (body.update_benchmarks) {
    const { data, error } = await supabase.rpc('update_market_benchmarks')
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ result: data, action: 'benchmarks_updated' })
  }

  // Recalcular todas as recomendacoes
  if (body.recalculate_all) {
    const { data: listings } = await supabase
      .from('credit_listings')
      .select('id')
      .eq('status', 'active')

    if (!listings || listings.length === 0) {
      return NextResponse.json({ message: 'Nenhum listing ativo', recalculated: 0 })
    }

    const results = []
    for (const listing of listings) {
      const { data, error } = await supabase.rpc(
        'calculate_price_recommendation',
        { p_listing_id: listing.id }
      )
      results.push({
        listing_id: listing.id,
        success: !error,
        result: data,
        error: error?.message,
      })
    }

    return NextResponse.json({
      recalculated: results.length,
      results,
    })
  }

  // Calcular para um listing especifico
  if (!body.listing_id) {
    return NextResponse.json({ error: 'listing_id obrigatorio' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc(
    'calculate_price_recommendation',
    { p_listing_id: body.listing_id }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log de auditoria
  await supabase.from('audit_log').insert({
    action: 'price_recommendation_calculated',
    entity_type: 'credit_listing',
    entity_id: body.listing_id,
    actor_id: user.id,
    details: { result: data },
  })

  return NextResponse.json({
    recommendation: data,
    source: 'calculated',
  })
}
