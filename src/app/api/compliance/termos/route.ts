import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createHash } from 'crypto'

/**
 * GET /api/compliance/termos
 * Retorna termos vigentes e quais o usuário já aceitou.
 * ?pending=true → retorna apenas os pendentes de aceite
 */
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const pending = request.nextUrl.searchParams.get('pending') === 'true'

  // Todos os termos ativos e obrigatórios
  const { data: termos } = await supabase
    .from('termos_vigentes')
    .select('*')
    .eq('ativo', true)
    .order('publicado_em', { ascending: false })

  // Aceites do usuário
  const { data: aceites } = await supabase
    .from('aceites_termos')
    .select('tipo, versao, aceito_em')
    .eq('user_id', user.id)

  const aceitesMap = new Map<string, { versao: string; aceito_em: string }>()
  aceites?.forEach(a => {
    const key = `${a.tipo}_${a.versao}`
    aceitesMap.set(key, { versao: a.versao, aceito_em: a.aceito_em })
  })

  const result = (termos || []).map(t => {
    const key = `${t.tipo}_${t.versao}`
    const aceite = aceitesMap.get(key)
    return {
      ...t,
      aceito: !!aceite,
      aceito_em: aceite?.aceito_em || null,
    }
  })

  if (pending) {
    const pendentes = result.filter(t => t.obrigatorio && !t.aceito)
    return NextResponse.json({ termos: pendentes, allAccepted: pendentes.length === 0 })
  }

  return NextResponse.json({
    termos: result,
    allAccepted: result.filter(t => t.obrigatorio && !t.aceito).length === 0,
  })
}

/**
 * POST /api/compliance/termos
 * Registra aceite de um ou mais termos.
 * Body: { aceites: [{ tipo, versao }] }
 */
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()
  const { aceites } = body as { aceites: Array<{ tipo: string; versao: string }> }

  if (!aceites || !Array.isArray(aceites) || aceites.length === 0) {
    return NextResponse.json({ error: 'Informe os termos aceitos' }, { status: 400 })
  }

  // Buscar company do usuário
  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_profile_id', user.id)
    .limit(1)
    .single()

  const companyId = membership?.company_id || null

  // Extrair IP e User-Agent do request
  const ip = request.headers.get('x-forwarded-for')
    || request.headers.get('x-real-ip')
    || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  const inserts = []

  for (const aceite of aceites) {
    // Verificar se o termo existe e está ativo
    const { data: termo } = await supabase
      .from('termos_vigentes')
      .select('id, conteudo')
      .eq('tipo', aceite.tipo)
      .eq('versao', aceite.versao)
      .eq('ativo', true)
      .single()

    if (!termo) continue

    // Hash do conteúdo do documento (prova de integridade)
    const docHash = createHash('sha256').update(termo.conteudo).digest('hex')

    // Verificar se já aceitou esta versão
    const { data: existing } = await supabase
      .from('aceites_termos')
      .select('id')
      .eq('user_id', user.id)
      .eq('tipo', aceite.tipo)
      .eq('versao', aceite.versao)
      .limit(1)
      .single()

    if (existing) continue // Já aceito

    inserts.push({
      user_id: user.id,
      company_id: companyId,
      tipo: aceite.tipo,
      versao: aceite.versao,
      ip_address: ip,
      user_agent: userAgent,
      document_hash: docHash,
    })
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from('aceites_termos').insert(inserts)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Audit log
    await supabase.from('audit_log').insert({
      entity_type: 'aceite_termos',
      entity_id: user.id,
      action: 'termos_aceitos',
      user_id: user.id,
      description: `Termos aceitos: ${inserts.map(i => `${i.tipo} v${i.versao}`).join(', ')}`,
      metadata: { termos: inserts.map(i => ({ tipo: i.tipo, versao: i.versao })) },
    })
  }

  return NextResponse.json({
    ok: true,
    accepted: inserts.length,
    message: inserts.length > 0
      ? `${inserts.length} termo(s) aceito(s) com sucesso`
      : 'Todos os termos já haviam sido aceitos',
  })
}
