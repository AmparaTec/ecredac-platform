import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  await supabase.auth.signOut()

  const origin = request.nextUrl.origin
  return NextResponse.redirect(new URL('/login', origin), {
    status: 302,
  })
}
