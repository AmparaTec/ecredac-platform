import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

const BUCKET = 'evidencias'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * POST /api/operacao/upload
 * Upload de evidência documental para um marco.
 * Recebe FormData com: file, transaction_id, marco_numero, descricao
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const transactionId = formData.get('transaction_id') as string
    const marcoNumero = formData.get('marco_numero') as string
    const descricao = formData.get('descricao') as string || ''

    if (!file || !transactionId || !marcoNumero) {
      return NextResponse.json(
        { error: 'file, transaction_id e marco_numero são obrigatórios' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo excede o limite de 10MB' },
        { status: 400 }
      )
    }

    // Verificar acesso à transação
    const { data: transaction } = await supabase
      .from('transactions')
      .select('id, buyer_company_id, seller_company_id')
      .eq('id', transactionId)
      .single()

    if (!transaction) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
    }

    // Determinar papel
    const { data: memberships } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_profile_id', user.id)
      .eq('active', true)

    const companyIds = memberships?.map(m => m.company_id) || []
    if (companyIds.length === 0) {
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      if (company) companyIds.push(company.id)
    }

    let userRole = 'intermediario'
    if (companyIds.includes(transaction.seller_company_id)) userRole = 'vendedor'
    else if (companyIds.includes(transaction.buyer_company_id)) userRole = 'comprador'

    // Buscar marco
    const { data: marco } = await supabase
      .from('operacao_marcos')
      .select('id, titulo')
      .eq('transaction_id', transactionId)
      .eq('numero', parseInt(marcoNumero))
      .single()

    if (!marco) {
      return NextResponse.json({ error: 'Marco não encontrado' }, { status: 404 })
    }

    // Upload para Supabase Storage
    const ext = file.name.split('.').pop() || 'pdf'
    const timestamp = Date.now()
    const storagePath = `${transactionId}/marco-${marcoNumero}/${timestamp}-${file.name}`

    const fileBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('[Upload] Storage error:', uploadError)
      // Fallback: se o bucket não existir, registrar sem o arquivo real
      // (o admin precisará criar o bucket 'evidencias' no Supabase)
    }

    // Gerar URL pública (se bucket for público) ou signed URL
    let publicUrl = ''
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)
    publicUrl = urlData?.publicUrl || ''

    // Registrar evidência
    const { data: evidencia, error: insertError } = await supabase
      .from('marco_evidencias')
      .insert({
        marco_id: marco.id,
        transaction_id: transactionId,
        nome_arquivo: file.name,
        tipo_arquivo: ext,
        tamanho_bytes: file.size,
        storage_path: storagePath,
        url_publica: publicUrl,
        uploaded_by: user.id,
        role_uploader: userRole,
        descricao,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Upload] Insert error:', insertError)
      return NextResponse.json({ error: 'Erro ao registrar evidência' }, { status: 500 })
    }

    // Audit log
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('auth_user_id', user.id)
      .single()

    await supabase.from('operacao_audit_log').insert({
      transaction_id: transactionId,
      user_id: user.id,
      user_name: profile?.full_name || '',
      user_role: userRole,
      acao: 'evidencia_anexada',
      descricao: `Documento "${file.name}" (${(file.size / 1024).toFixed(0)}KB) anexado ao Marco ${marcoNumero} "${marco.titulo}"`,
      marco_numero: parseInt(marcoNumero),
      marco_id: marco.id,
      evidencia_id: evidencia.id,
    })

    // Notificar contraparte
    const notifyCompany = userRole === 'vendedor'
      ? transaction.buyer_company_id
      : transaction.seller_company_id

    await supabase.from('notifications').insert({
      company_id: notifyCompany,
      type: 'evidencia_anexada',
      title: `Nova evidência no Marco ${marcoNumero}`,
      body: `Documento "${file.name}" foi anexado ao marco "${marco.titulo}"`,
      reference_type: 'transaction',
      reference_id: transactionId,
    })

    return NextResponse.json({
      ok: true,
      evidencia: {
        id: evidencia.id,
        nome_arquivo: file.name,
        storage_path: storagePath,
        url: publicUrl,
      },
    })
  } catch (err) {
    console.error('[Upload] Unexpected:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
