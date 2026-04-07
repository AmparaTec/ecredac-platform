/**
 * Sistema de notificações multi-canal.
 * Envia notificações via: in-app (banco), e-mail (Resend), WhatsApp (Meta API).
 *
 * Uso:
 *   await notify(supabase, {
 *     companyId: '...',
 *     type: 'match_encontrado',
 *     title: 'Novo match!',
 *     body: 'Crédito de R$ 500.000 conectado',
 *     referenceType: 'match',
 *     referenceId: match.id,
 *     channels: ['inapp', 'email', 'whatsapp'],
 *     whatsapp: { template: 'match_encontrado', params: { valor: '500.000', desagio: '15', url: '...' } },
 *     email: { template: 'match_found', data: { amount: '500.000', ... } },
 *   })
 */

import { sendWhatsAppTemplate, WhatsAppTemplate } from '@/lib/integrations/whatsapp'
import { sendEmail, type EmailTemplate, type EmailPayload } from '@/lib/integrations/resend'

type Channel = 'inapp' | 'email' | 'whatsapp'

interface NotifyOptions {
  companyId: string
  type: string
  title: string
  body: string
  referenceType?: string
  referenceId?: string

  /** Canais para enviar. Default: ['inapp'] */
  channels?: Channel[]

  /** Config WhatsApp (se incluído em channels) */
  whatsapp?: {
    template: WhatsAppTemplate
    params: Record<string, string>
    /** Se não informado, busca o phone da company */
    phone?: string
  }

  /** Config E-mail (se incluído em channels) */
  email?: {
    template: EmailTemplate
    data: Record<string, unknown>
    /** Se não informado, busca o email da company */
    to?: string
  }
}

/**
 * Envia notificação em todos os canais especificados.
 * Nunca lança exceção — erros são logados e ignorados.
 */
export async function notify(
  supabase: any,
  options: NotifyOptions
): Promise<void> {
  const channels = options.channels || ['inapp']

  const promises: Promise<void>[] = []

  // 1. In-app (banco)
  if (channels.includes('inapp')) {
    promises.push(
      supabase.from('notifications').insert({
        company_id: options.companyId,
        type: options.type,
        title: options.title,
        body: options.body,
        reference_type: options.referenceType || null,
        reference_id: options.referenceId || null,
      }).then(() => {}).catch((e: any) => {
        console.error('[Notify] inapp error:', e)
      })
    )
  }

  // 2. WhatsApp
  if (channels.includes('whatsapp') && options.whatsapp) {
    const whatsappTask = async () => {
      try {
        let phone = options.whatsapp!.phone
        if (!phone) {
          // Buscar phone da company
          const { data: company } = await supabase
            .from('companies')
            .select('phone')
            .eq('id', options.companyId)
            .single()
          phone = company?.phone
        }
        if (phone) {
          await sendWhatsAppTemplate(
            phone,
            options.whatsapp!.template,
            options.whatsapp!.params
          )
        }
      } catch (e) {
        console.error('[Notify] whatsapp error:', e)
      }
    }
    promises.push(whatsappTask())
  }

  // 3. E-mail
  if (channels.includes('email') && options.email) {
    const emailTask = async () => {
      try {
        let to = options.email!.to
        if (!to) {
          const { data: company } = await supabase
            .from('companies')
            .select('email')
            .eq('id', options.companyId)
            .single()
          to = company?.email
        }
        if (to) {
          await sendEmail({
            to,
            template: options.email!.template,
            data: options.email!.data,
          })
        }
      } catch (e) {
        console.error('[Notify] email error:', e)
      }
    }
    promises.push(emailTask())
  }

  await Promise.allSettled(promises)
}

// Re-export para conveniência
export type { EmailTemplate } from '@/lib/integrations/resend'
export type { WhatsAppTemplate } from '@/lib/integrations/whatsapp'
