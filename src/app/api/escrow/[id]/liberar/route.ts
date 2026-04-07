/**
 * API: /api/escrow/[id]/liberar
 *
 * PATCH — liberar parcela de escrow (após marco concluído)
 */
import { createServerSupabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { integrarPagarme } from '@/lib/integrations/pagarme'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: company } = await (supabase as any)
    .from('companies')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

  const parcelaId = params.id
  const body = await request.json()
  const { comprovante_url, evidencia } = body

  // Buscar parcela
  const { data: parcela } = await (supabase as any)
    .from('escrow_parcelas')
    .select('*, transactions!inner(seller_company_id, buyer_company_id)')
    .eq('id', parcelaId)
    .single()

  if (!parcela) return NextResponse.json({ error: 'Parcela não encontrada' }, { status: 404 })

  const tx = parcela.transactions
  if (tx.seller_company_id !== company.id && tx.buyer_company_id !== company.id) {
    return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  }

  if (parcela.status === 'liberado') {
    return NextResponse.json({ error: 'Parcela já liberada' }, { status: 422 })
  }

  // Verificar se marco foi concluído
  const { data: marco } = await (supabase as any)
    .from('operacao_marcos')
    .select('status, evidencia_verificada')
    .eq('id', parcela.marco_id)
    .single()

  if (marco && marco.status !== 'concluido') {
    return NextResponse.json({
      error: 'Marco ainda não concluído',
      marco_status: marco.status
    }, { status: 422 })
  }

  // Disparar pagamento no Pagar.me (se disponível)
  let paymentReference = parcela.payment_reference
  try {
    if (!paymentReference && process.env.PAGARME_API_KEY) {
      const pagarme = await integrarPagarme({
        valor_centavos: parcela.valor_centavos,
        descricao: `Escrow parcela ${parcela.numero_parcela} — liberação marco ${parcela.marco_liberacao}`,
        transaction_id: parcela.transaction_id,
        parcela_id: parcelaId,
      })
      paymentReference = pagarme?.id
    }
  } catch (e) {
    console.error('Pagar.me error:', e)
  }

  // Atualizar parcela para liberado
  const { data: updated, error } = await (supabase as any)
    .from('escrow_parcelas')
    .update({
      status: 'liberado',
      pago_em: new Date().toISOString(),
      comprovante_url: comprovante_url ?? null,
      payment_reference: paymentReference ?? null,
      notificacao_liberacao_enviada: false,
    })
    .eq('id', parcelaId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Verificar se todas as parcelas foram liberadas → fechar transação
  const { data: todasParcelas } = await (supabase as any)
    .from('escrow_parcelas')
    .select('status')
    .eq('transaction_id', parcela.transaction_id)

  const todasLiberadas = todasParcelas?.every((p: any) => p.status === 'liberado')
  if (todasLiberadas) {
    await (supabase as any)
      .from('transactions')
      .update({ status: 'completed', completed_at: new Date().toISOString(), payment_status: 'paid' })
      .eq('id', parcela.transaction_id)
  }

  // Notificação
  await (supabase as any).from('notifications').insert({
    user_id: user.id,
    type: 'escrow_liberado',
    title: `Parcela ${parcela.numero_parcela} liberada`,
    message: `R$ ${(parcela.valor_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} transferido`,
    metadata: { parcela_id: parcelaId, transaction_id: parcela.transaction_id },
  })

  await (supabase as any).from('audit_log').insert({
    user_id: user.id,
    action: 'escrow_liberado',
    resource_type: 'escrow_parcelas',
    resource_id: parcelaId,
    metadata: { marco_liberacao: parcela.marco_liberacao, valor_centavos: parcela.valor_centavos },
  })

  return NextResponse.json({ parcela: updated, transacao_concluida: todasLiberadas })
}
