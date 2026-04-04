import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// TEMPORARY: Cleanup orphaned records — REMOVE after use
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { cnpj, email } = body

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const results: any = {}

  // Delete company by CNPJ
  if (cnpj) {
    const digits = cnpj.replace(/\D/g, '')
    const { data, error } = await supabase
      .from('companies')
      .delete()
      .eq('cnpj', digits)
      .select()
    results.company_delete = { data, error: error?.message }
  }

  // Delete auth user by email
  if (email) {
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users?.users?.find((u: any) => u.email === email)
    if (user) {
      const { error } = await supabase.auth.admin.deleteUser(user.id)
      results.auth_delete = { user_id: user.id, error: error?.message }
    } else {
      results.auth_delete = { message: 'User not found' }
    }
  }

  return NextResponse.json(results)
}
