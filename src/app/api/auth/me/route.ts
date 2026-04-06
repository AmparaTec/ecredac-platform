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
 *
 * Body:
 * {
 *   profile?: {
 *     full_name?: string,
 *     phone?: string,
 *     metadata?: Record<string, unknown>  // deep-merged into existing metadata
 *   },
 *   company?: {
 *     nome_fantasia?: string,
 *     email?: string,
 *     phone?: string,
 *     address?: {                          // jsonb column
 *       cep, logradouro, numero, complemento, bairro, cidade, uf
 *     },
 *     metadata?: Record<string, unknown>  // deep-merged into existing metadata
 *   }
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()

    // ── Update user profile ──────────────────────────────────────────
    if (body.profile) {
      const { full_name, phone, metadata: newMeta } = body.profile
      const updateData: Record<string, unknown> = {}

      if (full_name !== undefined) updateData.full_name = String(full_name).trim()
      if (phone !== undefined) updateData.phone = String(phone).trim()

      // Deep-merge metadata: fetch current → merge → save
      if (newMeta && typeof newMeta === 'object') {
        const { data: current } = await supabase
          .from('user_profiles')
          .select('metadata')
          .eq('auth_user_id', user.id)
          .single()

        updateData.metadata = {
          ...(current?.metadata || {}),
          ...newMeta,
        }
      }

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

    // ── Update company ───────────────────────────────────────────────
    if (body.company) {
      const { nome_fantasia, email, phone, address, metadata: newMeta } = body.company
      const updateData: Record<string, unknown> = {}

      if (nome_fantasia !== undefined) updateData.nome_fantasia = String(nome_fantasia).trim()
      if (email !== undefined) updateData.email = String(email).trim()
      if (phone !== undefined) updateData.phone = String(phone).trim()

      // address is a jsonb column — fetch current, deep-merge
      if (address && typeof address === 'object') {
        const { data: current } = await supabase
          .from('companies')
          .select('address')
          .eq('auth_user_id', user.id)
          .single()

        updateData.address = {
          ...(current?.address || {}),
          ...address,
        }
      }

      // metadata deep-merge
      if (newMeta && typeof newMeta === 'object') {
        const { data: current } = await supabase
          .from('companies')
          .select('metadata')
          .eq('auth_user_id', user.id)
          .single()

        updateData.metadata = {
          ...(current?.metadata || {}),
          ...newMeta,
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

    // Audit log (best-effort)
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
