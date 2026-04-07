import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import {
  parseEfdContribuicoes,
  salvarParseResult,
  calcularScoreVerificacao,
} from '@/lib/integrations/efd-parser'

// POST /api/efd-upload — Upload e parse de EFD-Contribuicoes
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  // Verificar company do usuario
  const { data: company } = await supabase
    .from('companies')
    .select('id, cnpj')
    .eq('auth_user_id', user.id)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Empresa nao encontrada' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Arquivo EFD obrigatorio' }, { status: 400 })
  }

  // Validar extensao
  const fileName = file.name.toLowerCase()
  if (!fileName.endsWith('.txt') && !fileName.endsWith('.efd')) {
    return NextResponse.json(
      { error: 'Formato invalido. Envie arquivo .txt ou .efd do SPED' },
      { status: 400 }
    )
  }

  // Limite de 50MB
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande (max 50MB)' }, { status: 400 })
  }

  // Ler conteudo do arquivo
  const content = await file.text()

  // Verificar se parece ser EFD (primeira linha deve conter |0000|)
  if (!content.includes('|0000|')) {
    return NextResponse.json(
      { error: 'Arquivo nao parece ser EFD-Contribuicoes valida (registro 0000 nao encontrado)' },
      { status: 400 }
    )
  }

  // Calcular hash SHA-256 para deduplicacao
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  // Verificar duplicata
  const { data: existing } = await supabase
    .from('efd_uploads')
    .select('id, status, periodo_inicio, periodo_fim')
    .eq('company_id', company.id)
    .eq('file_hash_sha256', fileHash)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      error: 'Este arquivo ja foi enviado anteriormente',
      upload_existente: existing,
    }, { status: 409 })
  }

  // Upload para Supabase Storage
  const storagePath = 'efd/' + company.id + '/' + Date.now() + '_' + file.name
  const { error: storageError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, {
      contentType: 'text/plain',
      upsert: false,
    })

  if (storageError) {
    return NextResponse.json(
      { error: 'Erro ao salvar arquivo: ' + storageError.message },
      { status: 500 }
    )
  }

  // Criar registro no banco
  const { data: upload, error: insertError } = await supabase
    .from('efd_uploads')
    .insert({
      company_id: company.id,
      uploaded_by: user.id,
      file_name: file.name,
      file_size_bytes: file.size,
      file_hash_sha256: fileHash,
      storage_path: storagePath,
      cnpj: company.cnpj || '',
      periodo_inicio: '2025-01-01', // placeholder, sera atualizado pelo parser
      periodo_fim: '2025-01-31',
      status: 'parsing',
    })
    .select()
    .single()

  if (insertError || !upload) {
    return NextResponse.json(
      { error: 'Erro ao registrar upload: ' + (insertError?.message || 'unknown') },
      { status: 500 }
    )
  }

  // Parse do arquivo
  try {
    const parseResult = parseEfdContribuicoes(content)

    // Salvar resultado do parse
    await salvarParseResult(supabase as any, upload.id, parseResult)

    // Calcular score de verificacao (sem cruzamento NF-e por enquanto)
    const score = calcularScoreVerificacao(parseResult, 0, parseResult.resumo.qtd_nfe_entrada)

    // Audit log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      company_id: company.id,
      action: 'create',
      entity_type: 'efd_upload',
      entity_id: upload.id,
      description: 'EFD-Contribuicoes enviada: ' + parseResult.resumo.periodo + ' | Saldo credor: R$ ' + parseResult.resumo.saldo_credor_total.toFixed(2),
    })

    return NextResponse.json({
      sucesso: true,
      upload_id: upload.id,
      resumo: parseResult.resumo,
      score_verificacao: score,
      erros_parse: parseResult.erros,
      mensagem: parseResult.resumo.saldo_credor_total > 0
        ? 'EFD processada com sucesso. Credito identificado: R$ ' + parseResult.resumo.saldo_credor_total.toFixed(2)
        : 'EFD processada. Nenhum saldo credor identificado neste periodo.',
    })
  } catch (e) {
    // Atualizar status para erro
    await supabase
      .from('efd_uploads')
      .update({ status: 'error', error_message: String(e) })
      .eq('id', upload.id)

    return NextResponse.json(
      { error: 'Erro ao processar EFD: ' + String(e), upload_id: upload.id },
      { status: 500 }
    )
  }
}

// GET /api/efd-upload — Listar uploads da empresa
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Empresa nao encontrada' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const uploadId = searchParams.get('id')

  if (uploadId) {
    // Buscar upload especifico com detalhes
    const { data, error } = await supabase
      .from('efd_uploads')
      .select('*, nfe_cruzamentos(count)')
      .eq('id', uploadId)
      .eq('company_id', company.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ upload: data })
  }

  // Listar todos os uploads
  const { data, error } = await supabase
    .from('efd_uploads')
    .select('id, file_name, cnpj, periodo_inicio, periodo_fim, status, saldo_credor_pis, saldo_credor_cofins, created_at')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ uploads: data })
}
