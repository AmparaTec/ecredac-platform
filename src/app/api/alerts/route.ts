import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// GET /api/alerts — Listar alertas do usuario
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })

  const { data: company } = await supabase
    .from('companies').select('id').eq('auth_user_id', user.id).single()
  if (!company) return NextResponse.json({ error: 'Empresa nao encontrada' }, { status: 404 })

  const { data, error } = await supabase
    .from('match_alerts')
    .select('*')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ alerts: data })
}

// POST /api/alerts — Criar novo alerta
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })

  const { data: company } = await supabase
    .from('companies').select('id').eq('auth_user_id', user.id).single()
  if (!company) return NextResponse.json({ error: 'Empresa nao encontrada' }, { status: 404 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('match_alerts')
    .insert({
      company_id: company.id,
      name: body.name,
      alert_type: body.alert_type || 'credit',
      credit_types: body.credit_types || null,
      origins: body.origins || null,
      min_amount: body.min_amount || null,
      max_amount: body.max_amount || null,
      min_grade: body.min_grade || null,
      max_discount: body.max_discount || null,
      min_discount: body.min_discount || null,
      channel: body.channel || 'in_app',
      max_triggers: body.max_triggers || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ alert: data })
}

// PUT /api/alerts — Atualizar alerta (toggle, editar)
export async function PUT(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })

  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 })

  const updates: any = {}
  if (body.active !== undefined) updates.active = body.active
  if (body.name) updates.name = body.name
  if (body.credit_types !== undefined) updates.credit_types = body.credit_types
  if (body.origins !== undefined) updates.origins = body.origins
  if (body.min_amount !== undefined) updates.min_amount = body.min_amount
  if (body.max_amount !== undefined) updates.max_amount = body.max_amount
  if (body.min_grade !== undefined) updates.min_grade = body.min_grade
  if (body.max_discount !== undefined) updates.max_discount = body.max_discount
  if (body.channel) updates.channel = body.channel
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('match_alerts')
    .update(updates)
    .eq('id', body.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ alert: data })
}

// DELETE /api/alerts — Excluir alerta
export async function DELETE(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 })

  const { error } = await supabase.from('match_alerts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
