import { NextResponse } from 'next/server'

// TEMPORARY: Debug endpoint to check env vars — REMOVE after debugging
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  // Extract "ref" from JWT payload (middle part of JWT)
  function getJwtRef(jwt: string): string {
    try {
      const parts = jwt.split('.')
      if (parts.length !== 3) return 'INVALID_JWT_FORMAT (parts: ' + parts.length + ')'
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
      return payload.ref || 'NO_REF'
    } catch {
      return 'PARSE_ERROR'
    }
  }

  // Extract project ref from URL
  function getUrlRef(u: string): string {
    const match = u.match(/https:\/\/([^.]+)\.supabase/)
    return match ? match[1] : 'UNKNOWN'
  }

  const urlRef = getUrlRef(url)
  const anonRef = getJwtRef(anonKey)
  const serviceRef = getJwtRef(serviceKey)

  const mismatch = urlRef !== serviceRef || urlRef !== anonRef

  return NextResponse.json({
    status: mismatch ? 'MISMATCH_DETECTED' : 'OK',
    url_ref: urlRef,
    anon_key_ref: anonRef,
    service_key_ref: serviceRef,
    url_present: !!url,
    anon_key_present: !!anonKey,
    service_key_present: !!serviceKey,
    service_key_length: serviceKey.length,
    service_key_first10: serviceKey.substring(0, 10),
    service_key_last10: serviceKey.substring(serviceKey.length - 10),
    vercel_env: process.env.VERCEL_ENV || 'not_set',
    node_env: process.env.NODE_ENV || 'not_set',
  })
}
