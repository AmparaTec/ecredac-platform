import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * POST /api/marketplace/[id]/ativar
 * Ativa um crédito indicado → transição inferido/indicado → ativado
 *
 * Body:
 * {
 *   "action": "ativar",
 *   "dados_comprador": {
 *     "cnpj": "11222333000181",
 *     "email": "buyer@company.com",
 *     "telefone": "11987654321"
 *   }
 * }
 *
 * Fluxo:
 * 1. Valida se crédito existe e está em nível indicado
 * 2. Cria registro em aceites_termos (fase: negociacao)
 * 3. Atualiza credit_listing → nivel = 'ativado'
 * 4. Cria notificação para procurador
 * 5. Envia email via Resend
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
    const { action, dados_comprador } = await request.json()

    if (action !== 'ativar') {
      return NextResponse.json(
        { error: 'Action inválida' },
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

    // Valida estado: apenas indicado pode ser ativado
    if (credito.nivel !== 'indicado') {
      return NextResponse.json(
        {
          error: `Crédito está em nível "${credito.nivel}", não pode ser ativado`,
        },
        { status: 400 }
      )
    }

    // 2. Cria aceite de termos (negociação)
    const { data: aceiteTermo, error: erroAceite } = await supabase
      .from('aceites_termos')
      .insert({
        usuario_id: user.id,
        credito_id: credito.id,
        fase: 'negociacao',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
        metadata: {
          dados_comprador,
          timestamp: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (erroAceite) {
      return NextResponse.json(
        { error: 'Erro ao registrar aceite de termos' },
        { status: 500 }
      )
    }

    // 3. Atualiza crédito → ativado
    const { data: creditoAtualizado, error: erroUpdate } = await supabase
      .from('credit_listings')
      .update({
        nivel: 'ativado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (erroUpdate) {
      return NextResponse.json(
        { error: 'Erro ao atualizar nível do crédito' },
        { status: 500 }
      )
    }

    // 4. Cria notificação para procurador (se existir)
    if (credito.indicado_por) {
      await supabase.from('notifications').insert({
        usuario_id: credito.indicado_por,
        tipo: 'credito_ativado',
        titulo: 'Crédito ativado!',
        mensagem: `O crédito ${credito.credit_id} foi ativado. Valor: R$ ${credito.amount}`,
        metadata: {
          credito_id: credito.id,
          comprador: dados_comprador.email,
        },
      })
    }

    // 5. Envia email via Resend
    // TODO: integrar com API de email Resend
    // await sendEmailResend({
    //   to: dados_comprador.email,
    //   template: 'credito-ativado',
    //   data: {
    //     credit_id: credito.credit_id,
    //     amount: credito.amount,
    //     procurador: credito.indicado_por
    //   }
    // })

    return NextResponse.json({
      success: true,
      credito: creditoAtualizado,
      aceite_termo_id: aceiteTermo.id,
    })
  } catch (erro) {
    console.error('❌ Erro em /ativar:', erro)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
