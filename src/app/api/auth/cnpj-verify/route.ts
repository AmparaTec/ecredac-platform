import { NextRequest, NextResponse } from 'next/server'
import { isValidCNPJ } from '@/lib/utils'

// POST /api/auth/cnpj-verify
// Verifies a CNPJ against ReceitaWS and returns company data
export async function POST(request: NextRequest) {
  try {
    const { cnpj } = await request.json()

    if (!cnpj) {
      return NextResponse.json({ error: 'CNPJ is required' }, { status: 400 })
    }

    const digits = cnpj.replace(/\D/g, '')

    if (!isValidCNPJ(digits)) {
      return NextResponse.json({ error: 'CNPJ invalido' }, { status: 400 })
    }

    // Call ReceitaWS API
    const apiUrl = process.env.CNPJ_API_URL || 'https://www.receitaws.com.br/v1/cnpj'
    const response = await fetch(`${apiUrl}/${digits}`, {
      headers: {
        'Accept': 'application/json',
        ...(process.env.CNPJ_API_KEY ? { 'Authorization': `Bearer ${process.env.CNPJ_API_KEY}` } : {}),
      },
    })

    if (!response.ok) {
      // Fallback: return mock data for development
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          valid: true,
          cnpj: digits,
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
        })
      }
      return NextResponse.json({ error: 'Erro ao consultar CNPJ' }, { status: 502 })
    }

    const data = await response.json()

    if (data.status === 'ERROR') {
      return NextResponse.json({ error: data.message || 'CNPJ nao encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      valid: data.situacao === 'ATIVA',
      cnpj: data.cnpj,
      razao_social: data.nome,
      nome_fantasia: data.fantasia || data.nome?.split(' ')[0],
      situacao: data.situacao,
      type: data.tipo,
      abertura: data.abertura,
      atividade_principal: data.atividade_principal,
      endereco: {
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        municipio: data.municipio,
        uf: data.uf,
        cep: data.cep,
      },
    })
  } catch (error) {
    console.error('CNPJ verify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
