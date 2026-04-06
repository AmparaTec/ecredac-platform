import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/auth/send-reset-email
 * Envia e-mail de redefinição de senha para o usuário autenticado
 */
export async function POST() {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Use anon client to send the reset email (public API)
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await anonClient.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://relius.com.br'}/auth/reset-password`,
    })

    if (error) {
      return NextResponse.json({ error: 'Erro ao enviar e-mail de redefinição' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[send-reset-email]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
