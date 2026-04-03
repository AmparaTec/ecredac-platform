import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { z } from 'zod'

const createListingSchema = z.object({
  credit_type: z.enum(['acumulado', 'st', 'rural']),
  origin: z.enum(['exportacao', 'diferimento', 'aliquota_reduzida', 'substituicao_tributaria']),
  amount: z.number().positive(),
  min_discount: z.number().min(0).max(100),
  max_discount: z.number().min(0).max(100),
  e_credac_protocol: z.string().optional(),
  homologation_status: z.enum(['pendente', 'em_analise', 'homologado', 'rejeitado']).default('pendente'),
  description: z.string().optional(),
  expires_at: z.string().optional(),
})

// GET /api/listings — List all active credit listings
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const type = searchParams.get('type')
    const minAmount = searchParams.get('min_amount')
    const maxAmount = searchParams.get('max_amount')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabase
      .from('credit_listings')
      .select(`
        *,
        company:companies(id, cnpj, razao_social, nome_fantasia, sefaz_status, tier)
      `, { count: 'exact' })

    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (type) {
      query = query.eq('credit_type', type)
    }
    if (minAmount) {
      query = query.gte('amount', parseFloat(minAmount))
    }
    if (maxAmount) {
      query = query.lte('amount', parseFloat(maxAmount))
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar listings' }, { status: 500 })
    }

    return NextResponse.json({
      listings: data,
      total: count,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Get listings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/listings — Create a new credit listing
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createListingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    // Get user's company
    const { data: company } = await supabase
      .from('companies')
      .select('id, type, verified, sefaz_status')
      .eq('auth_user_id', user.id)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Empresa nao encontrada' }, { status: 404 })
    }

    if (!company.verified) {
      return NextResponse.json({ error: 'Empresa nao verificada' }, { status: 403 })
    }

    if (company.type === 'buyer') {
      return NextResponse.json({ error: 'Cessionarios nao podem criar ofertas de credito' }, { status: 403 })
    }

    const listing = {
      company_id: company.id,
      ...parsed.data,
      remaining_amount: parsed.data.amount,
      status: 'active' as const,
      published_at: new Date().toISOString(),
    }

    const { data: created, error } = await supabase
      .from('credit_listings')
      .insert(listing)
      .select()
      .single()

    if (error) {
      console.error('Create listing error:', error)
      return NextResponse.json({ error: 'Erro ao criar oferta' }, { status: 500 })
    }

    // Audit log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      company_id: company.id,
      action: 'create',
      entity_type: 'credit_listing',
      entity_id: created.id,
      description: `Nova oferta de credito: R$ ${parsed.data.amount}`,
    })

    return NextResponse.json({ listing: created }, { status: 201 })
  } catch (error) {
    console.error('Create listing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
