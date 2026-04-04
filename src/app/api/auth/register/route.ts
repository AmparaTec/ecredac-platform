import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/auth/register
// Creates auth user + company record using admin client (bypasses RLS)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, cnpj, razaoSocial, nomeFantasia, tipo } = body

    if (!email || !password || !cnpj || !razaoSocial) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: email, password, cnpj, razaoSocial' },
        { status: 400 }
      )
    }

    // Use createClient from @supabase/supabase-js with service role key
    // This properly bypasses RLS (unlike the SSR createServerClient)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Create auth user (admin API — no email confirmation required)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for now
    })

    if (authError) {
      // Handle duplicate user
      if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'Este email ja esta cadastrado. Tente fazer login.' },
          { status: 409 }
        )
      }
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Erro ao criar usuario: ' + authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Erro inesperado ao criar usuario' },
        { status: 500 }
      )
    }

    // 2. Create company record (using admin client — bypasses RLS)
    const { data: company, error: compError } = await supabase
      .from('companies')
      .insert({
        auth_user_id: authData.user.id,
        cnpj: cnpj.replace(/\D/g, ''),
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia || razaoSocial.split(' ')[0],
        email,
        type: tipo || 'buyer',
        sefaz_status: 'pending',
        lgpd_consent: true,
        lgpd_consent_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (compError) {
      // Rollback: delete the auth user if company creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      console.error('Company insert error:', compError)

      if (compError.message?.includes('duplicate') || compError.message?.includes('unique')) {
        return NextResponse.json(
          { error: 'Este CNPJ ja esta cadastrado.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Erro ao criar empresa: ' + compError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user_id: authData.user.id,
      company_id: company?.id,
      message: 'Conta criada com sucesso!',
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
