/**
 * API Route: /api/nfe-cruzamento
 *
 * POST - Upload NF-e XMLs, parse, validate against SEFAZ, cross with credit_listings
 * GET  - Retrieve cruzamento results for a company
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { parseNfeXml, validateNfeForIcms } from '@/lib/nfe/nfe-parser'
import { consultarSefaz, validarChaveNfe, getUfFromChave } from '@/lib/nfe/sefaz-provider'

// ─── GET: list cruzamentos for company ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')
    const efdUploadId = searchParams.get('efd_upload_id')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = (supabase as any)
      .from('nfe_cruzamentos')
      .select('*, nfe_itens(count)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (companyId) query = query.eq('company_id', companyId)
    if (efdUploadId) query = query.eq('efd_upload_id', efdUploadId)
    if (status) query = query.eq('sefaz_status', status)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Summary stats
    const { data: stats } = await (supabase as any)
      .from('nfe_cruzamentos')
      .select('sefaz_status, divergencia_icms, valor_icms_nfe')
      .eq('company_id', companyId)

    const summary = {
      total: stats?.length || 0,
      autorizadas: stats?.filter((s: any) => s.sefaz_status === 'autorizada').length || 0,
      canceladas: stats?.filter((s: any) => s.sefaz_status === 'cancelada').length || 0,
      pendentes: stats?.filter((s: any) => s.sefaz_status === 'pendente').length || 0,
      comDivergencia: stats?.filter((s: any) => s.divergencia_icms).length || 0,
      valorTotalIcms: stats?.reduce((acc: number, s: any) => acc + (parseFloat(s.valor_icms_nfe) || 0), 0) || 0,
    }

    return NextResponse.json({ data, count, summary, page, limit })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    )
  }
}

// ─── POST: upload + parse + validate + cross ────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { xmlFiles, companyId, efdUploadId, creditListingId } = body as {
      xmlFiles: string[]    // Array of NF-e XML strings
      companyId: string
      efdUploadId?: string
      creditListingId?: string
    }

    if (!xmlFiles || !Array.isArray(xmlFiles) || xmlFiles.length === 0) {
      return NextResponse.json({ error: 'Nenhum XML enviado' }, { status: 400 })
    }
    if (!companyId) {
      return NextResponse.json({ error: 'company_id obrigatório' }, { status: 400 })
    }

    const results = {
      total: xmlFiles.length,
      processados: 0,
      erros: 0,
      cruzamentos: [] as any[],
      resumo: {
        autorizadas: 0,
        canceladas: 0,
        denegadas: 0,
        naoEncontradas: 0,
        erroSefaz: 0,
        comDivergencia: 0,
        valorTotalIcms: 0,
      }
    }

    for (const xmlString of xmlFiles) {
      try {
        // 1. Parse XML
        const parsed = parseNfeXml(xmlString)
        const validation = validateNfeForIcms(parsed)

        if (!validation.valid) {
          results.erros++
          results.cruzamentos.push({
            chave: parsed.header.chaveNfe || 'desconhecida',
            status: 'erro_parse',
            errors: validation.errors,
          })
          continue
        }

        // 2. Validate chave format
        const chave = parsed.header.chaveNfe
        if (!validarChaveNfe(chave)) {
          results.erros++
          results.cruzamentos.push({
            chave,
            status: 'erro_chave_invalida',
            errors: ['Chave de acesso com dígito verificador inválido'],
          })
          continue
        }

        // 3. Consult SEFAZ
        const sefazResult = await consultarSefaz(chave)

        // 4. Check for ICMS divergence
        const divergenciaIcms = sefazResult.valorIcms !== undefined &&
          Math.abs(sefazResult.valorIcms - parsed.header.valorIcms) > 0.01

        // 5. Insert cruzamento record
        const cruzamentoData = {
          efd_upload_id: efdUploadId || null,
          chave_nfe: chave,
          numero_nfe: parsed.header.numeroNfe,
          serie: parsed.header.serie,
          cnpj_emitente: parsed.header.cnpjEmitente,
          cnpj_destinatario: parsed.header.cnpjDestinatario,
          data_emissao: parsed.header.dataEmissao?.substring(0, 10) || null,
          valor_total: parsed.header.valorTotal,
          valor_icms_declarado: parsed.header.valorIcms,
          valor_icms_nfe: sefazResult.valorIcms || parsed.header.valorIcms,
          base_calculo_icms: parsed.header.baseCalculoIcms,
          cfop: parsed.itens[0]?.cfop || null,
          natureza_operacao: parsed.header.naturezaOperacao,
          uf_emitente: parsed.header.ufEmitente || getUfFromChave(chave),
          uf_destinatario: parsed.header.ufDestinatario,
          nfe_encontrada: sefazResult.situacao !== 'nao_encontrada',
          nfe_valida: sefazResult.situacao === 'autorizada',
          divergencia_icms: divergenciaIcms,
          divergencia_valor: divergenciaIcms,
          divergencia_detalhes: divergenciaIcms
            ? `ICMS declarado: ${parsed.header.valorIcms}, SEFAZ: ${sefazResult.valorIcms}`
            : null,
          sefaz_status: sefazResult.situacao,
          sefaz_protocolo: sefazResult.protocolo || null,
          sefaz_checked_at: new Date().toISOString(),
          sefaz_response: {
            situacao: sefazResult.situacao,
            protocolo: sefazResult.protocolo,
            dataAutorizacao: sefazResult.dataAutorizacao,
            responseTimeMs: sefazResult.responseTimeMs,
          },
          status: sefazResult.situacao === 'autorizada' ? 'validado' : 'divergente',
          company_id: companyId,
          credit_listing_id: creditListingId || null,
        }

        const { data: cruzamento, error: insertError } = await (supabase as any)
          .from('nfe_cruzamentos')
          .insert(cruzamentoData)
          .select()
          .single()

        if (insertError) {
          results.erros++
          results.cruzamentos.push({ chave, status: 'erro_db', errors: [insertError.message] })
          continue
        }

        // 6. Insert items
        if (parsed.itens.length > 0) {
          const itensData = parsed.itens.map(item => ({
            nfe_cruzamento_id: cruzamento.id,
            numero_item: item.numeroItem,
            codigo_produto: item.codigoProduto,
            descricao_produto: item.descricaoProduto,
            ncm: item.ncm,
            cfop: item.cfop,
            unidade: item.unidade,
            quantidade: item.quantidade,
            valor_unitario: item.valorUnitario,
            valor_total: item.valorTotal,
            base_calculo_icms: item.baseCalculoIcms,
            aliquota_icms: item.aliquotaIcms,
            valor_icms: item.valorIcms,
            cst_icms: item.cstIcms,
          }))

          await (supabase as any).from('nfe_itens').insert(itensData)
        }

        // 7. Log SEFAZ consultation
        await (supabase as any).from('nfe_sefaz_log').insert({
          nfe_cruzamento_id: cruzamento.id,
          chave_nfe: chave,
          uf: sefazResult.uf,
          response_payload: sefazResult,
          http_status: sefazResult.situacao === 'erro' ? 500 : 200,
          success: sefazResult.situacao !== 'erro',
          error_message: sefazResult.errorMessage || null,
          response_time_ms: sefazResult.responseTimeMs,
        })

        // 8. Update counters
        results.processados++
        results.resumo.valorTotalIcms += parsed.header.valorIcms
        if (sefazResult.situacao === 'autorizada') results.resumo.autorizadas++
        if (sefazResult.situacao === 'cancelada') results.resumo.canceladas++
        if (sefazResult.situacao === 'denegada') results.resumo.denegadas++
        if (sefazResult.situacao === 'nao_encontrada') results.resumo.naoEncontradas++
        if (sefazResult.situacao === 'erro') results.resumo.erroSefaz++
        if (divergenciaIcms) results.resumo.comDivergencia++

        results.cruzamentos.push({
          id: cruzamento.id,
          chave,
          status: sefazResult.situacao,
          valorIcms: parsed.header.valorIcms,
          divergencia: divergenciaIcms,
          warnings: validation.warnings,
        })
      } catch (nfeError) {
        results.erros++
        results.cruzamentos.push({
          chave: 'erro_processamento',
          status: 'erro',
          errors: [nfeError instanceof Error ? nfeError.message : 'Erro ao processar XML'],
        })
      }
    }

    // Update EFD upload if linked
    if (efdUploadId) {
      await (supabase as any)
        .from('efd_uploads')
        .update({
          qtd_nfe_cruzadas: results.processados,
          validation_report: {
            ...results.resumo,
            processedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', efdUploadId)
    }

    return NextResponse.json(results)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
