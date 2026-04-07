import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

const CACHE_TTL_DAYS = 7

interface ReceitaWSResponse {
  status: string
  cnpj: string
  nome: string
  fantasia: string
  atividade_principal: Array<{ code: string; text: string }>
  porte: string
  municipio: string
  uf: string
  situacao: string
  tipo: string
  abertura: string
  capital_social: string
  natureza_juridica: string
}

function normalizePorte(porte: string): string {
  const p = porte?.toUpperCase() ?? ''
  if (p.includes('MICRO EMPRESA') || p === 'ME') return 'ME'
  if (p.includes('PEQUENO') || p === 'EPP') return 'EPP'
  if (p.includes('MÉDIO') || p.includes('MEDIO')) return 'MEDIO'
  if (p.includes('GRANDE')) return 'GRANDE'
  if (p.includes('MEI')) return 'MEI'
  return 'EPP' // default conservador
}

export async function GET(
  req: NextRequest,
  { params }: { params: { cnpj: string } }
) {
  const cnpj = params.cnpj.replace(/\D/g, '')

  if (cnpj.length !== 14) {
    return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 })
  }

  // 1. Verificar cache no Supabase (sem auth — usa service role via servidor)
  try {
    const supabase = createServerSupabase()
    const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: cached } = await supabase
      .from('cnpj_cache')
      .select('dados_brutos, consultado_em')
      .eq('cnpj', cnpj)
      .gt('consultado_em', cutoff)
      .maybeSingle()

    if (cached?.dados_brutos) {
      const raw = cached.dados_brutos as ReceitaWSResponse
      return NextResponse.json(normalizeResponse(raw), {
        headers: { 'X-Source': 'cache' },
      })
    }
  } catch {
    // Cache lookup falhou — continua para API externa
  }

  // 2. Consultar ReceitaWS (fallback: OpenCNPJ se disponível)
  let raw: ReceitaWSResponse | null = null
  let source = 'receitaws'

  try {
    // Tenta ReceitaWS primeiro (sem rate limit agressivo para uso individual)
    const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    })
    if (res.ok) {
      raw = await res.json()
    }
  } catch {
    // ReceitaWS falhou
  }

  // Fallback: OpenCNPJ
  if (!raw || raw.status === 'ERROR') {
    try {
      source = 'opencnpj'
      const res = await fetch(`https://api.opencnpj.org/cnpj/${cnpj}`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 0 },
      })
      if (res.ok) {
        const data = await res.json()
        // Normalizar para formato ReceitaWS
        raw = {
          status: 'OK',
          cnpj,
          nome: data.razao_social ?? '',
          fantasia: data.nome_fantasia ?? '',
          atividade_principal: data.cnae_fiscal
            ? [{ code: String(data.cnae_fiscal), text: data.cnae_fiscal_descricao ?? '' }]
            : [],
          porte: data.porte ?? '',
          municipio: data.municipio ?? '',
          uf: data.uf ?? '',
          situacao: data.situacao_cadastral ?? '',
          tipo: data.descricao_natureza_juridica ?? '',
          abertura: data.data_inicio_atividade ?? '',
          capital_social: String(data.capital_social ?? 0),
          natureza_juridica: data.descricao_natureza_juridica ?? '',
        }
      }
    } catch {
      // OpenCNPJ também falhou
    }
  }

  if (!raw || raw.status === 'ERROR') {
    return NextResponse.json(
      { status: 'ERROR', error: 'CNPJ não encontrado nas bases públicas.' },
      { status: 404 }
    )
  }

  // 3. Salvar no cache Supabase (best-effort — não bloqueia resposta)
  try {
    const supabase = createServerSupabase()
    await supabase.from('cnpj_cache').upsert(
      {
        cnpj,
        dados_brutos: raw,
        consultado_em: new Date().toISOString(),
        fonte: source,
      },
      { onConflict: 'cnpj' }
    )
  } catch {
    // Cache write falhou — OK, não crítico
  }

  return NextResponse.json(normalizeResponse(raw), {
    headers: { 'X-Source': source },
  })
}

function normalizeResponse(raw: ReceitaWSResponse) {
  const cnaeCode = raw.atividade_principal?.[0]?.code?.replace(/[^\d]/g, '') ?? ''
  const cnaeDesc = raw.atividade_principal?.[0]?.text ?? ''

  return {
    razao_social: raw.nome ?? '',
    nome_fantasia: raw.fantasia ?? '',
    cnae_principal: cnaeCode,
    cnae_descricao: cnaeDesc,
    porte: normalizePorte(raw.porte ?? ''),
    municipio: raw.municipio ?? '',
    uf: raw.uf ?? '',
    situacao: raw.situacao ?? '',
    abertura: raw.abertura ?? '',
    capital_social: raw.capital_social ?? '0',
    status: raw.status === 'OK' || raw.situacao === 'ATIVA' ? 'OK' : raw.status,
  }
}
