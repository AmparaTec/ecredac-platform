import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// GET /api/auctions?listing_id=xxx — Buscar leilao por listing
// GET /api/auctions?status=open — Listar leiloes abertos
// GET /api/auctions?my=true — Meus leiloes (como vendedor)
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const listingId = searchParams.get('listing_id')
  const status = searchParams.get('status')
  const my = searchParams.get('my')
  const auctionId = searchParams.get('id')

  // Leilao especifico
  if (auctionId) {
    const { data, error } = await supabase
      .from('silent_auctions')
      .select('*, listing:credit_listings(*, credit_score:credit_scores(*), company:companies(nome_fantasia))')
      .eq('id', auctionId)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Buscar bids do usuario (se existirem)
    const { data: company } = await supabase
      .from('companies').select('id').eq('auth_user_id', user.id).single()

    let myBid = null
    if (company) {
      const { data: bid } = await supabase
        .from('auction_bids')
        .select('*')
        .eq('auction_id', auctionId)
        .eq('bidder_company_id', company.id)
        .single()
      myBid = bid
    }

    // Se sou o vendedor, posso ver todos os bids
    let allBids = null
    if (data && company && data.seller_company_id === company.id) {
      const { data: bids } = await supabase
        .from('auction_bids')
        .select('*, bidder_company:companies(nome_fantasia)')
        .eq('auction_id', auctionId)
        .order('bid_discount', { ascending: true })
      allBids = bids
    }

    return NextResponse.json({ auction: data, my_bid: myBid, all_bids: allBids })
  }

  // Leilao por listing
  if (listingId) {
    const { data, error } = await supabase
      .from('silent_auctions')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ auction: data })
  }

  // Meus leiloes
  if (my === 'true') {
    const { data: company } = await supabase
      .from('companies').select('id').eq('auth_user_id', user.id).single()
    if (!company) return NextResponse.json({ error: 'Empresa nao encontrada' }, { status: 404 })

    const { data, error } = await supabase
      .from('silent_auctions')
      .select('*, listing:credit_listings(credit_id, credit_type, origin, amount, credit_score:credit_scores(grade, score))')
      .eq('seller_company_id', company.id)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ auctions: data })
  }

  // Leiloes abertos
  let query = supabase
    .from('silent_auctions')
    .select('*, listing:credit_listings(credit_id, credit_type, origin, amount, company:companies(nome_fantasia), credit_score:credit_scores(grade, score))')
    .order('ends_at', { ascending: true })

  if (status) query = query.eq('status', status)
  else query = query.eq('status', 'open')

  const { data, error } = await query.limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ auctions: data })
}

// POST /api/auctions — Criar leilao ou fazer lance
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })

  const { data: company } = await supabase
    .from('companies').select('id').eq('auth_user_id', user.id).single()
  if (!company) return NextResponse.json({ error: 'Empresa nao encontrada' }, { status: 404 })

  const body = await request.json()

  // Criar leilao
  if (body.action === 'create_auction') {
    if (!body.listing_id) return NextResponse.json({ error: 'listing_id obrigatorio' }, { status: 400 })

    // Verificar se listing pertence ao usuario
    const { data: listing } = await supabase
      .from('credit_listings')
      .select('id, company_id')
      .eq('id', body.listing_id)
      .eq('company_id', company.id)
      .single()
    if (!listing) return NextResponse.json({ error: 'Listing nao encontrado ou nao pertence a voce' }, { status: 403 })

    const durationHours = body.duration_hours || 24
    const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('silent_auctions')
      .insert({
        listing_id: body.listing_id,
        seller_company_id: company.id,
        min_discount: body.min_discount || 5,
        reserve_discount: body.reserve_discount || null,
        ends_at: endsAt,
        auto_extend: body.auto_extend !== false,
        auto_extend_minutes: body.auto_extend_minutes || 10,
        visible_bid_count: body.visible_bid_count !== false,
        visible_time_remaining: body.visible_time_remaining !== false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Dispara auto-bids
    await supabase.rpc('execute_auto_bids', { p_listing_id: body.listing_id })

    return NextResponse.json({ auction: data })
  }

  // Fazer lance
  if (body.action === 'place_bid') {
    if (!body.auction_id) return NextResponse.json({ error: 'auction_id obrigatorio' }, { status: 400 })
    if (!body.bid_discount) return NextResponse.json({ error: 'bid_discount obrigatorio' }, { status: 400 })

    // Verificar leilao aberto
    const { data: auction } = await supabase
      .from('silent_auctions')
      .select('*')
      .eq('id', body.auction_id)
      .eq('status', 'open')
      .single()
    if (!auction) return NextResponse.json({ error: 'Leilao nao encontrado ou fechado' }, { status: 404 })

    // Nao pode dar lance no proprio leilao
    if (auction.seller_company_id === company.id) {
      return NextResponse.json({ error: 'Voce nao pode dar lance no seu proprio leilao' }, { status: 400 })
    }

    // Verificar desconto minimo
    if (body.bid_discount < auction.min_discount) {
      return NextResponse.json({
        error: `Desconto minimo para este leilao: ${auction.min_discount}%`
      }, { status: 400 })
    }

    // Buscar listing para bid_amount
    const { data: listing } = await supabase
      .from('credit_listings')
      .select('amount')
      .eq('id', auction.listing_id)
      .single()

    // Upsert bid
    const { data, error } = await supabase
      .from('auction_bids')
      .upsert({
        auction_id: body.auction_id,
        bidder_company_id: company.id,
        bid_discount: body.bid_discount,
        bid_amount: listing?.amount || 0,
        is_auto_bid: false,
      }, { onConflict: 'auction_id,bidder_company_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Auto-extend se lance nos ultimos minutos
    if (auction.auto_extend) {
      const endsAt = new Date(auction.extended_until || auction.ends_at)
      const now = new Date()
      const minutesLeft = (endsAt.getTime() - now.getTime()) / 60000
      if (minutesLeft <= 5) {
        const newEnd = new Date(now.getTime() + (auction.auto_extend_minutes || 10) * 60000).toISOString()
        await supabase
          .from('silent_auctions')
          .update({ extended_until: newEnd })
          .eq('id', body.auction_id)
      }
    }

    // Atualizar contadores do leilao
    const { count: totalBids } = await supabase
      .from('auction_bids')
      .select('*', { count: 'exact', head: true })
      .eq('auction_id', body.auction_id)

    const { count: uniqueBidders } = await supabase
      .from('auction_bids')
      .select('bidder_company_id', { count: 'exact', head: true })
      .eq('auction_id', body.auction_id)

    await supabase
      .from('silent_auctions')
      .update({ total_bids: totalBids || 0, unique_bidders: uniqueBidders || 0 })
      .eq('id', body.auction_id)

    // Notificar vendedor
    await supabase.from('notifications').insert({
      company_id: auction.seller_company_id,
      type: 'new_bid',
      title: 'Novo lance recebido!',
      body: `Lance de ${body.bid_discount}% recebido no seu leilao.`,
      reference_type: 'silent_auction',
      reference_id: body.auction_id,
    })

    return NextResponse.json({ bid: data })
  }

  // Fechar leilao manualmente
  if (body.action === 'close_auction') {
    if (!body.auction_id) return NextResponse.json({ error: 'auction_id obrigatorio' }, { status: 400 })

    const { data, error } = await supabase.rpc('close_auction', { p_auction_id: body.auction_id })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ result: data })
  }

  return NextResponse.json({ error: 'action invalida' }, { status: 400 })
}
