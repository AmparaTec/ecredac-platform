import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import {
  getCachedConsulta,
  setCachedConsulta,
  executarDueDiligence,
  limparCacheExpirado,
  PORTAIS_PUBLICOS,
  type ConsultaTipo,
  type CadespData,
  type CndData,
  type CadinData,
  type ContaFiscalData,
  type DebitoEstadualData,
} from '@/lib/integrations/consultas-publicas'

// GET /api/consulta-publica?tipo=cadesp&cnpj=12345678000199
// GET /api/consulta-publica?cnpj=12345678000199  (due diligence completa)
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const cnpj = searchParams.get('cnpj')
  const tipo = searchParams.get('tipo') as ConsultaTipo | null

  if (!cnpj) {
    return NextResponse.json({ error: 'cnpj obrigatorio' }, { status: 400 })
  }

  // Limpar CNPJ (so numeros)
  const cnpjLimpo = cnpj.replace(/\D/g, '')
  if (cnpjLimpo.length !== 14) {
    return NextResponse.json({ error: 'CNPJ invalido (deve ter 14 digitos)' }, { status: 400 })
  }

  // Se nao especificou tipo, executa due diligence completa
  if (!tipo) {
    const result = await executarDueDiligence(supabase as any as any, cnpjLimpo, user.id)
    return NextResponse.json({ due_diligence: result })
  }

  // Consulta especifica por tipo
  const tiposValidos: ConsultaTipo[] = [
    'cnpj', 'cadesp', 'cnd_federal', 'cnd_estadual',
    'cadin', 'conta_fiscal', 'sintegra', 'certidao_cadastral'
  ]

  if (!tiposValidos.includes(tipo)) {
    return NextResponse.json(
      { error: 'Tipo invalido. Tipos aceitos: ' + tiposValidos.join(', ') },
      { status: 400 }
    )
  }

  // Buscar do cache
  type CacheTypes = CadespData | CndData | CadinData | ContaFiscalData | DebitoEstadualData
  const cached = await getCachedConsulta<CacheTypes>(supabase, tipo, cnpjLimpo)

  if (cached) {
    return NextResponse.json({
      tipo,
      cnpj: cnpjLimpo,
      dados: cached,
      fonte: 'cache',
    })
  }

  // Sem cache -- retornar instrucoes para consulta manual
  // (Na Sprint 2+, aqui entrara a automacao RPA/API)
  const portalKey = tipo === 'cadesp' ? 'cadesp_consulta'
    : tipo === 'cnd_federal' ? 'cnd_federal'
    : tipo === 'cnd_estadual' ? 'pge_sp_debitos'
    : tipo === 'cadin' ? 'cadin_sp'
    : tipo === 'conta_fiscal' ? 'conta_fiscal'
    : tipo === 'sintegra' ? 'sintegra_sp'
    : tipo === 'cnpj' ? 'cnpj_rfb'
    : null

  const portalUrl = portalKey ? PORTAIS_PUBLICOS[portalKey as keyof typeof PORTAIS_PUBLICOS] : null

  return NextResponse.json({
    tipo,
    cnpj: cnpjLimpo,
    dados: null,
    fonte: 'nenhuma',
    mensagem: 'Dados nao encontrados no cache. Consulte o portal oficial.',
    portal_url: portalUrl,
  })
}

// POST /api/consulta-publica -- Registrar resultado de consulta manual
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const { tipo, cnpj, dados, fonte_url } = body as {
    tipo: ConsultaTipo
    cnpj: string
    dados: Record<string, unknown>
    fonte_url?: string
  }

  if (!tipo || !cnpj || !dados) {
    return NextResponse.json(
      { error: 'tipo, cnpj e dados sao obrigatorios' },
      { status: 400 }
    )
  }

  const cnpjLimpo = cnpj.replace(/\D/g, '')
  if (cnpjLimpo.length !== 14) {
    return NextResponse.json({ error: 'CNPJ invalido' }, { status: 400 })
  }

  // Salvar no cache
  await setCachedConsulta(supabase, tipo, cnpjLimpo, dados, fonte_url, user.id)

  // Criar audit log
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (company) {
    await supabase.from('audit_log').insert({
      user_id: user.id,
      company_id: company.id,
      action: 'create',
      entity_type: 'consulta_publica',
      entity_id: cnpjLimpo,
      description: 'Consulta ' + tipo + ' registrada para CNPJ ' + cnpjLimpo,
    })
  }

  return NextResponse.json({
    sucesso: true,
    tipo,
    cnpj: cnpjLimpo,
    mensagem: 'Dados registrados no cache com sucesso',
  })
}

// DELETE /api/consulta-publica -- Limpar cache expirado (admin)
export async function DELETE() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  // Verificar se eh admin/procurador
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'procurador') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const removidos = await limparCacheExpirado(supabase)

  return NextResponse.json({
    sucesso: true,
    registros_removidos: removidos,
    mensagem: removidos + ' registros expirados removidos do cache',
  })
}
