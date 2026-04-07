/**
 * API: /api/perdcomp/poll
 *
 * POST — disparar polling de status RFB para PERDCOMPs pendentes
 *        Em produção integra com e-CAC scraper via webhook
 *        Por ora atualiza data_ultima_consulta e simula resposta
 */
import { createServerSupabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Mapeamento de transições de status RFB
const TRANSICOES_STATUS: Record<string, string[]> = {
  rascunho:      ['transmitido'],
  transmitido:   ['em_analise', 'indeferido'],
  em_analise:    ['deferido', 'indeferido', 'em_diligencia'],
  em_diligencia: ['deferido', 'indeferido'],
  deferido:      [],  // terminal
  indeferido:    ['recurso'],
  recurso:       ['deferido', 'indeferido_final'],
}

const STATUS_TERMINAIS = ['deferido', 'indeferido_final']

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: company } = await (supabase as any)
    .from('companies')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const { perdcomp_ids, force = false } = body

  // Buscar PERDCOMPs da empresa que precisam de polling
  let query = (supabase as any)
    .from('perdcomp_status')
    .select('*')
    .eq('company_id', company.id)
    .not('status', 'in', `(${STATUS_TERMINAIS.map(s => `"${s}"`).join(',')})`)

  if (perdcomp_ids?.length) {
    query = query.in('id', perdcomp_ids)
  }

  if (!force) {
    // Só fazer polling se última consulta foi há mais de 4 horas
    const limiar = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    query = query.or(`data_ultima_consulta.is.null,data_ultima_consulta.lt.${limiar}`)
  }

  const { data: perdcomps, error } = await query.limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!perdcomps?.length) {
    return NextResponse.json({ message: 'Nenhum PER/DCOMP necessita polling agora', polled: 0 })
  }

  const resultados: Array<{ id: string; numero: string; status_anterior: string; status_novo: string; atualizado: boolean }> = []
  const agora = new Date().toISOString()

  for (const perdcomp of perdcomps) {
    let statusNovo = perdcomp.status
    let atualizado = false

    // Tentar webhook externo de scraping (e-CAC integração)
    const webhookUrl = process.env.ECAC_SCRAPER_WEBHOOK_URL
    if (webhookUrl && perdcomp.numero_perdcomp) {
      try {
        const resp = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numero_perdcomp: perdcomp.numero_perdcomp,
            cnpj: company.id,
          }),
          signal: AbortSignal.timeout(10000),
        })
        if (resp.ok) {
          const data = await resp.json()
          if (data.status && data.status !== perdcomp.status) {
            statusNovo = data.status
            atualizado = true
          }
        }
      } catch (e) {
        // Webhook indisponível — continua com atualização de timestamp
      }
    }

    // Atualizar histórico
    const historico = Array.isArray(perdcomp.historico) ? perdcomp.historico : []
    if (atualizado) {
      historico.push({
        data: agora,
        status_anterior: perdcomp.status,
        status_novo: statusNovo,
        origem: 'poll_automatico',
      })
    }

    // Calcular prazo estimado
    const prazosEstimados: Record<string, number> = {
      transmitido: 30,
      em_analise: 60,
      em_diligencia: 90,
      recurso: 120,
    }

    await (supabase as any)
      .from('perdcomp_status')
      .update({
        status: statusNovo,
        data_ultima_consulta: agora,
        prazo_estimado_dias: prazosEstimados[statusNovo] ?? perdcomp.prazo_estimado_dias,
        historico: historico.length ? historico : perdcomp.historico,
        updated_at: agora,
      })
      .eq('id', perdcomp.id)

    // Notificar se status mudou
    if (atualizado) {
      await (supabase as any).from('notifications').insert({
        user_id: user.id,
        type: 'perdcomp_status_changed',
        title: 'Status PER/DCOMP atualizado',
        message: `${perdcomp.numero_perdcomp ?? 'PER/DCOMP'}: ${perdcomp.status} → ${statusNovo}`,
        metadata: { perdcomp_id: perdcomp.id, status_novo: statusNovo },
      })
    }

    resultados.push({
      id: perdcomp.id,
      numero: perdcomp.numero_perdcomp ?? '—',
      status_anterior: perdcomp.status,
      status_novo: statusNovo,
      atualizado,
    })
  }

  await (supabase as any).from('audit_log').insert({
    user_id: user.id,
    action: 'perdcomp_poll',
    resource_type: 'perdcomp_status',
    resource_id: company.id,
    metadata: { polled: resultados.length, atualizados: resultados.filter(r => r.atualizado).length },
  })

  return NextResponse.json({
    polled: resultados.length,
    atualizados: resultados.filter(r => r.atualizado).length,
    resultados,
    proxima_consulta: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  })
}
