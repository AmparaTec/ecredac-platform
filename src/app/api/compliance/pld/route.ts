import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * GET /api/compliance/pld
 * Lista alertas PLD. Somente admin.
 * Query params: ?status=aberto&severity=alto&page=1&limit=20
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
  const severity = params.get('severity')
  const page = parseInt(params.get('page') || '1')
  const limit = parseInt(params.get('limit') || '20')
  const offset = (page - 1) * limit

  let query = supabase
    .from('pld_alerts')
    .select(`
      *,
      companies:company_id (legal_name, cnpj),
      transactions:transaction_id (credit_value, discount_percentage)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (severity) query = query.eq('severity', severity)

  const { data: alerts, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Stats rápido
  const { data: stats } = await supabase
    .from('pld_alerts')
    .select('status, severity')

  const summary = {
    total: stats?.length || 0,
    abertos: stats?.filter(s => s.status === 'aberto').length || 0,
    em_analise: stats?.filter(s => s.status === 'em_analise').length || 0,
    criticos: stats?.filter(s => s.severity === 'critico' && ['aberto', 'em_analise'].includes(s.status)).length || 0,
    altos: stats?.filter(s => s.severity === 'alto' && ['aberto', 'em_analise'].includes(s.status)).length || 0,
  }

  return NextResponse.json({
    alerts: alerts || [],
    total: count || 0,
    page,
    limit,
    summary,
  })
}

/**
 * PATCH /api/compliance/pld
 * Atualiza status de um alerta PLD (somente admin).
 * Body: { alert_id, action: 'analisar' | 'resolver' | 'falso_positivo' | 'escalar', notes?: string, escalated_to?: string }
 */
export async function PATCH(request: NextRequest) {
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

  const body = await request.json()
  const { alert_id, action, notes, escalated_to } = body

  if (!alert_id || !action) {
    return NextResponse.json({ error: 'alert_id e action são obrigatórios' }, { status: 400 })
  }

  const statusMap: Record<string, string> = {
    analisar: 'em_analise',
    resolver: 'resolvido',
    falso_positivo: 'falso_positivo',
    escalar: 'escalado',
  }

  const newStatus = statusMap[action]
  if (!newStatus) {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { status: newStatus }

  if (['resolvido', 'falso_positivo'].includes(newStatus)) {
    updateData.resolved_by = user.id
    updateData.resolved_at = new Date().toISOString()
    updateData.resolution_notes = notes || null
  }

  if (newStatus === 'escalado') {
    updateData.escalated_to = escalated_to || 'COAF'
    updateData.escalated_at = new Date().toISOString()
    updateData.resolution_notes = notes || null
  }

  const { error } = await supabase
    .from('pld_alerts')
    .update(updateData)
    .eq('id', alert_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit log
  await supabase.from('audit_log').insert({
    entity_type: 'pld_alert',
    entity_id: alert_id,
    action: `pld_${action}`,
    user_id: user.id,
    description: `Alerta PLD ${action}: ${notes || 'sem observações'}`,
  }).catch(() => {})

  return NextResponse.json({ ok: true, status: newStatus })
}
