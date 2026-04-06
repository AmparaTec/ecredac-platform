import { NextRequest, NextResponse } from 'next/server'
import { verifyCnpj, IntegrationError } from '@/lib/integrations'

// POST /api/auth/cnpj-verify
// Verifies a CNPJ against ReceitaWS with cache and rate limiting
export async function POST(request: NextRequest) {
  try {
    const { cnpj } = await request.json()

    if (!cnpj) {
      return NextResponse.json({ error: 'CNPJ is required' }, { status: 400 })
    }

    const data = await verifyCnpj(cnpj)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof IntegrationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 502 },
      )
    }

    console.error('CNPJ verify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
