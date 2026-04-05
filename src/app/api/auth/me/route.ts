import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * GET /api/auth/me
 * Retorna perfil + empresa do usuário autenticado
 */
export async function GET() {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const [{ data: profile }, { data: company }] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single(),
      supabase
        .from('companies')
        .select('*')
        .eq('auth_user_id', user.id)
        .single(),
    ])

    return NextResponse.json({ profile, company, email: user.email })
  } catch (err) {
    console.error('[Auth ME] GET:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * PATCH /api/auth/me
 * Atualiza perfil e/ou empresa do usuário autenticado
 * Body: { profile?: { full_name, phone }, company?: { nome_fantasia, email, phone, address_* } }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()

    // Update profile
    if (body.profile) {
      const { full_name, phone } = body.profile
      const updateData: Record<string, unknown> = {}
      if (full_name !== undefined) updateData.full_name = full_name.trim()
      if (phone !== undefined) updateData.phone = phone.trim()

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('auth_user_id', user.id)

        if (error) {
          console.error('[Auth ME] profile update:', error)
          return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
        }
      }
    }

    // Update company
    if (body.company) {
      const allowed = [
        'nome_fantasia', 'email', 'phone',
        'address_street', 'address_number', 'address_complement',
        'address_city', 'address_state', 'address_zip',
      ]

      const updateData: Record<string, unknown> = {}
      for (const key of allowed) {
        if (body.company[key] !== undefined) {
          updateData[key] = typeof body.company[key] === 'string'
            ? body.company[key].trim()
            : body.company[key]
        }
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('companies')
          .update(updateData)
          .eq('auth_user_id', user.id)

        if (error) {
          console.error('[Auth ME] company update:', error)
          return NextResponse.json({ error: 'Erro ao atualizar empresa' }, { status: 500 })
        }
      }
    }

    // Log
    await supabase.from('audit_log').insert({
      entity_type: 'user_profile',
      entity_id: user.id,
      action: 'profile_updated',
      description: 'Perfil atualizado pelo usuário',
      performed_by: user.id,
    }).then(() => {})

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Auth ME] PATCH:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
