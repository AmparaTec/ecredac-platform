import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server'
import type { MatchingResult } from '@/types/database'

// POST /api/matching — Run the matching engine
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()

    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to run matching (needs full access)
    const admin = createAdminSupabase()

    // Call the matching engine stored procedure
    const { data, error } = await admin.rpc('run_matching_engine')

    if (error) {
      console.error('Matching engine error:', error)
      return NextResponse.json({ error: 'Erro ao executar matching' }, { status: 500 })
    }

    const results = (data || []) as MatchingResult[]

    // Create notifications for each match
    for (const match of results) {
      // Get match details
      const { data: matchData } = await admin
        .from('matches')
        .select(`
          *,
          seller_company:companies!matches_seller_company_id_fkey(id, nome_fantasia),
          buyer_company:companies!matches_buyer_company_id_fkey(id, nome_fantasia)
        `)
        .eq('id', match.match_id)
        .single()

      if (matchData) {
        // Notify seller
        await admin.from('notifications').insert({
          company_id: matchData.seller_company_id,
          type: 'match_found',
          title: 'Novo match encontrado!',
          body: `Seu crédito de R$ ${match.matched_amount.toLocaleString('pt-BR')} foi matched com ${matchData.buyer_company?.nome_fantasia}. Desconto: ${match.agreed_discount}%`,
          reference_type: 'match',
          reference_id: match.match_id,
        })

        // Notify buyer
        await admin.from('notifications').insert({
          company_id: matchData.buyer_company_id,
          type: 'match_found',
          title: 'Crédito compatível encontrado!',
          body: `Encontramos R$ ${match.matched_amount.toLocaleString('pt-BR')} em créditos de ${matchData.seller_company?.nome_fantasia}. Desconto: ${match.agreed_discount}%`,
          reference_type: 'match',
          reference_id: match.match_id,
        })
      }
    }

    // Log audit
    await admin.from('audit_log').insert({
      user_id: user.id,
      action: 'match',
      entity_type: 'matching_engine',
      description: `Matching engine executado: ${results.length} match(es) encontrado(s)`,
      changes: { results },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    })

    return NextResponse.json({
      success: true,
      matches_found: results.length,
      results,
    })
  } catch (error) {
    console.error('Matching API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/matching — Get matching stats
export async function GET() {
  try {
    const supabase = createServerSupabase()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get matches for user's companies
    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .eq('auth_user_id', user.id)

    const companyIds = companies?.map(c => c.id) || []

    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        *,
        seller_company:companies!matches_seller_company_id_fkey(id, nome_fantasia, cnpj),
        buyer_company:companies!matches_buyer_company_id_fkey(id, nome_fantasia, cnpj),
        listing:credit_listings(id, credit_type, origin, amount),
        request:credit_requests(id, amount_needed, urgency)
      `)
      .or(`seller_company_id.in.(${companyIds.join(',')}),buyer_company_id.in.(${companyIds.join(',')})`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar matches' }, { status: 500 })
    }

    return NextResponse.json({ matches })
  } catch (error) {
    console.error('Get matches error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
