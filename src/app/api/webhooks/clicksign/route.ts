/**
 * POST /api/webhooks/clicksign
 *
 * Webhook handler para eventos de assinatura do Clicksign.
 * Atualiza status do contrato nas execution_tasks e dispara notificações.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/server'
import { verifyClicksignWebhook, sendEmail } from '@/lib/integrations'
import type { WebhookPayload } from '@/lib/integrations/clicksign'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-clicksign-signature') || ''

  // Verify webhook signature
  if (!verifyClicksignWebhook(rawBody, signature)) {
    console.warn('[Webhook][Clicksign] Assinatura inválida')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = createAdminSupabase()
  const eventName = payload.event.name
  const documentKey = payload.document.key

  console.info(`[Webhook][Clicksign] Evento: ${eventName}, Doc: ${documentKey}`)

  try {
    switch (eventName) {
      case 'sign': {
        // Individual signature — update execution task
        const signerEmail = payload.signer?.email
        const signerName = payload.signer?.name
        const signedAt = payload.signer?.signed_at

        // Find the execution task related to this document
        const { data: task } = await supabase
          .from('execution_tasks')
          .select('*, plan:execution_plans(*)')
          .eq('document_id', documentKey)
          .single()

        if (task) {
          // Add comment about signature
          await supabase.from('execution_comments').insert({
            task_id: task.id,
            author_name: 'Clicksign',
            content: `${signerName} (${signerEmail}) assinou o documento em ${signedAt ? new Date(signedAt).toLocaleString('pt-BR') : 'agora'}.`,
          })

          // Notify related companies
          await supabase.from('notifications').insert({
            company_id: task.assigned_company_id,
            type: 'contract_signed_partial',
            title: `${signerName} assinou o contrato`,
            body: `Assinatura registrada via Clicksign.`,
            reference_type: 'execution_task',
            reference_id: task.id,
          })
        }

        // Audit
        await supabase.from('audit_log').insert({
          action: 'document_signed',
          entity_type: 'document',
          entity_id: documentKey,
          details: { signer: signerEmail, signed_at: signedAt },
        })

        break
      }

      case 'close':
      case 'auto_close': {
        // All parties signed — document is complete
        const { data: task } = await supabase
          .from('execution_tasks')
          .select('*, plan:execution_plans(*, match:matches(*))')
          .eq('document_id', documentKey)
          .single()

        if (task) {
          // Mark task as completed
          await supabase
            .from('execution_tasks')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              completed_by: 'Clicksign (auto)',
              completion_note: 'Todas as partes assinaram o documento.',
              updated_at: new Date().toISOString(),
            })
            .eq('id', task.id)

          // Update plan progress
          const { count: completedCount } = await supabase
            .from('execution_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('plan_id', task.plan_id)
            .eq('status', 'completed')

          const { count: totalCount } = await supabase
            .from('execution_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('plan_id', task.plan_id)

          const progress = totalCount ? Math.round(((completedCount || 0) / totalCount) * 100) : 0

          await supabase
            .from('execution_plans')
            .update({
              completed_tasks: completedCount || 0,
              overall_progress: progress,
              updated_at: new Date().toISOString(),
            })
            .eq('id', task.plan_id)

          // Get match data for notifications
          const match = task.plan?.match
          if (match) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ecredac-platform.vercel.app'

            // Notify both parties
            const notifications = [
              {
                company_id: match.seller_company_id,
                type: 'contract_signed',
                title: 'Contrato assinado por todas as partes',
                body: 'Todos os signatários assinaram o contrato. Próximo passo: Transferência SEFAZ.',
                reference_type: 'execution_task',
                reference_id: task.id,
              },
              {
                company_id: match.buyer_company_id,
                type: 'contract_signed',
                title: 'Contrato assinado por todas as partes',
                body: 'Todos os signatários assinaram o contrato. Próximo passo: Transferência SEFAZ.',
                reference_type: 'execution_task',
                reference_id: task.id,
              },
            ]
            await supabase.from('notifications').insert(notifications)

            // Send emails
            const transactionId = match.id?.slice(0, 8)
            await sendEmail({
              to: [match.seller_company?.email, match.buyer_company?.email].filter(Boolean),
              template: 'contract_signed',
              data: { transactionId, appUrl },
            })
          }
        }

        // Audit
        await supabase.from('audit_log').insert({
          action: 'document_closed',
          entity_type: 'document',
          entity_id: documentKey,
          details: { event: eventName },
        })

        break
      }

      case 'cancel': {
        // Document cancelled
        const { data: task } = await supabase
          .from('execution_tasks')
          .select('id, plan_id')
          .eq('document_id', documentKey)
          .single()

        if (task) {
          await supabase
            .from('execution_tasks')
            .update({
              status: 'blocked',
              blocked_reason: 'Documento cancelado no Clicksign',
              blocked_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', task.id)
        }

        await supabase.from('audit_log').insert({
          action: 'document_cancelled',
          entity_type: 'document',
          entity_id: documentKey,
        })

        break
      }

      default:
        console.info(`[Webhook][Clicksign] Evento não tratado: ${eventName}`)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Webhook][Clicksign] Erro:', (error as Error).message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
