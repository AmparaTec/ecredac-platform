import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nome, email, telefone, cnpj, perfil, mensagem } = body

    if (!nome || !email || !perfil) {
      return NextResponse.json(
        { error: 'Nome, e-mail e perfil são campos obrigatórios.' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
       console.error("Missing supabase credentials");
       return NextResponse.json({ error: 'Internal config error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          nome,
          email,
          telefone,
          cnpj,
          perfil,
          mensagem,
          origem: 'landing_page',
          status: 'novo',
        }
      ])
      .select()

    if (error) {
      console.error('Erro ao inserir lead:', error)
      return NextResponse.json(
        { error: 'Erro ao processar o formulário. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, lead: data[0] })
  } catch (error) {
    console.error('API /leads error:', error)
    return NextResponse.json(
      { error: 'Requisição inválida.' },
      { status: 400 }
    )
  }
}
