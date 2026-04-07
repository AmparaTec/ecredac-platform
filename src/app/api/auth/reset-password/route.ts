import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 8 caracteres.' },
        { status: 400 }
      )
    }

    // 1. Get the user's session from cookies (set during password recovery flow)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() as any {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options as any)
              )
            } catch {
              // Server Component context
            }
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Sessão expirada. Solicite um novo link de redefinição.' },
        { status: 401 }
      )
    }

    // 2. Use the admin client (service_role) to update the password
    //    This bypasses the "require current password" restriction
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { password }
    )

    if (updateError) {
      // Translate common error messages to PT-BR
      const msg = translateError(updateError.message)
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}

function translateError(message: string): string {
  const translations: Record<string, string> = {
    'Password should contain at least one character of each':
      'A senha deve conter pelo menos: uma letra minúscula, uma letra maiúscula e um número.',
    'Password is known to be weak and easy to guess':
      'Esta senha é muito comum e fácil de adivinhar. Escolha uma senha mais forte.',
    'New password should be different from the old password':
      'A nova senha deve ser diferente da senha atual.',
    'Password should be at least 6 characters':
      'A senha deve ter pelo menos 6 caracteres.',
    'Password should be at least 8 characters':
      'A senha deve ter pelo menos 8 caracteres.',
  }

  for (const [en, pt] of Object.entries(translations)) {
    if (message.includes(en)) return pt
  }

  if (message.includes('Password should contain')) {
    return 'A senha deve conter letras maiúsculas, minúsculas e números.'
  }

  return message
}
