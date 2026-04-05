import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * GET /api/compliance/kyc
 * Retorna o perfil KYC da empresa do usuário logado.
 * Admin pode passar ?company_id=xxx para ver de outra empresa.
 */
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const params = request.nextUrl.searchParams
  let companyId = params.get('company_id')

  // Se não é admin, buscar company do próprio usuário
  if (!companyId) {
    const { data: membership } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_profile_id', user.id)
      .limit(1)
      .single()

    if (!membership) {
      // Fallback: buscar via companies.auth_user_id
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('auth_user_id', user.id)
        .limit(1)
        .single()
      companyId = company?.id || null
    } else {
      companyId = membership.company_id
    }
  }

  if (!companyId) {
    return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
  }

  // Buscar perfil KYC
  const { data: kyc, error } = await supabase
    .from('kyc_profiles')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Buscar documentos
  const { data: documents } = await supabase
    .from('kyc_documents')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  // Buscar dados da empresa para pré-preencher
  const { data: company } = await supabase
    .from('companies')
    .select('legal_name, cnpj, inscricao_estadual, phone, email, address_street, address_city, address_state, address_zip')
    .eq('id', companyId)
    .single()

  return NextResponse.json({
    kyc: kyc || null,
    documents: documents || [],
    company,
    companyId,
  })
}

/**
 * POST /api/compliance/kyc
 * Cria ou atualiza o perfil KYC da empresa.
 */
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()

  // Encontrar company do usuário
  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_profile_id', user.id)
    .limit(1)
    .single()

  let companyId = membership?.company_id
  if (!companyId) {
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('auth_user_id', user.id)
      .limit(1)
      .single()
    companyId = company?.id
  }

  if (!companyId) {
    return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
  }

  const kycData = {
    company_id: companyId,
    razao_social: body.razao_social,
    cnpj: body.cnpj,
    inscricao_estadual: body.inscricao_estadual,
    endereco_completo: body.endereco_completo,
    cep: body.cep,
    cidade: body.cidade,
    uf: body.uf,
    nome_representante: body.nome_representante,
    cpf_representante: body.cpf_representante,
    cargo_representante: body.cargo_representante,
    faturamento_anual_declarado: body.faturamento_anual_declarado || null,
    setor_atividade: body.setor_atividade,
    cnae_principal: body.cnae_principal,
    pep: body.pep || false,
    pep_descricao: body.pep_descricao || null,
  }

  // Upsert: se já existe, atualiza; se não, cria
  const { data: existing } = await supabase
    .from('kyc_profiles')
    .select('id, status')
    .eq('company_id', companyId)
    .single()

  let result
  if (existing) {
    // Não permitir edição se já aprovado (precisa solicitar recadastramento)
    if (existing.status === 'aprovado') {
      return NextResponse.json(
        { error: 'KYC já aprovado. Para atualizar, solicite recadastramento.' },
        { status: 400 }
      )
    }
    result = await supabase
      .from('kyc_profiles')
      .update({ ...kycData, status: 'pendente' })
      .eq('id', existing.id)
      .select()
      .single()
  } else {
    result = await supabase
      .from('kyc_profiles')
      .insert(kycData)
      .select()
      .single()
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  // Audit log
  await supabase.from('audit_log').insert({
    entity_type: 'kyc_profile',
    entity_id: result.data.id,
    action: existing ? 'kyc_updated' : 'kyc_created',
    user_id: user.id,
    description: `KYC ${existing ? 'atualizado' : 'criado'} para empresa ${companyId}`,
  })

  return NextResponse.json({ kyc: result.data })
}

/**
 * PATCH /api/compliance/kyc
 * Admin: aprovar/reprovar KYC, ou submeter para análise.
 * Body: { kyc_id, action: 'submit' | 'approve' | 'reject', reason?: string }
 */
export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()
  const { kyc_id, action, reason } = body

  if (!kyc_id || !action) {
    return NextResponse.json({ error: 'kyc_id e action são obrigatórios' }, { status: 400 })
  }

  // Submit: o próprio usuário submete para análise
  if (action === 'submit') {
    const { error } = await supabase
      .from('kyc_profiles')
      .update({ status: 'em_analise' })
      .eq('id', kyc_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('audit_log').insert({
      entity_type: 'kyc_profile',
      entity_id: kyc_id,
      action: 'kyc_submitted',
      user_id: user.id,
      description: 'KYC submetido para análise',
    })

    return NextResponse.json({ ok: true, status: 'em_analise' })
  }

  // Approve/Reject: somente admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  if (action === 'approve') {
    const { error } = await supabase
      .from('kyc_profiles')
      .update({
        status: 'aprovado',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 ano
      })
      .eq('id', kyc_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('audit_log').insert({
      entity_type: 'kyc_profile',
      entity_id: kyc_id,
      action: 'kyc_approved',
      user_id: user.id,
      description: 'KYC aprovado pelo admin',
    })

    return NextResponse.json({ ok: true, status: 'aprovado' })
  }

  if (action === 'reject') {
    const { error } = await supabase
      .from('kyc_profiles')
      .update({
        status: 'reprovado',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason || 'Documentação insuficiente',
      })
      .eq('id', kyc_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('audit_log').insert({
      entity_type: 'kyc_profile',
      entity_id: kyc_id,
      action: 'kyc_rejected',
      user_id: user.id,
      description: `KYC reprovado: ${reason || 'Documentação insuficiente'}`,
    })

    return NextResponse.json({ ok: true, status: 'reprovado' })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
