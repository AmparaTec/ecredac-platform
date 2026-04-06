import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * POST /api/marketplace/[id]/indicar
 * Procurador indica um crédito para um cliente
 * Transição: inferido → indicado
 *
 * Body:
 * {
 *   "cnpj_comprador": "11222333000181",
 *   "email_comprador": "buyer@company.com",
 *   "mensagem": "Tenho um cliente interessado nesse crédito"
 * }
 *
 * Fluxo:
 * 1. Valida se procurador tem permissão (é usuário logado)
 * 2. Valida se crédito existe e está em inferido
 * 3. Registra interesse em interesses_credito
 * 4. Atualiza credit_listing → nivel = 'indicado'
 * 5. Envia notificação ao vendedor
 * 6. Envia email ao comprador
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    )
  }

  try {
    const {
      cnpj_comprador,
      email_comprador,
      mensagem,
    } = await request.json()

    // Validação básica
    if (!cnpj_comprador || !email_comprador) {
      return NextResponse.json(
        {
          error: 'cnpj_comprador e email_comprador são obrigatórios',
        },
        { status: 400 }
      )
    }

    // 1. Busca crédito
    const { data: credito, error: erroCredito } = await supabase
      .from('credit_listings')
      .select('*')
      .eq('id', params.id)
      .single()

    if (erroCredito || !credito) {
      return NextResponse.json(
        { error: 'Crédito não encontrado' },
        { status: 404 }
      )
    }

    // Valida estado: apenas inferido pode ser indicado
    if (credito.nivel !== 'inferido') {
      return NextResponse.json(
        {
          error: `Crédito está em nível "${credito.nivel}", não pode ser indicado novamente`,
        },
        { status: 400 }
      )
    }

    // 2. Registra interesse
    const { data: interesse, error: erroInteresse } = await supabase
      .from('interesses_credito')
      .insert({
        credito_id: credito.id,
        comprador_user_id: user.id,
        tipo: 'indicacao_procurador',
        mensagem,
      })
      .select()
      .single()

    if (erroInteresse) {
      console.error('Erro ao registrar interesse:', erroInteresse)
      return NextResponse.json(
        { error: 'Erro ao registrar interesse' },
        { status: 500 }
      )
    }

    // 3. Atualiza crédito → indicado
    const { data: creditoAtualizado, error: erroUpdate } = await supabase
      .from('credit_listings')
      .update({
        nivel: 'indicado',
        indicado_por: user.id,
        indicado_em: new Date().toISOString(),
        origem_indicacao: 'procurador',
        qtd_interessados: (credito.qtd_interessados || 0) + 1,
        ultimo_interesse_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (erroUpdate) {
      console.error('Erro ao atualizar crédito:', erroUpdate)
      return NextResponse.json(
        { error: 'Erro ao atualizar crédito' },
        { status: 500 }
      )
    }

    // 4. Cria notificação para vendedor
    if (credito.company_id) {
      await supabase.from('notifications').insert({
        usuario_id: credito.company_id, // TODO: mapear para dono da empresa
        tipo: 'novo_interesse',
        titulo: 'Novo interesse em crédito',
        mensagem: `Procurador indicou um comprador para ${credito.credit_id}`,
        metadata: {
          credito_id: credito.id,
          comprador_cnpj: cnpj_comprador,
          comprador_email: email_comprador,
        },
      })
    }

    // 5. Envia email ao comprador via Resend
    // TODO: integrar com API de email Resend
    // await sendEmailResend({
    //   to: email_comprador,
    //   template: 'credito-indicado',
    //   data: {
    //     credit_id: credito.credit_id,
    //     amount: credito.amount,
    //     procurador: user.email,
    //     mensagem
    //   }
    // })

    return NextResponse.json({
      success: true,
      credito: creditoAtualizado,
      interesse_id: interesse.id,
    })
  } catch (erro) {
    console.error('❌ Erro em /indicar:', erro)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
