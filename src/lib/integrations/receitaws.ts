/**
 * E-CREDac — ReceitaWS Integration
 *
 * Consulta e validação de CNPJ com:
 * - Cache em Supabase (evita rate limit de 3 req/min no plano free)
 * - Fallback para dados mock em dev/preview
 * - Validação de checksum local antes de bater na API
 * - Tipagem forte via Zod
 */

import { z } from 'zod'
import { HttpClient, IntegrationError, optionalEnv } from './http-client'
import { createAdminSupabase } from '@/lib/supabase/server'
import { isValidCNPJ } from '@/lib/utils'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const EnderecoSchema = z.object({
  logradouro: z.string(),
  numero: z.string(),
  complemento: z.string().default(''),
  bairro: z.string(),
  municipio: z.string(),
  uf: z.string(),
  cep: z.string(),
})

export const CnpjDataSchema = z.object({
  valid: z.boolean(),
  cnpj: z.string(),
  razao_social: z.string(),
  nome_fantasia: z.string().nullable(),
  situacao: z.string(),
  type: z.string().nullable(),
  abertura: z.string().nullable(),
  atividade_principal: z.array(z.object({
    code: z.string(),
    text: z.string(),
  })).default([]),
  endereco: EnderecoSchema,
  cached: z.boolean().default(false),
  cached_at: z.string().nullable().default(null),
})

export type CnpjData = z.infer<typeof CnpjDataSchema>

// ─── ReceitaWS Raw Response ──────────────────────────────────────────────────

interface ReceitaWsResponse {
  status: string
  message?: string
  nome: string
  fantasia: string
  cnpj: string
  situacao: string
  tipo: string
  abertura: string
  atividade_principal: Array<{ code: string; text: string }>
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  cep: string
}

// ─── Cache config ────────────────────────────────────────────────────────────

const CACHE_TTL_HOURS = 24 * 7 // 7 dias — dados de CNPJ mudam raramente

// ─── Client ──────────────────────────────────────────────────────────────────

const client = new HttpClient({
  baseUrl: optionalEnv('CNPJ_API_URL', 'https://www.receitaws.com.br/v1/cnpj'),
  name: 'ReceitaWS',
  timeout: 15_000,
  maxRetries: 2,
  rateLimitPerMinute: 3, // plano free
  circuitThreshold: 3,
  circuitResetMs: 60_000,
})

// ─── Public API ──────────────────────────────────────────────────────────────

export async function verifyCnpj(rawCnpj: string): Promise<CnpjData> {
  const digits = rawCnpj.replace(/\D/g, '')

  if (!isValidCNPJ(digits)) {
    throw new IntegrationError('CNPJ inválido (checksum falhou)', 'ReceitaWS', 400)
  }

  // 1. Check cache
  const cached = await getFromCache(digits)
  if (cached) return cached

  // 2. Dev/preview fallback
  if (shouldUseMock()) {
    const mock = buildMockData(digits)
    await saveToCache(digits, mock)
    return mock
  }

  // 3. API call
  try {
    const apiKey = process.env.CNPJ_API_KEY
    const response = await client.get<ReceitaWsResponse>(`/${digits}`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    })

    if (response.status === 'ERROR') {
      throw new IntegrationError(
        response.message || 'CNPJ não encontrado na Receita Federal',
        'ReceitaWS',
        404,
      )
    }

    const data: CnpjData = {
      valid: response.situacao === 'ATIVA',
      cnpj: response.cnpj || digits,
      razao_social: response.nome,
      nome_fantasia: response.fantasia || response.nome?.split(' ')[0] || null,
      situacao: response.situacao,
      type: response.tipo || null,
      abertura: response.abertura || null,
      atividade_principal: response.atividade_principal || [],
      endereco: {
        logradouro: response.logradouro || '',
        numero: response.numero || '',
        complemento: response.complemento || '',
        bairro: response.bairro || '',
        municipio: response.municipio || '',
        uf: response.uf || '',
        cep: response.cep || '',
      },
      cached: false,
      cached_at: null,
    }

    await saveToCache(digits, data)
    return data
  } catch (error) {
    if (error instanceof IntegrationError) throw error

    // Fallback to mock on network errors in dev
    if (shouldUseMock()) return buildMockData(digits)

    throw new IntegrationError(
      `Erro ao consultar CNPJ: ${(error as Error).message}`,
      'ReceitaWS',
      502,
      undefined,
      true,
    )
  }
}

// ─── Cache Layer (Supabase) ──────────────────────────────────────────────────

async function getFromCache(cnpj: string): Promise<CnpjData | null> {
  try {
    const supabase = createAdminSupabase()
    const { data } = await supabase
      .from('cnpj_cache')
      .select('data, cached_at')
      .eq('cnpj', cnpj)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (!data) return null

    return { ...data.data as CnpjData, cached: true, cached_at: data.cached_at }
  } catch {
    return null // Cache miss or table doesn't exist yet — graceful degradation
  }
}

async function saveToCache(cnpj: string, cnpjData: CnpjData): Promise<void> {
  try {
    const supabase = createAdminSupabase()
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString()

    await supabase
      .from('cnpj_cache')
      .upsert({
        cnpj,
        data: cnpjData,
        cached_at: new Date().toISOString(),
        expires_at: expiresAt,
      }, { onConflict: 'cnpj' })
  } catch {
    // Cache write failure is non-critical — log and continue
    console.warn('[ReceitaWS] Cache write failed for CNPJ', cnpj.slice(0, 4) + '...')
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shouldUseMock(): boolean {
  // Mock apenas em dev local — no Vercel (preview ou production) chamamos a API real
  // ReceitaWS plano free não exige API key
  return process.env.NODE_ENV === 'development' && !process.env.VERCEL
}

function buildMockData(cnpj: string): CnpjData {
  return {
    valid: true,
    cnpj,
    razao_social: 'Empresa Demonstracao Ltda',
    nome_fantasia: 'Demo Corp',
    situacao: 'ATIVA',
    type: 'MATRIZ',
    abertura: '01/01/2020',
    atividade_principal: [{ code: '62.01-5-01', text: 'Desenvolvimento de software' }],
    endereco: {
      logradouro: 'Av. Paulista',
      numero: '1000',
      complemento: 'Sala 1',
      bairro: 'Bela Vista',
      municipio: 'Sao Paulo',
      uf: 'SP',
      cep: '01310-100',
    },
    cached: false,
    cached_at: null,
  }
}
