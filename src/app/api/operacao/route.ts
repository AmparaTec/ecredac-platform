import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * GET /api/operacao?transaction_id=xxx
 * Retorna a jornada completa da operação:
 * - Marcos com status
 * - Evidências por marco
 * - Parcelas escrow
 * - Audit log
 *
 * Dual-view: filtra dados baseado no papel do usuário (comprador/vendedor/intermediário)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const transactionId = url.searchParams.get('transaction_id')
    if (!transactionId) {
      return NextResponse.json({ error: 'transaction_id obrigatório' }, { status: 400 })
    }

    // Buscar transação e verificar acesso
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*, buyer:buyer_company_id(id, razao_social, cnpj), seller:seller_company_id(id, razao_social, cnpj)')
      .eq('id', transactionId)
      .single()

    if (txError || !transaction) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
    }

    // Determinar papel do usuário
    const { data: memberships } = await supabase
      .from('company_members')
      .select('company_id, role')
      .eq('user_profile_id', user.id)
      .eq('active', true)

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    let userRole: 'vendedor' | 'comprador' | 'intermediario' = 'intermediario'
    const companyIds = memberships?.map(m => m.company_id) || []

    // Fallback: buscar company direto
    if (companyIds.length === 0) {
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      if (company) companyIds.push(company.id)
    }

    if (companyIds.includes(transaction.seller_company_id)) {
      userRole = 'vendedor'
    } else if (companyIds.includes(transaction.buyer_company_id)) {
      userRole = 'comprador'
    }

    // Buscar dados em paralelo
    const [marcosRes, evidenciasRes, escrowRes, auditRes] = await Promise.all([
      supabase
        .from('operacao_marcos')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('numero', { ascending: true }),
      supabase
        .from('marco_evidencias')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: true }),
      supabase
        .from('escrow_parcelas')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('numero_parcela', { ascending: true }),
      supabase
        .from('operacao_audit_log')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    // Agrupar evidências por marco
    const evidenciasPorMarco: Record<string, typeof evidenciasRes.data> = {}
    for (const ev of evidenciasRes.data || []) {
      if (!evidenciasPorMarco[ev.marco_id]) evidenciasPorMarco[ev.marco_id] = []
      evidenciasPorMarco[ev.marco_id].push(ev)
    }

    // Montar marcos com evidências
    const marcos = (marcosRes.data || []).map(m => ({
      ...m,
      evidencias: evidenciasPorMarco[m.id] || [],
    }))

    // Determinar marco atual
    const marcoAtual = marcos.find(m => m.status === 'em_andamento')?.numero ||
                       (marcos.filter(m => m.status === 'concluido').length + 1)

    // Dual-view: filtrar dados sensíveis por papel
    const transactionView = {
      id: transaction.id,
      status: transaction.status,
      credit_amount: transaction.credit_amount,
      discount_applied: transaction.discount_applied,
      total_payment: transaction.total_payment,
      platform_fee: userRole === 'intermediario' ? transaction.platform_fee : undefined,
      net_to_seller: userRole !== 'comprador' ? transaction.net_to_seller : undefined,
      created_at: transaction.created_at,
      // Comprador só vê dados mínimos do vendedor
      vendedor: userRole === 'comprador'
        ? { razao_social: (transaction.seller as any)?.razao_social, cnpj: (transaction.seller as any)?.cnpj }
        : transaction.seller,
      // Vendedor só vê dados mínimos do comprador
      comprador: userRole === 'vendedor'
        ? { razao_social: (transaction.buyer as any)?.razao_social, cnpj: (transaction.buyer as any)?.cnpj }
        : transaction.buyer,
    }

    return NextResponse.json({
      transaction: transactionView,
      marcos,
      escrow: escrowRes.data || [],
      audit_log: auditRes.data || [],
      marco_atual: marcoAtual,
      user_role: userRole,
      tagline: 'Visibilidade total. Acesso zero.',
    })
  } catch (err) {
    console.error('[Operacao GET] Unexpected:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * POST /api/operacao
 * Ações na operação:
 * - init_marcos: Criar marcos padrão para transação
 * - update_marco: Atualizar status de um marco
 * - upload_evidencia: Registrar evidência documental
 * - init_escrow: Criar parcelas escrow padrão
 * - liberar_parcela: Marcar parcela como liberável
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { action, transaction_id } = body

    if (!action || !transaction_id) {
      return NextResponse.json({ error: 'action e transaction_id obrigatórios' }, { status: 400 })
    }

    // Verificar acesso e determinar papel
    const { data: transaction } = await supabase
      .from('transactions')
      .select('id, buyer_company_id, seller_company_id, total_payment')
      .eq('id', transaction_id)
      .single()

    if (!transaction) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, full_name, role')
      .eq('auth_user_id', user.id)
      .single()

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

    let userRole: string = 'intermediario'
    if (companyIds.includes(transaction.seller_company_id)) userRole = 'vendedor'
    else if (companyIds.includes(transaction.buyer_company_id)) userRole = 'comprador'

    // ── Ações ──────────────────────────────────────

    if (action === 'init_marcos') {
      // Criar marcos padrão
      const { error } = await supabase.rpc('criar_marcos_operacao', { tx_id: transaction_id })
      if (error) {
        console.error('[Operacao] init_marcos:', error)
        return NextResponse.json({ error: 'Erro ao criar marcos' }, { status: 500 })
      }

      // Audit log
      await insertAuditLog(supabase, {
        transaction_id,
        user_id: user.id,
        user_name: profile?.full_name || 'Sistema',
        user_role: userRole,
        acao: 'marcos_criados',
        descricao: 'Marcos da jornada de confiança criados para a operação',
      })

      return NextResponse.json({ ok: true, message: 'Marcos criados com sucesso' })
    }

    if (action === 'update_marco') {
      const { marco_numero, status, protocolo_sefaz } = body

      if (!marco_numero || !status) {
        return NextResponse.json({ error: 'marco_numero e status obrigatórios' }, { status: 400 })
      }

      // Comprador não pode atualizar marcos
      if (userRole === 'comprador') {
        return NextResponse.json({ error: 'Compradores não podem atualizar marcos' }, { status: 403 })
      }

      const updateData: Record<string, unknown> = {
        status,
        atualizado_por: user.id,
        role_atualizador: userRole,
      }

      if (status === 'em_andamento') updateData.data_inicio = new Date().toISOString()
      if (status === 'concluido') updateData.data_conclusao = new Date().toISOString()
      if (protocolo_sefaz) updateData.protocolo_sefaz = protocolo_sefaz

      const { data: marco, error } = await supabase
        .from('operacao_marcos')
        .update(updateData)
        .eq('transaction_id', transaction_id)
        .eq('numero', marco_numero)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Erro ao atualizar marco' }, { status: 500 })
      }

      // Audit log
      await insertAuditLog(supabase, {
        transaction_id,
        user_id: user.id,
        user_name: profile?.full_name || '',
        user_role: userRole,
        acao: 'marco_atualizado',
        descricao: `Marco ${marco_numero} "${marco.titulo}" atualizado para "${status}"`,
        marco_numero,
        marco_id: marco.id,
      })

      // Verificar se alguma parcela escrow deve ser liberada
      if (status === 'concluido') {
        await supabase
          .from('escrow_parcelas')
          .update({ status: 'liberavel' })
          .eq('transaction_id', transaction_id)
          .eq('marco_liberacao', marco_numero)
          .eq('status', 'aguardando')

        // Notificação para ambas as partes
        const notifTitle = `Marco ${marco_numero} concluído`
        const notifBody = `"${marco.titulo}" foi concluído. ${marco_numero >= 5 ? 'Uma parcela de pagamento pode estar disponível para liberação.' : ''}`

        await Promise.all([
          supabase.from('notifications').insert({
            company_id: transaction.buyer_company_id,
            type: 'marco_concluido',
            title: notifTitle,
            body: notifBody,
            reference_type: 'transaction',
            reference_id: transaction_id,
          }),
          supabase.from('notifications').insert({
            company_id: transaction.seller_company_id,
            type: 'marco_concluido',
            title: notifTitle,
            body: notifBody,
            reference_type: 'transaction',
            reference_id: transaction_id,
          }),
        ])
      }

      return NextResponse.json({ ok: true, marco })
    }

    if (action === 'init_escrow') {
      const totalCentavos = body.total_centavos || Math.round((transaction.total_payment || 0) * 100)
      const parcelas = body.parcelas // Custom: [{ percentual, marco_liberacao }]

      if (parcelas && Array.isArray(parcelas)) {
        // Parcelas customizadas
        for (let i = 0; i < parcelas.length; i++) {
          const p = parcelas[i]
          await supabase.from('escrow_parcelas').upsert({
            transaction_id,
            numero_parcela: i + 1,
            percentual: p.percentual,
            valor_centavos: Math.round(totalCentavos * (p.percentual / 100)),
            marco_liberacao: p.marco_liberacao,
            status: 'aguardando',
          }, { onConflict: 'transaction_id,numero_parcela' })
        }
      } else {
        // Escrow padrão 20/30/50
        const { error } = await supabase.rpc('criar_escrow_padrao', {
          tx_id: transaction_id,
          total_centavos: totalCentavos,
        })
        if (error) {
          return NextResponse.json({ error: 'Erro ao criar escrow' }, { status: 500 })
        }
      }

      await insertAuditLog(supabase, {
        transaction_id,
        user_id: user.id,
        user_name: profile?.full_name || '',
        user_role: userRole,
        acao: 'escrow_criado',
        descricao: 'Parcelas de escrow criadas para a operação',
      })

      return NextResponse.json({ ok: true, message: 'Escrow criado' })
    }

    if (action === 'registrar_evidencia') {
      const { marco_numero, nome_arquivo, tipo_arquivo, tamanho_bytes, storage_path, descricao } = body

      if (!marco_numero || !nome_arquivo || !storage_path) {
        return NextResponse.json({ error: 'marco_numero, nome_arquivo e storage_path obrigatórios' }, { status: 400 })
      }

      // Buscar marco_id
      const { data: marco } = await supabase
        .from('operacao_marcos')
        .select('id, titulo')
        .eq('transaction_id', transaction_id)
        .eq('numero', marco_numero)
        .single()

      if (!marco) {
        return NextResponse.json({ error: 'Marco não encontrado' }, { status: 404 })
      }

      const { data: evidencia, error } = await supabase
        .from('marco_evidencias')
        .insert({
          marco_id: marco.id,
          transaction_id,
          nome_arquivo,
          tipo_arquivo: tipo_arquivo || 'pdf',
          tamanho_bytes: tamanho_bytes || 0,
          storage_path,
          uploaded_by: user.id,
          role_uploader: userRole,
          descricao: descricao || '',
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Erro ao registrar evidência' }, { status: 500 })
      }

      // Audit log
      await insertAuditLog(supabase, {
        transaction_id,
        user_id: user.id,
        user_name: profile?.full_name || '',
        user_role: userRole,
        acao: 'evidencia_anexada',
        descricao: `Documento "${nome_arquivo}" anexado ao marco ${marco_numero} "${marco.titulo}"`,
        marco_numero,
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
        title: `Nova evidência no Marco ${marco_numero}`,
        body: `Documento "${nome_arquivo}" foi anexado ao marco "${marco.titulo}"`,
        reference_type: 'transaction',
        reference_id: transaction_id,
      })

      return NextResponse.json({ ok: true, evidencia })
    }

    return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 })

  } catch (err) {
    console.error('[Operacao POST] Unexpected:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Helper
async function insertAuditLog(supabase: any, data: {
  transaction_id: string
  user_id: string
  user_name: string
  user_role: string
  acao: string
  descricao: string
  marco_numero?: number
  marco_id?: string
  evidencia_id?: string
  parcela_id?: string
}) {
  await supabase.from('operacao_audit_log').insert(data)
}
