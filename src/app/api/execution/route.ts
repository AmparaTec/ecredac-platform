import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// GET /api/execution?match_id=xxx — Buscar plano de execucao de um match
// GET /api/execution?plan_id=xxx — Buscar plano por ID com todas as tasks
// GET /api/execution/templates — Buscar templates
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const matchId = searchParams.get('match_id')
  const planId = searchParams.get('plan_id')
  const templates = searchParams.get('templates')

  // Buscar templates
  if (templates === 'true') {
    const { data, error } = await supabase
      .from('execution_templates')
      .select('*')
      .eq('active', true)
      .order('phase', { ascending: true })
      .order('task_order', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ templates: data })
  }

  // Buscar plano por match_id
  if (matchId) {
    const { data: plan, error } = await supabase
      .from('execution_plans')
      .select('*')
      .eq('match_id', matchId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!plan) {
      return NextResponse.json({ plan: null, tasks: [] })
    }

    // Buscar tasks do plano
    const { data: tasks } = await supabase
      .from('execution_tasks')
      .select('*')
      .eq('plan_id', plan.id)
      .order('phase', { ascending: true })
      .order('task_order', { ascending: true })

    return NextResponse.json({ plan, tasks: tasks || [] })
  }

  // Buscar plano por plan_id
  if (planId) {
    const { data: plan, error } = await supabase
      .from('execution_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: tasks } = await supabase
      .from('execution_tasks')
      .select('*, comments:execution_comments(*)')
      .eq('plan_id', planId)
      .order('phase', { ascending: true })
      .order('task_order', { ascending: true })

    return NextResponse.json({ plan, tasks: tasks || [] })
  }

  return NextResponse.json({ error: 'match_id, plan_id ou templates obrigatorio' }, { status: 400 })
}

// POST /api/execution — Acoes no plano de execucao
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })

  const body = await request.json()

  // Criar plano de execucao para um match
  if (body.action === 'create_plan') {
    if (!body.match_id) return NextResponse.json({ error: 'match_id obrigatorio' }, { status: 400 })

    const { data, error } = await supabase.rpc('create_execution_plan', { p_match_id: body.match_id })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('audit_log').insert({
      action: 'create',
      entity_type: 'execution_plan',
      entity_id: body.match_id,
      actor_id: user.id,
      details: { result: data },
    })

    return NextResponse.json({ result: data })
  }

  // Completar task
  if (body.action === 'complete_task') {
    if (!body.task_id) return NextResponse.json({ error: 'task_id obrigatorio' }, { status: 400 })

    const { data, error } = await supabase.rpc('complete_execution_task', {
      p_task_id: body.task_id,
      p_note: body.note || null,
      p_completed_by: body.completed_by || user.email,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ result: data })
  }

  // Iniciar task
  if (body.action === 'start_task') {
    if (!body.task_id) return NextResponse.json({ error: 'task_id obrigatorio' }, { status: 400 })

    const { data, error } = await supabase
      .from('execution_tasks')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.task_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ task: data })
  }

  // Bloquear task
  if (body.action === 'block_task') {
    if (!body.task_id) return NextResponse.json({ error: 'task_id obrigatorio' }, { status: 400 })

    const { data, error } = await supabase
      .from('execution_tasks')
      .update({
        status: 'blocked',
        blocked_reason: body.reason || 'Motivo nao informado',
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.task_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Atualizar blocked_tasks no plano
    const { count } = await supabase
      .from('execution_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', data.plan_id)
      .eq('status', 'blocked')

    await supabase
      .from('execution_plans')
      .update({ blocked_tasks: count || 0, updated_at: new Date().toISOString() })
      .eq('id', data.plan_id)

    return NextResponse.json({ task: data })
  }

  // Adicionar comentario
  if (body.action === 'add_comment') {
    if (!body.task_id || !body.content) {
      return NextResponse.json({ error: 'task_id e content obrigatorios' }, { status: 400 })
    }

    const { data: company } = await supabase
      .from('companies').select('id, nome_fantasia').eq('auth_user_id', user.id).single()

    const { data, error } = await supabase
      .from('execution_comments')
      .insert({
        task_id: body.task_id,
        company_id: company?.id || null,
        author_name: company?.nome_fantasia || user.email,
        content: body.content,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ comment: data })
  }

  // Checar SLAs vencidos
  if (body.action === 'check_slas') {
    const { data, error } = await supabase.rpc('check_sla_breaches')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ result: data })
  }

  return NextResponse.json({ error: 'action invalida' }, { status: 400 })
}
