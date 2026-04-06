import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * GET /api/compliance/audit
 * Lista audit_log entries (somente admin).
 * Query: ?page=1&search=kyc&entity_type=kyc_profile
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
  const page = parseInt(params.get('page') || '1')
  const limit = 50
  const offset = (page - 1) * limit
  const search = params.get('search') || ''
  const entityType = params.get('entity_type') || ''

  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (entityType) {
    query = query.eq('entity_type', entityType)
  }

  if (search) {
    query = query.or(`description.ilike.%${search}%,action.ilike.%${search}%,entity_type.ilike.%${search}%`)
  }

  const { data: logs, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    logs: logs || [],
    total: count || 0,
    page,
    limit,
  })
}
