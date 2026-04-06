import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * GET /api/compliance/kyc/admin
 * Lista todos os perfis KYC (somente admin).
 * Query: ?status=em_analise&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Verificar admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const status = params.get('status')
  const page = parseInt(params.get('page') || '1')
  const limit = parseInt(params.get('limit') || '20')
  const offset = (page - 1) * limit

  // Buscar via view vw_kyc_resumo (criada na migration)
  let query = supabase
    .from('vw_kyc_resumo')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: entries, count, error } = await query

  if (error) {
    // Fallback: buscar direto do kyc_profiles + companies
    const { data: fallbackEntries, error: fallbackError } = await supabase
      .from('kyc_profiles')
      .select(`
        *,
        companies:company_id (legal_name, cnpj)
      `)
      .eq(status ? 'status' : 'id', status || '')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 })
    }

    // Map to expected format
    const mapped = (fallbackEntries || []).map((e: Record<string, unknown>) => ({
      id: e.id,
      company_id: e.company_id,
      razao_social: e.razao_social || (e.companies as Record<string, unknown>)?.legal_name || '',
      cnpj: e.cnpj || (e.companies as Record<string, unknown>)?.cnpj || '',
      status: e.status,
      risk_score: e.risk_score || 0,
      pep: e.pep || false,
      total_docs: 0,
      docs_aprovados: 0,
      docs_reprovados: 0,
      docs_pendentes: 0,
      created_at: e.created_at,
      reviewed_at: e.reviewed_at,
    }))

    return NextResponse.json({ entries: mapped, total: mapped.length, page, limit })
  }

  return NextResponse.json({
    entries: entries || [],
    total: count || 0,
    page,
    limit,
  })
}
