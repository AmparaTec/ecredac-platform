import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * POST /api/compliance/kyc/upload
 * Upload de documento KYC.
 * FormData: file, doc_type, kyc_profile_id, emitido_em?, validade?
 */
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const docType = formData.get('doc_type') as string
  const kycProfileId = formData.get('kyc_profile_id') as string
  const emitidoEm = formData.get('emitido_em') as string | null
  const validade = formData.get('validade') as string | null

  if (!file || !docType || !kycProfileId) {
    return NextResponse.json(
      { error: 'Arquivo, tipo de documento e kyc_profile_id são obrigatórios' },
      { status: 400 }
    )
  }

  // Validar tamanho (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo: 10MB' }, { status: 400 })
  }

  // Validar tipo
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Tipo de arquivo não permitido. Aceitos: PDF, JPG, PNG, WebP' },
      { status: 400 }
    )
  }

  // Buscar KYC profile para obter company_id
  const { data: kycProfile } = await supabase
    .from('kyc_profiles')
    .select('company_id, status')
    .eq('id', kycProfileId)
    .single()

  if (!kycProfile) {
    return NextResponse.json({ error: 'Perfil KYC não encontrado' }, { status: 404 })
  }

  // Verificar se o usuário pertence à empresa
  const { data: membership } = await supabase
    .from('company_members')
    .select('id')
    .eq('user_profile_id', user.id)
    .eq('company_id', kycProfile.company_id)
    .limit(1)
    .single()

  if (!membership) {
    // Fallback: verificar companies.auth_user_id
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('id', kycProfile.company_id)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
  }

  // Upload para Supabase Storage
  const ext = file.name.split('.').pop() || 'pdf'
  const fileName = `${kycProfile.company_id}/${docType}_${Date.now()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('kyc-documents')
    .upload(fileName, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('[KYC Upload] Storage error:', uploadError)
    return NextResponse.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 })
  }

  // Criar registro no banco
  const { data: doc, error: dbError } = await supabase
    .from('kyc_documents')
    .insert({
      kyc_profile_id: kycProfileId,
      company_id: kycProfile.company_id,
      doc_type: docType,
      file_name: file.name,
      file_path: fileName,
      file_size: file.size,
      mime_type: file.type,
      emitido_em: emitidoEm || null,
      validade: validade || null,
    })
    .select()
    .single()

  if (dbError) {
    console.error('[KYC Upload] DB error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Audit log
  await supabase.from('audit_log').insert({
    entity_type: 'kyc_document',
    entity_id: doc.id,
    action: 'kyc_doc_uploaded',
    user_id: user.id,
    description: `Documento ${docType} enviado: ${file.name}`,
  }).catch(() => {})

  return NextResponse.json({ document: doc })
}

/**
 * DELETE /api/compliance/kyc/upload
 * Remove um documento KYC (somente se status = 'enviado' ou 'reprovado').
 * Body: { document_id }
 */
export async function DELETE(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()
  const { document_id } = body

  if (!document_id) {
    return NextResponse.json({ error: 'document_id obrigatório' }, { status: 400 })
  }

  // Buscar documento
  const { data: doc } = await supabase
    .from('kyc_documents')
    .select('*')
    .eq('id', document_id)
    .single()

  if (!doc) {
    return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
  }

  if (!['enviado', 'reprovado'].includes(doc.status)) {
    return NextResponse.json(
      { error: 'Só é possível remover documentos com status "enviado" ou "reprovado"' },
      { status: 400 }
    )
  }

  // Remover do storage
  await supabase.storage.from('kyc-documents').remove([doc.file_path]).catch(() => {})

  // Remover do banco
  const { error } = await supabase
    .from('kyc_documents')
    .delete()
    .eq('id', document_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
