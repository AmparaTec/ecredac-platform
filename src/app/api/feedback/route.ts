import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// Service role client — ignora RLS, usado server-side apenas
function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

// POST /api/feedback — Salvar feedback do usuário
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, message, page } = body

    // Validações básicas
    if (!message || typeof message !== 'string' || message.trim().length < 3) {
      return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 })
    }
    if (!['bug', 'melhoria', 'elogio', 'outro'].includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }
    if (message.trim().length > 2000) {
      return NextResponse.json({ error: 'Mensagem muito longa (máx. 2000 caracteres)' }, { status: 400 })
    }

    // Identificar usuário autenticado (opcional — feedback anônimo também é aceito)
    const userSupabase = createServerSupabase()
    const { data: { user } } = await userSupabase.auth.getUser()

    // Usar admin client para inserir sem restrição de RLS
    const adminSupabase = createAdminSupabase()
    const { error } = await adminSupabase.from('feedback').insert({
      user_id: user?.id ?? null,
      type,
      message: message.trim(),
      page: page ?? null,
      user_agent: request.headers.get('user-agent') ?? null,
      status: 'novo',
    })

    if (error) {
      console.error('[feedback] Erro ao salvar:', error)
      return NextResponse.json({ error: 'Erro ao salvar feedback' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[feedback] Erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/feedback — Listar feedbacks (titulares apenas)
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Verificar se é titular
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'titular') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // novo, em_analise, resolvido, all
  const type = searchParams.get('type')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

  const adminSupabase = createAdminSupabase()
  let query = adminSupabase
    .from('feedback')
    .select('id, type, message, page, status, created_at, user_id, user_agent')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  if (type && type !== 'all') {
    query = query.eq('type', type)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ feedbacks: data, total: data?.length ?? 0 })
}

// PATCH /api/feedback — Atualizar status (titulares apenas)
export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'titular') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { id, status } = await request.json()
  if (!id || !['novo', 'em_analise', 'resolvido', 'descartado'].includes(status)) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const adminSupabase = createAdminSupabase()
  const { error } = await adminSupabase
    .from('feedback')
    .update({ status })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
