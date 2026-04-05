import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * GET /api/notifications
 * Retorna notificações do usuário autenticado.
 * Query params: ?unread=true&limit=20&offset=0
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar company do usuário
    const { data: membership } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_profile_id', user.id)
      .eq('active', true)
      .limit(1)
      .single()

    // Fallback: buscar company diretamente
    let companyId = membership?.company_id
    if (!companyId) {
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      companyId = company?.id
    }

    if (!companyId) {
      return NextResponse.json({ notifications: [], unread_count: 0 })
    }

    const url = new URL(request.url)
    const unreadOnly = url.searchParams.get('unread') === 'true'
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50)
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Buscar notificações
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data: notifications, count, error } = await query

    if (error) {
      console.error('[Notifications GET]', error)
      return NextResponse.json({ error: 'Erro ao buscar notificações' }, { status: 500 })
    }

    // Contagem de não-lidas (sempre retornar)
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('read', false)

    return NextResponse.json({
      notifications: notifications || [],
      total: count || 0,
      unread_count: unreadCount || 0,
    })
  } catch (err) {
    console.error('[Notifications GET] Unexpected:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * PATCH /api/notifications
 * Marca notificações como lidas.
 * Body: { ids: string[] } ou { all: true }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()

    // Buscar company
    const { data: membership } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_profile_id', user.id)
      .eq('active', true)
      .limit(1)
      .single()

    let companyId = membership?.company_id
    if (!companyId) {
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      companyId = company?.id
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const now = new Date().toISOString()

    if (body.all === true) {
      // Marcar todas como lidas
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: now })
        .eq('company_id', companyId)
        .eq('read', false)

      if (error) {
        return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
      }
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      // Marcar específicas como lidas
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: now })
        .eq('company_id', companyId)
        .in('id', body.ids)

      if (error) {
        return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: 'Envie { ids: [...] } ou { all: true }' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Notifications PATCH] Unexpected:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
