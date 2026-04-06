-- ============================================================
-- E-CREDac ICMS Platform — Migration 004
-- Sprint 3: Active Matching
-- Alertas, Auto-Bidding, Leilao Silencioso
-- AMBIENTE: DEV ONLY (ggtivdrgazqygydoiyqu)
-- ============================================================

-- ============================================================
-- ENUM: bid_status, alert_type, auction_status
-- ============================================================

CREATE TYPE bid_status AS ENUM ('active', 'won', 'outbid', 'expired', 'cancelled');
CREATE TYPE alert_channel AS ENUM ('in_app', 'email', 'both');
CREATE TYPE auction_status AS ENUM ('open', 'closed', 'cancelled', 'no_bids');

-- ============================================================
-- TABLE: match_alerts
-- Alertas configurados pelo usuario para ser notificado
-- quando creditos ou demandas compativeis surgirem
-- ============================================================

CREATE TABLE match_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Nome do alerta
  name VARCHAR(100) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Criterios de busca
  alert_type VARCHAR(20) NOT NULL DEFAULT 'credit', -- 'credit' (quer comprar) ou 'demand' (quer vender)
  credit_types credit_type[],            -- NULL = qualquer
  origins credit_origin[],               -- NULL = qualquer
  min_amount NUMERIC(15,2),              -- valor minimo do credito
  max_amount NUMERIC(15,2),              -- valor maximo
  min_grade credit_score_grade,          -- grade minima (A, B, C, D)
  max_discount NUMERIC(5,2),             -- desconto maximo aceitavel
  min_discount NUMERIC(5,2),             -- desconto minimo desejado

  -- Canal de notificacao
  channel alert_channel NOT NULL DEFAULT 'in_app',

  -- Controle
  matches_found INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  max_triggers INTEGER DEFAULT NULL, -- NULL = ilimitado

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_alerts_company ON match_alerts(company_id);
CREATE INDEX idx_match_alerts_active ON match_alerts(active) WHERE active = TRUE;

-- ============================================================
-- TABLE: auto_bid_rules
-- Regras de auto-bidding: fazer oferta automatica
-- quando um credito atende aos criterios
-- ============================================================

CREATE TABLE auto_bid_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Nome da regra
  name VARCHAR(100) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Criterios do credito alvo
  credit_types credit_type[],
  origins credit_origin[],
  min_grade credit_score_grade,          -- grade minima
  min_amount NUMERIC(15,2),
  max_amount NUMERIC(15,2),
  homologation_required BOOLEAN DEFAULT FALSE,

  -- Estrategia de bid
  bid_strategy VARCHAR(20) NOT NULL DEFAULT 'fixed',
  -- 'fixed': desconto fixo
  -- 'market': segue media de mercado + offset
  -- 'aggressive': comeca baixo e sobe se nao ganhar

  fixed_discount NUMERIC(5,2),           -- para strategy 'fixed'
  market_offset NUMERIC(5,2) DEFAULT 0,  -- para strategy 'market' (+/- sobre media)
  max_bid_discount NUMERIC(5,2) NOT NULL, -- desconto maximo que aceita pagar (teto)
  min_bid_discount NUMERIC(5,2) DEFAULT 0, -- desconto minimo (piso)

  -- Limites
  max_total_exposure NUMERIC(15,2),      -- volume total maximo em aberto
  max_single_bid NUMERIC(15,2),          -- maximo por bid individual
  max_bids_per_day INTEGER DEFAULT 10,
  current_exposure NUMERIC(15,2) NOT NULL DEFAULT 0,
  bids_today INTEGER NOT NULL DEFAULT 0,
  bids_today_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Stats
  total_bids INTEGER NOT NULL DEFAULT 0,
  total_won INTEGER NOT NULL DEFAULT 0,
  total_volume_won NUMERIC(15,2) NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auto_bid_company ON auto_bid_rules(company_id);
CREATE INDEX idx_auto_bid_active ON auto_bid_rules(active) WHERE active = TRUE;

-- ============================================================
-- TABLE: silent_auctions
-- Leilao silencioso: compradores fazem lances sem ver os outros
-- Vendedor define prazo e criterios, melhor lance ganha
-- ============================================================

CREATE TABLE silent_auctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES credit_listings(id) ON DELETE CASCADE,
  seller_company_id UUID NOT NULL REFERENCES companies(id),

  -- Config do leilao
  status auction_status NOT NULL DEFAULT 'open',
  min_discount NUMERIC(5,2) NOT NULL,        -- desconto minimo para participar
  reserve_discount NUMERIC(5,2),             -- desconto reserva (abaixo disso nao vende)

  -- Prazos
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  extended_until TIMESTAMPTZ,                -- extensao automatica se lance nos ultimos 5 min

  -- Resultado
  winning_bid_id UUID,
  final_discount NUMERIC(5,2),
  total_bids INTEGER NOT NULL DEFAULT 0,
  unique_bidders INTEGER NOT NULL DEFAULT 0,

  -- Config
  auto_extend BOOLEAN NOT NULL DEFAULT TRUE, -- estender se lance nos ultimos 5 min
  auto_extend_minutes INTEGER DEFAULT 10,
  visible_bid_count BOOLEAN NOT NULL DEFAULT TRUE,  -- mostrar qtd de lances?
  visible_time_remaining BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auctions_listing ON silent_auctions(listing_id);
CREATE INDEX idx_auctions_status ON silent_auctions(status) WHERE status = 'open';
CREATE INDEX idx_auctions_ends ON silent_auctions(ends_at) WHERE status = 'open';

-- ============================================================
-- TABLE: auction_bids
-- Lances no leilao silencioso
-- ============================================================

CREATE TABLE auction_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES silent_auctions(id) ON DELETE CASCADE,
  bidder_company_id UUID NOT NULL REFERENCES companies(id),

  -- Lance
  bid_discount NUMERIC(5,2) NOT NULL,      -- desconto oferecido (menor = melhor para vendedor)
  bid_amount NUMERIC(15,2) NOT NULL,       -- valor do credito desejado
  status bid_status NOT NULL DEFAULT 'active',

  -- Origem do lance
  is_auto_bid BOOLEAN NOT NULL DEFAULT FALSE,
  auto_bid_rule_id UUID REFERENCES auto_bid_rules(id),

  -- Timestamps
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outbid_at TIMESTAMPTZ,
  won_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Um lance ativo por empresa por leilao
  CONSTRAINT unique_active_bid UNIQUE (auction_id, bidder_company_id)
);

CREATE INDEX idx_bids_auction ON auction_bids(auction_id);
CREATE INDEX idx_bids_bidder ON auction_bids(bidder_company_id);
CREATE INDEX idx_bids_status ON auction_bids(status);

-- ============================================================
-- FUNCTION: check_match_alerts(listing_id UUID)
-- Verifica se algum alerta ativo eh acionado por um novo listing
-- Cria notificacoes para as empresas com alertas compatíveis
-- ============================================================

CREATE OR REPLACE FUNCTION check_match_alerts(p_listing_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_listing RECORD;
  v_score RECORD;
  v_alert RECORD;
  v_triggered INTEGER := 0;
BEGIN
  -- Buscar listing
  SELECT * INTO v_listing FROM credit_listings WHERE id = p_listing_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Listing not found'); END IF;

  -- Buscar score
  SELECT * INTO v_score FROM credit_scores WHERE listing_id = p_listing_id ORDER BY calculated_at DESC LIMIT 1;

  -- Verificar cada alerta ativo
  FOR v_alert IN
    SELECT ma.*
    FROM match_alerts ma
    WHERE ma.active = TRUE
      AND ma.alert_type = 'credit'
      AND ma.company_id != v_listing.company_id  -- nao alertar o proprio vendedor
      AND (ma.max_triggers IS NULL OR ma.matches_found < ma.max_triggers)
      AND (ma.credit_types IS NULL OR v_listing.credit_type = ANY(ma.credit_types))
      AND (ma.origins IS NULL OR v_listing.origin = ANY(ma.origins))
      AND (ma.min_amount IS NULL OR v_listing.amount >= ma.min_amount)
      AND (ma.max_amount IS NULL OR v_listing.amount <= ma.max_amount)
      AND (ma.min_grade IS NULL OR v_score.grade IS NULL OR
           CASE v_score.grade
             WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 WHEN 'D' THEN 4
           END <=
           CASE ma.min_grade
             WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 WHEN 'D' THEN 4
           END)
      AND (ma.max_discount IS NULL OR v_listing.min_discount <= ma.max_discount)
  LOOP
    -- Criar notificacao
    INSERT INTO notifications (company_id, type, title, body, reference_type, reference_id, metadata)
    VALUES (
      v_alert.company_id,
      'match_alert',
      format('Alerta: %s', v_alert.name),
      format('Credito %s de %s encontrado: R$ %s com score %s',
        v_listing.credit_type, v_listing.origin,
        to_char(v_listing.amount, 'FM999G999G999D00'),
        COALESCE(v_score.grade::text, 'N/A')),
      'credit_listing',
      p_listing_id,
      jsonb_build_object('alert_id', v_alert.id, 'alert_name', v_alert.name)
    );

    -- Atualizar contagem do alerta
    UPDATE match_alerts SET
      matches_found = matches_found + 1,
      last_triggered_at = NOW()
    WHERE id = v_alert.id;

    -- Desativar se atingiu limite
    IF v_alert.max_triggers IS NOT NULL AND v_alert.matches_found + 1 >= v_alert.max_triggers THEN
      UPDATE match_alerts SET active = FALSE WHERE id = v_alert.id;
    END IF;

    v_triggered := v_triggered + 1;
  END LOOP;

  RETURN jsonb_build_object('alerts_triggered', v_triggered, 'listing_id', p_listing_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: execute_auto_bids(listing_id UUID)
-- Verifica regras de auto-bid e cria lances automaticos
-- ============================================================

CREATE OR REPLACE FUNCTION execute_auto_bids(p_listing_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_listing RECORD;
  v_score RECORD;
  v_auction RECORD;
  v_rule RECORD;
  v_bid_discount NUMERIC(5,2);
  v_benchmark_avg NUMERIC(5,2);
  v_bids_created INTEGER := 0;
BEGIN
  -- Buscar listing
  SELECT * INTO v_listing FROM credit_listings WHERE id = p_listing_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Listing not found'); END IF;

  -- Buscar score
  SELECT * INTO v_score FROM credit_scores WHERE listing_id = p_listing_id ORDER BY calculated_at DESC LIMIT 1;

  -- Buscar leilao aberto para este listing
  SELECT * INTO v_auction FROM silent_auctions WHERE listing_id = p_listing_id AND status = 'open' LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'No open auction for this listing', 'bids_created', 0); END IF;

  -- Buscar benchmark de mercado para calcular strategy 'market'
  SELECT avg_discount INTO v_benchmark_avg
  FROM market_benchmarks
  WHERE credit_type = v_listing.credit_type
    AND origin = v_listing.origin
    AND credit_grade IS NULL
  ORDER BY period_end DESC LIMIT 1;

  -- Verificar cada regra ativa
  FOR v_rule IN
    SELECT abr.*
    FROM auto_bid_rules abr
    WHERE abr.active = TRUE
      AND abr.company_id != v_listing.company_id  -- nao pode dar bid no proprio
      AND (abr.credit_types IS NULL OR v_listing.credit_type = ANY(abr.credit_types))
      AND (abr.origins IS NULL OR v_listing.origin = ANY(abr.origins))
      AND (abr.min_amount IS NULL OR v_listing.amount >= abr.min_amount)
      AND (abr.max_amount IS NULL OR v_listing.amount <= abr.max_amount)
      AND (abr.max_single_bid IS NULL OR v_listing.amount <= abr.max_single_bid)
      AND (abr.max_total_exposure IS NULL OR abr.current_exposure + v_listing.amount <= abr.max_total_exposure)
      AND (abr.min_grade IS NULL OR v_score.grade IS NULL OR
           CASE v_score.grade
             WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 WHEN 'D' THEN 4
           END <=
           CASE abr.min_grade
             WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 WHEN 'D' THEN 4
           END)
      AND (NOT abr.homologation_required OR v_listing.homologation_status = 'homologado')
      AND (abr.bids_today < abr.max_bids_per_day OR abr.bids_today_reset_at::date != CURRENT_DATE)
  LOOP
    -- Reset daily counter if needed
    IF v_rule.bids_today_reset_at::date != CURRENT_DATE THEN
      UPDATE auto_bid_rules SET bids_today = 0, bids_today_reset_at = NOW() WHERE id = v_rule.id;
      v_rule.bids_today := 0;
    END IF;

    -- Calcular desconto do lance
    CASE v_rule.bid_strategy
      WHEN 'fixed' THEN
        v_bid_discount := COALESCE(v_rule.fixed_discount, v_rule.max_bid_discount);
      WHEN 'market' THEN
        v_bid_discount := COALESCE(v_benchmark_avg, 12.0) + COALESCE(v_rule.market_offset, 0);
      WHEN 'aggressive' THEN
        -- Comeca com desconto menor (melhor para vendedor), sobe se preciso
        v_bid_discount := COALESCE(v_rule.min_bid_discount, v_rule.max_bid_discount * 0.7);
    END CASE;

    -- Aplicar limites
    v_bid_discount := GREATEST(COALESCE(v_rule.min_bid_discount, 0), LEAST(v_bid_discount, v_rule.max_bid_discount));

    -- Verificar se desconto atende ao minimo do leilao
    IF v_bid_discount < v_auction.min_discount THEN
      CONTINUE; -- pular, nao atende ao minimo
    END IF;

    -- Criar o lance (upsert por empresa/leilao)
    INSERT INTO auction_bids (auction_id, bidder_company_id, bid_discount, bid_amount, is_auto_bid, auto_bid_rule_id)
    VALUES (v_auction.id, v_rule.company_id, v_bid_discount, v_listing.amount, TRUE, v_rule.id)
    ON CONFLICT (auction_id, bidder_company_id)
    DO UPDATE SET
      bid_discount = EXCLUDED.bid_discount,
      bid_amount = EXCLUDED.bid_amount,
      updated_at = NOW()
    WHERE auction_bids.bid_discount > EXCLUDED.bid_discount; -- so atualiza se lance melhor

    -- Atualizar contadores da regra
    UPDATE auto_bid_rules SET
      bids_today = bids_today + 1,
      total_bids = total_bids + 1,
      current_exposure = current_exposure + v_listing.amount
    WHERE id = v_rule.id;

    -- Atualizar contadores do leilao
    UPDATE silent_auctions SET
      total_bids = (SELECT COUNT(*) FROM auction_bids WHERE auction_id = v_auction.id),
      unique_bidders = (SELECT COUNT(DISTINCT bidder_company_id) FROM auction_bids WHERE auction_id = v_auction.id)
    WHERE id = v_auction.id;

    -- Notificar vendedor
    INSERT INTO notifications (company_id, type, title, body, reference_type, reference_id)
    VALUES (
      v_auction.seller_company_id,
      'new_bid',
      'Novo lance recebido!',
      format('Lance de %s%% recebido no leilao do credito %s',
        v_bid_discount, COALESCE(v_listing.credit_id, v_listing.id::text)),
      'silent_auction',
      v_auction.id
    );

    v_bids_created := v_bids_created + 1;
  END LOOP;

  RETURN jsonb_build_object('bids_created', v_bids_created, 'listing_id', p_listing_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: close_auction(auction_id UUID)
-- Fecha leilao e determina vencedor
-- ============================================================

CREATE OR REPLACE FUNCTION close_auction(p_auction_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_auction RECORD;
  v_winning_bid RECORD;
BEGIN
  SELECT * INTO v_auction FROM silent_auctions WHERE id = p_auction_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Auction not found'); END IF;
  IF v_auction.status != 'open' THEN RETURN jsonb_build_object('error', 'Auction not open'); END IF;

  -- Buscar melhor lance (menor desconto = melhor para vendedor)
  SELECT * INTO v_winning_bid
  FROM auction_bids
  WHERE auction_id = p_auction_id AND status = 'active'
  ORDER BY bid_discount ASC, placed_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Sem lances
    UPDATE silent_auctions SET status = 'no_bids', updated_at = NOW() WHERE id = p_auction_id;
    RETURN jsonb_build_object('status', 'no_bids', 'auction_id', p_auction_id);
  END IF;

  -- Verificar desconto reserva
  IF v_auction.reserve_discount IS NOT NULL AND v_winning_bid.bid_discount > v_auction.reserve_discount THEN
    UPDATE silent_auctions SET status = 'no_bids', updated_at = NOW() WHERE id = p_auction_id;
    RETURN jsonb_build_object('status', 'reserve_not_met', 'best_bid', v_winning_bid.bid_discount, 'reserve', v_auction.reserve_discount);
  END IF;

  -- Marcar vencedor
  UPDATE auction_bids SET status = 'won', won_at = NOW() WHERE id = v_winning_bid.id;

  -- Marcar outros como outbid
  UPDATE auction_bids SET status = 'outbid', outbid_at = NOW()
  WHERE auction_id = p_auction_id AND id != v_winning_bid.id AND status = 'active';

  -- Fechar leilao
  UPDATE silent_auctions SET
    status = 'closed',
    winning_bid_id = v_winning_bid.id,
    final_discount = v_winning_bid.bid_discount,
    updated_at = NOW()
  WHERE id = p_auction_id;

  -- Notificar vencedor
  INSERT INTO notifications (company_id, type, title, body, reference_type, reference_id)
  VALUES (
    v_winning_bid.bidder_company_id,
    'auction_won',
    'Voce venceu o leilao!',
    format('Seu lance de %s%% venceu o leilao. Valor: R$ %s',
      v_winning_bid.bid_discount, to_char(v_winning_bid.bid_amount, 'FM999G999G999D00')),
    'silent_auction',
    p_auction_id
  );

  -- Notificar vendedor
  INSERT INTO notifications (company_id, type, title, body, reference_type, reference_id)
  VALUES (
    v_auction.seller_company_id,
    'auction_closed',
    'Leilao finalizado!',
    format('Melhor lance: %s%% de desconto. %s lances recebidos.',
      v_winning_bid.bid_discount, v_auction.total_bids),
    'silent_auction',
    p_auction_id
  );

  -- Notificar perdedores
  INSERT INTO notifications (company_id, type, title, body, reference_type, reference_id)
  SELECT
    ab.bidder_company_id,
    'auction_lost',
    'Leilao finalizado — lance nao vencedor',
    format('O leilao foi encerrado. Seu lance de %s%% nao foi o vencedor.', ab.bid_discount),
    'silent_auction',
    p_auction_id
  FROM auction_bids ab
  WHERE ab.auction_id = p_auction_id AND ab.id != v_winning_bid.id;

  RETURN jsonb_build_object(
    'status', 'closed',
    'auction_id', p_auction_id,
    'winning_bid_id', v_winning_bid.id,
    'winning_company_id', v_winning_bid.bidder_company_id,
    'winning_discount', v_winning_bid.bid_discount,
    'total_bids', v_auction.total_bids
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGER: auto-check alerts when new listing is created
-- ============================================================

CREATE OR REPLACE FUNCTION trg_check_alerts_on_listing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status != 'active') THEN
    PERFORM check_match_alerts(NEW.id);
    PERFORM execute_auto_bids(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_listing_active_alerts
  AFTER INSERT OR UPDATE ON credit_listings
  FOR EACH ROW
  EXECUTE FUNCTION trg_check_alerts_on_listing();

-- ============================================================
-- TRIGGER: auto-close expired auctions
-- Pode ser chamado via cron ou pg_cron
-- ============================================================

CREATE OR REPLACE FUNCTION close_expired_auctions()
RETURNS JSONB AS $$
DECLARE
  v_auction RECORD;
  v_closed INTEGER := 0;
  v_result JSONB;
BEGIN
  FOR v_auction IN
    SELECT id FROM silent_auctions
    WHERE status = 'open'
      AND COALESCE(extended_until, ends_at) <= NOW()
  LOOP
    v_result := close_auction(v_auction.id);
    v_closed := v_closed + 1;
  END LOOP;

  RETURN jsonb_build_object('auctions_closed', v_closed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE match_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_bid_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE silent_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;

-- Match alerts: usuario ve e edita apenas os seus
CREATE POLICY match_alerts_select ON match_alerts FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));
CREATE POLICY match_alerts_insert ON match_alerts FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));
CREATE POLICY match_alerts_update ON match_alerts FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));
CREATE POLICY match_alerts_delete ON match_alerts FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));

-- Auto bid rules: usuario ve e edita apenas os seus
CREATE POLICY auto_bid_select ON auto_bid_rules FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));
CREATE POLICY auto_bid_insert ON auto_bid_rules FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));
CREATE POLICY auto_bid_update ON auto_bid_rules FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));

-- Leiloes: visiveis para todos autenticados, editaveis pelo vendedor
CREATE POLICY auctions_select ON silent_auctions FOR SELECT USING (TRUE);
CREATE POLICY auctions_insert ON silent_auctions FOR INSERT
  WITH CHECK (seller_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));
CREATE POLICY auctions_update ON silent_auctions FOR UPDATE
  USING (seller_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));

-- Bids: usuario ve os seus, insert para qualquer autenticado
CREATE POLICY bids_select_own ON auction_bids FOR SELECT
  USING (bidder_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));
CREATE POLICY bids_select_seller ON auction_bids FOR SELECT
  USING (auction_id IN (SELECT id FROM silent_auctions WHERE seller_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())));
CREATE POLICY bids_insert ON auction_bids FOR INSERT
  WITH CHECK (bidder_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));
CREATE POLICY bids_update ON auction_bids FOR UPDATE
  USING (bidder_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE silent_auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE auction_bids;
ALTER PUBLICATION supabase_realtime ADD TABLE match_alerts;
