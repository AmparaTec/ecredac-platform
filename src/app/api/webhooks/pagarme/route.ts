/**
 * POST /api/webhooks/pagarme
 *
 * Webhook handler para eventos de pagamento do Pagar.me.
 * Atualiza status da transação e dispara notificações.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/server'
import { verifyPagarmeWebhook, sendEmail } from '@/lib/integrations'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature') || ''

  // Verify webhook signature
  if (!verifyPagarmeWebhook(rawBody, signature)) {
    console.warn('[Webhook][Pagarme] Assinatura inválida')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { type: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = createAdminSupabase()
  const eventType = event.type

  console.info(`[Webhook][Pagarme] Evento: ${eventType}`)

  try {
    switch (eventType) {
      case 'order.paid': {
        const orderId = event.data.id as string
        const charges = event.data.charges as Array<{
          id: string
          status: string
          amount: number
          paid_at?: string
          payment_method: string
        }>
        const charge = charges?.[0]
        const metadata = event.data.metadata as Record<string, string> | undefined
        const transactionId = metadata?.transaction_id

        if (!transactionId) {
          console.warn('[Webhook][Pagarme] order.paid sem transaction_id no metadata')
          return NextResponse.json({ ok: true })
        }

        // Update transaction status
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .update({
            payment_status: 'paid',
            status: 'paid',
            payment_reference: orderId,
            payment_confirmed_at: charge?.paid_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', transactionId)
          .select('*, seller_company:companies!seller_company_id(*), buyer_company:companies!buyer_company_id(*)')
          .single()

        if (txError) {
          console.error('[Webhook][Pagarme] Erro ao atualizar transação:', txError.message)
          return NextResponse.json({ error: txError.message }, { status: 500 })
        }

        // Notify seller
        await supabase.from('notifications').insert({
          company_id: transaction.seller_company_id,
          type: 'payment_received',
          title: 'Pagamento recebido',
          body: `Pagamento de R$ ${(charge?.amount || 0) / 100} recebido para a transação.`,
          reference_type: 'transaction',
          reference_id: transactionId,
        })

        // Send email to both parties
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ecredac-platform.vercel.app'
        const amountFormatted = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format((charge?.amount || 0) / 100)

        await Promise.allSettled([
          sendEmail({
            to: transaction.seller_company?.email,
            template: 'payment_received',
            data: { amount: amountFormatted, method: charge?.payment_method, appUrl },
          }),
          sendEmail({
            to: transaction.buyer_company?.email,
            template: 'payment_confirmed',
            data: {
              transactionId: transactionId.slice(0, 8),
              amount: amountFormatted,
              method: charge?.payment_method,
              appUrl,
            },
          }),
        ])

        // Audit log
        await supabase.from('audit_log').insert({
          action: 'payment_confirmed',
          entity_type: 'transaction',
          entity_id: transactionId,
          details: { orderId, chargeId: charge?.id, amount: charge?.amount },
        })

        break
      }

      case 'charge.refunded':
      case 'charge.chargedback': {
        const metadata = event.data.metadata as Record<string, string> | undefined
        const transactionId = metadata?.transaction_id

        if (transactionId) {
          await supabase
            .from('transactions')
            .update({
              payment_status: eventType === 'charge.refunded' ? 'refunded' : 'chargedback',
              status: 'disputed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', transactionId)

          await supabase.from('audit_log').insert({
            action: eventType === 'charge.refunded' ? 'payment_refunded' : 'payment_chargedback',
            entity_type: 'transaction',
            entity_id: transactionId,
            details: event.data,
          })
        }
        break
      }

      default:
        console.info(`[Webhook][Pagarme] Evento não tratado: ${eventType}`)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Webhook][Pagarme] Erro:', (error as Error).message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
