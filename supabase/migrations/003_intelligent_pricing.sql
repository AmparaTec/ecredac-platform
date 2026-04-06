-- ============================================================
-- E-CREDac ICMS Platform — Migration 003
-- Sprint 2: Precificacao Inteligente
-- Motor de recomendacao de preco baseado em dados de mercado
-- AMBIENTE: DEV ONLY (ggtivdrgazqygydoiyqu)
-- ============================================================

-- ============================================================
-- TABLE: market_benchmarks
-- Benchmarks de mercado por tipo/origem/grade para pricing
-- Atualizado periodicamente pelo sistema
-- ============================================================

CREATE TABLE market_benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  credit_type credit_type NOT NULL,
  origin credit_origin NOT NULL,
  credit_grade credit_score_grade,

  -- Metricas de preco
  avg_discount NUMERIC(5,2) NOT NULL DEFAULT 0,
  min_discount NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_discount NUMERIC(5,2) NOT NULL DEFAULT 0,
  median_discount NUMERIC(5,2) NOT NULL DEFAULT 0,
  stddev_discount NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Volume
  total_volume NUMERIC(15,2) NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,

  -- Tendencia (variacao % vs periodo anterior)
  discount_trend NUMERIC(5,2) NOT NULL DEFAULT 0,
  volume_trend NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Liquidez (dias medios para vender)
  avg_days_to_sell NUMERIC(5,1) DEFAULT NULL,
  liquidity_score NUMERIC(5,2) DEFAULT 0, -- 0-100

  -- Periodo de referencia
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Meta
  sample_size INTEGER NOT NULL DEFAULT 0,
  confidence_level NUMERIC(3,2) NOT NULL DEFAULT 0.50,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_market_benchmarks_type ON market_benchmarks(credit_type, origin);
CREATE INDEX idx_market_benchmarks_grade ON market_benchmarks(credit_grade);
CREATE INDEX idx_market_benchmarks_period ON market_benchmarks(period_end DESC);

CREATE UNIQUE INDEX idx_market_benchmarks_unique
  ON market_benchmarks(credit_type, origin, COALESCE(credit_grade, 'A'), period_start);

-- ============================================================
-- TABLE: price_recommendations
-- Cache de recomendacoes de preco por listing
-- ============================================================

CREATE TABLE price_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES credit_listings(id) ON DELETE CASCADE,

  -- Recomendacao
  recommended_discount NUMERIC(5,2) NOT NULL,
  discount_range_low NUMERIC(5,2) NOT NULL,
  discount_range_high NUMERIC(5,2) NOT NULL,

  -- Preco por R$1 de credito
  recommended_price_per_real NUMERIC(8,4) NOT NULL,

  -- Confianca da recomendacao (0-100)
  confidence NUMERIC(5,2) NOT NULL DEFAULT 50,

  -- Fatores que influenciaram
  factors JSONB NOT NULL DEFAULT '[]',
  -- Ex: [{"name": "grade_premium", "impact": -2.5, "desc": "Score A reduz desconto"}]

  -- Comparacao com mercado
  vs_market_avg NUMERIC(5,2) DEFAULT 0, -- % acima/abaixo da media
  vs_market_position VARCHAR(20) DEFAULT 'na_media',
  -- 'abaixo_mercado', 'na_media', 'acima_mercado', 'premium'

  -- Velocidade estimada de venda
  estimated_days_to_sell INTEGER,
  sell_probability_7d NUMERIC(5,2) DEFAULT 0, -- prob de vender em 7 dias (0-100)
  sell_probability_30d NUMERIC(5,2) DEFAULT 0, -- prob de vender em 30 dias (0-100)

  -- Algoritmo
  algorithm_version VARCHAR(10) NOT NULL DEFAULT 'v1',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '6 hours'),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_price_rec_listing ON price_recommendations(listing_id);
CREATE INDEX idx_price_rec_expires ON price_recommendations(expires_at);

-- ============================================================
-- FUNCTION: calculate_price_recommendation(listing_id UUID)
-- Motor de precificacao inteligente
-- Retorna recomendacao de preco baseada em:
-- 1. Historico de transacoes similares (price_history)
-- 2. Score/grade do credito
-- 3. Benchmarks de mercado
-- 4. Oferta/demanda atual
-- 5. Urgencia e maturidade
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_price_recommendation(p_listing_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_listing RECORD;
  v_score RECORD;
  v_benchmark RECORD;
  v_hist_avg NUMERIC(5,2);
  v_hist_count INTEGER;
  v_supply_count INTEGER;
  v_demand_count INTEGER;
  v_demand_volume NUMERIC(15,2);
  v_supply_volume NUMERIC(15,2);
  v_base_discount NUMERIC(5,2);
  v_adjusted_discount NUMERIC(5,2);
  v_range_low NUMERIC(5,2);
  v_range_high NUMERIC(5,2);
  v_confidence NUMERIC(5,2);
  v_factors JSONB := '[]'::JSONB;
  v_days_to_sell INTEGER;
  v_sell_prob_7d NUMERIC(5,2);
  v_sell_prob_30d NUMERIC(5,2);
  v_market_position VARCHAR(20);
  v_price_per_real NUMERIC(8,4);
BEGIN
  -- ==========================================
  -- 1. Buscar dados do listing
  -- ==========================================
  SELECT l.*, c.sefaz_status, c.type as company_type
  INTO v_listing
  FROM credit_listings l
  JOIN companies c ON c.id = l.company_id
  WHERE l.id = p_listing_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Listing not found');
  END IF;

  -- ==========================================
  -- 2. Buscar score do credito
  -- ==========================================
  SELECT * INTO v_score
  FROM credit_scores
  WHERE listing_id = p_listing_id
  ORDER BY calculated_at DESC LIMIT 1;

  -- ==========================================
  -- 3. Historico de transacoes similares (ultimos 90 dias)
  -- ==========================================
  SELECT
    COALESCE(AVG(discount_applied), 0),
    COUNT(*)
  INTO v_hist_avg, v_hist_count
  FROM price_history
  WHERE credit_type = v_listing.credit_type
    AND origin = v_listing.origin
    AND recorded_at > NOW() - INTERVAL '90 days';

  -- ==========================================
  -- 4. Benchmark de mercado
  -- ==========================================
  SELECT * INTO v_benchmark
  FROM market_benchmarks
  WHERE credit_type = v_listing.credit_type
    AND origin = v_listing.origin
    AND (credit_grade = v_score.grade OR credit_grade IS NULL)
  ORDER BY
    CASE WHEN credit_grade = v_score.grade THEN 0 ELSE 1 END,
    period_end DESC
  LIMIT 1;

  -- ==========================================
  -- 5. Oferta/demanda atual
  -- ==========================================
  SELECT COUNT(*), COALESCE(SUM(remaining_amount), 0)
  INTO v_supply_count, v_supply_volume
  FROM credit_listings
  WHERE credit_type = v_listing.credit_type
    AND origin = v_listing.origin
    AND status = 'active';

  SELECT COUNT(*), COALESCE(SUM(remaining_needed), 0)
  INTO v_demand_count, v_demand_volume
  FROM credit_requests
  WHERE status = 'active'
    AND (preferred_credit_types IS NULL OR v_listing.credit_type = ANY(preferred_credit_types))
    AND (preferred_origins IS NULL OR v_listing.origin = ANY(preferred_origins));

  -- ==========================================
  -- 6. Calcular desconto base
  -- ==========================================

  -- Ponto de partida: media do listing (min_discount + max_discount) / 2
  v_base_discount := (v_listing.min_discount + v_listing.max_discount) / 2.0;

  -- Se temos historico, pesar com ele
  IF v_hist_count >= 3 THEN
    v_base_discount := (v_base_discount * 0.3) + (v_hist_avg * 0.7);
    v_factors := v_factors || jsonb_build_array(jsonb_build_object(
      'name', 'historico_transacoes',
      'impact', ROUND(v_hist_avg - v_base_discount, 2),
      'desc', format('Media de %s transacoes similares: %s%%', v_hist_count, ROUND(v_hist_avg, 1))
    ));
  ELSIF v_hist_count >= 1 THEN
    v_base_discount := (v_base_discount * 0.5) + (v_hist_avg * 0.5);
    v_factors := v_factors || jsonb_build_array(jsonb_build_object(
      'name', 'historico_limitado',
      'impact', ROUND(v_hist_avg - v_base_discount, 2),
      'desc', format('Poucos dados (%s transacoes), peso reduzido', v_hist_count)
    ));
  END IF;

  -- Se temos benchmark, ajustar
  IF v_benchmark IS NOT NULL AND v_benchmark.transaction_count >= 5 THEN
    v_base_discount := (v_base_discount * 0.6) + (v_benchmark.avg_discount * 0.4);
    v_factors := v_factors || jsonb_build_array(jsonb_build_object(
      'name', 'benchmark_mercado',
      'impact', ROUND(v_benchmark.avg_discount - v_base_discount, 2),
      'desc', format('Benchmark de mercado: %s%% (n=%s)', ROUND(v_benchmark.avg_discount, 1), v_benchmark.transaction_count)
    ));
  END IF;

  v_adjusted_discount := v_base_discount;

  -- ==========================================
  -- 7. Ajustes por fatores
  -- ==========================================

  -- 7a. Ajuste por Grade do Score
  IF v_score IS NOT NULL THEN
    CASE v_score.grade
      WHEN 'A' THEN
        v_adjusted_discount := v_adjusted_discount - 3.0;
        v_factors := v_factors || jsonb_build_array(jsonb_build_object(
          'name', 'grade_premium', 'impact', -3.0,
          'desc', 'Score A: credito premium, desconto menor'
        ));
      WHEN 'B' THEN
        v_adjusted_discount := v_adjusted_discount - 1.0;
        v_factors := v_factors || jsonb_build_array(jsonb_build_object(
          'name', 'grade_bom', 'impact', -1.0,
          'desc', 'Score B: bom credito, leve reducao no desconto'
        ));
      WHEN 'C' THEN
        v_adjusted_discount := v_adjusted_discount + 1.5;
        v_factors := v_factors || jsonb_build_array(jsonb_build_object(
          'name', 'grade_regular', 'impact', 1.5,
          'desc', 'Score C: risco moderado, desconto maior'
        ));
      WHEN 'D' THEN
        v_adjusted_discount := v_adjusted_discount + 4.0;
        v_factors := v_factors || jsonb_build_array(jsonb_build_object(
          'name', 'grade_alto_risco', 'impact', 4.0,
          'desc', 'Score D: alto risco, desconto significativamente maior'
        ));
    END CASE;
  END IF;

  -- 7b. Ajuste por oferta/demanda
  IF v_supply_count > 0 AND v_demand_count > 0 THEN
    IF v_demand_volume > v_supply_volume * 1.5 THEN
      -- Alta demanda: vendedor pode pedir menos desconto
      v_adjusted_discount := v_adjusted_discount - 2.0;
      v_factors := v_factors || jsonb_build_array(jsonb_build_object(
        'name', 'alta_demanda', 'impact', -2.0,
        'desc', format('Demanda %sx maior que oferta', ROUND((v_demand_volume / NULLIF(v_supply_volume, 0))::numeric, 1))
      ));
    ELSIF v_supply_volume > v_demand_volume * 1.5 THEN
      -- Alta oferta: comprador pode exigir mais desconto
      v_adjusted_discount := v_adjusted_discount + 2.0;
      v_factors := v_factors || jsonb_build_array(jsonb_build_object(
        'name', 'excesso_oferta', 'impact', 2.0,
        'desc', format('Oferta %sx maior que demanda', ROUND((v_supply_volume / NULLIF(v_demand_volume, 0))::numeric, 1))
      ));
    END IF;
  END IF;

  -- 7c. Ajuste por volume (creditos grandes tem leve desconto extra)
  IF v_listing.amount > 1000000 THEN
    v_adjusted_discount := v_adjusted_discount - 1.0;
    v_factors := v_factors || jsonb_build_array(jsonb_build_object(
      'name', 'volume_premium', 'impact', -1.0,
      'desc', 'Volume acima de R$1M: atrativo para grandes compradores'
    ));
  ELSIF v_listing.amount < 50000 THEN
    v_adjusted_discount := v_adjusted_discount + 0.5;
    v_factors := v_factors || jsonb_build_array(jsonb_build_object(
      'name', 'volume_pequeno', 'impact', 0.5,
      'desc', 'Volume abaixo de R$50K: menor atratividade'
    ));
  END IF;

  -- 7d. Ajuste por homologacao
  IF v_listing.homologation_status = 'homologado' THEN
    v_adjusted_discount := v_adjusted_discount - 1.5;
    v_factors := v_factors || jsonb_build_array(jsonb_build_object(
      'name', 'ja_homologado', 'impact', -1.5,
      'desc', 'Credito ja homologado pela SEFAZ: seguranca maxima'
    ));
  ELSIF v_listing.homologation_status = 'pendente' THEN
    v_adjusted_discount := v_adjusted_discount + 2.0;
    v_factors := v_factors || jsonb_build_array(jsonb_build_object(
      'name', 'nao_homologado', 'impact', 2.0,
      'desc', 'Ainda nao homologado: risco adicional para comprador'
    ));
  END IF;

  -- 7e. Ajuste por SEFAZ status
  IF v_listing.sefaz_status = 'irregular' THEN
    v_adjusted_discount := v_adjusted_discount + 3.0;
    v_factors := v_factors || jsonb_build_array(jsonb_build_object(
      'name', 'sefaz_irregular', 'impact', 3.0,
      'desc', 'Empresa com status irregular na SEFAZ'
    ));
  END IF;

  -- ==========================================
  -- 8. Limitar e calcular faixa
  -- ==========================================
  v_adjusted_discount := GREATEST(1.0, LEAST(v_adjusted_discount, 40.0));
  v_range_low := GREATEST(1.0, v_adjusted_discount - 3.0);
  v_range_high := LEAST(40.0, v_adjusted_discount + 3.0);

  -- Preco por R$1 de credito
  v_price_per_real := 1.0 - (v_adjusted_discount / 100.0);

  -- ==========================================
  -- 9. Confianca da recomendacao
  -- ==========================================
  v_confidence := 30.0; -- base

  IF v_hist_count >= 10 THEN v_confidence := v_confidence + 30.0;
  ELSIF v_hist_count >= 5 THEN v_confidence := v_confidence + 20.0;
  ELSIF v_hist_count >= 1 THEN v_confidence := v_confidence + 10.0;
  END IF;

  IF v_score IS NOT NULL THEN v_confidence := v_confidence + 15.0; END IF;
  IF v_benchmark IS NOT NULL THEN v_confidence := v_confidence + 15.0; END IF;
  IF v_demand_count > 0 AND v_supply_count > 0 THEN v_confidence := v_confidence + 10.0; END IF;

  v_confidence := LEAST(v_confidence, 95.0);

  -- ==========================================
  -- 10. Estimativa de velocidade de venda
  -- ==========================================
  IF v_benchmark IS NOT NULL AND v_benchmark.avg_days_to_sell IS NOT NULL THEN
    v_days_to_sell := ROUND(v_benchmark.avg_days_to_sell);
  ELSE
    -- Estimativa padrao por grade
    v_days_to_sell := CASE
      WHEN v_score IS NOT NULL AND v_score.grade = 'A' THEN 5
      WHEN v_score IS NOT NULL AND v_score.grade = 'B' THEN 12
      WHEN v_score IS NOT NULL AND v_score.grade = 'C' THEN 25
      WHEN v_score IS NOT NULL AND v_score.grade = 'D' THEN 45
      ELSE 15
    END;
  END IF;

  -- Probabilidade de venda
  v_sell_prob_7d := CASE
    WHEN v_days_to_sell <= 5 THEN 85.0
    WHEN v_days_to_sell <= 10 THEN 60.0
    WHEN v_days_to_sell <= 20 THEN 35.0
    ELSE 15.0
  END;

  v_sell_prob_30d := CASE
    WHEN v_days_to_sell <= 10 THEN 95.0
    WHEN v_days_to_sell <= 20 THEN 80.0
    WHEN v_days_to_sell <= 30 THEN 60.0
    ELSE 35.0
  END;

  -- ==========================================
  -- 11. Posicao de mercado
  -- ==========================================
  IF v_benchmark IS NOT NULL AND v_benchmark.avg_discount > 0 THEN
    IF v_adjusted_discount < v_benchmark.avg_discount - 3 THEN
      v_market_position := 'premium';
    ELSIF v_adjusted_discount < v_benchmark.avg_discount - 1 THEN
      v_market_position := 'acima_mercado';
    ELSIF v_adjusted_discount > v_benchmark.avg_discount + 1 THEN
      v_market_position := 'abaixo_mercado';
    ELSE
      v_market_position := 'na_media';
    END IF;
  ELSE
    v_market_position := 'na_media';
  END IF;

  -- ==========================================
  -- 12. Upsert na tabela price_recommendations
  -- ==========================================
  INSERT INTO price_recommendations (
    listing_id,
    recommended_discount, discount_range_low, discount_range_high,
    recommended_price_per_real,
    confidence, factors,
    vs_market_avg, vs_market_position,
    estimated_days_to_sell, sell_probability_7d, sell_probability_30d,
    calculated_at, expires_at
  ) VALUES (
    p_listing_id,
    v_adjusted_discount, v_range_low, v_range_high,
    v_price_per_real,
    v_confidence, v_factors,
    COALESCE(v_adjusted_discount - v_benchmark.avg_discount, 0),
    v_market_position,
    v_days_to_sell, v_sell_prob_7d, v_sell_prob_30d,
    NOW(), NOW() + INTERVAL '6 hours'
  )
  ON CONFLICT (listing_id)
  DO UPDATE SET
    recommended_discount = EXCLUDED.recommended_discount,
    discount_range_low = EXCLUDED.discount_range_low,
    discount_range_high = EXCLUDED.discount_range_high,
    recommended_price_per_real = EXCLUDED.recommended_price_per_real,
    confidence = EXCLUDED.confidence,
    factors = EXCLUDED.factors,
    vs_market_avg = EXCLUDED.vs_market_avg,
    vs_market_position = EXCLUDED.vs_market_position,
    estimated_days_to_sell = EXCLUDED.estimated_days_to_sell,
    sell_probability_7d = EXCLUDED.sell_probability_7d,
    sell_probability_30d = EXCLUDED.sell_probability_30d,
    calculated_at = NOW(),
    expires_at = NOW() + INTERVAL '6 hours',
    updated_at = NOW();

  -- ==========================================
  -- 13. Retornar resultado
  -- ==========================================
  RETURN jsonb_build_object(
    'listing_id', p_listing_id,
    'recommended_discount', v_adjusted_discount,
    'discount_range', jsonb_build_object('low', v_range_low, 'high', v_range_high),
    'price_per_real', v_price_per_real,
    'confidence', v_confidence,
    'factors', v_factors,
    'market_position', v_market_position,
    'vs_market_avg', COALESCE(v_adjusted_discount - v_benchmark.avg_discount, 0),
    'estimated_days_to_sell', v_days_to_sell,
    'sell_probability', jsonb_build_object('7d', v_sell_prob_7d, '30d', v_sell_prob_30d),
    'data_points', jsonb_build_object(
      'history_transactions', v_hist_count,
      'supply_count', v_supply_count,
      'demand_count', v_demand_count,
      'supply_volume', v_supply_volume,
      'demand_volume', v_demand_volume
    ),
    'algorithm_version', 'v1'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: update_market_benchmarks()
-- Recalcula benchmarks de mercado (rodar periodicamente)
-- ============================================================

CREATE OR REPLACE FUNCTION update_market_benchmarks()
RETURNS JSONB AS $$
DECLARE
  v_updated INTEGER := 0;
  v_combo RECORD;
BEGIN
  -- Para cada combinacao tipo/origem
  FOR v_combo IN
    SELECT DISTINCT credit_type, origin FROM price_history
    WHERE recorded_at > NOW() - INTERVAL '90 days'
  LOOP
    -- Benchmark geral (sem grade)
    INSERT INTO market_benchmarks (
      credit_type, origin, credit_grade,
      avg_discount, min_discount, max_discount, median_discount, stddev_discount,
      total_volume, transaction_count,
      sample_size, period_start, period_end
    )
    SELECT
      v_combo.credit_type, v_combo.origin, NULL,
      ROUND(AVG(discount_applied)::numeric, 2),
      ROUND(MIN(discount_applied)::numeric, 2),
      ROUND(MAX(discount_applied)::numeric, 2),
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY discount_applied)::numeric, 2),
      ROUND(COALESCE(STDDEV(discount_applied), 0)::numeric, 2),
      COALESCE(SUM(amount), 0),
      COUNT(*),
      COUNT(*),
      NOW() - INTERVAL '90 days',
      NOW()
    FROM price_history
    WHERE credit_type = v_combo.credit_type
      AND origin = v_combo.origin
      AND recorded_at > NOW() - INTERVAL '90 days'
    ON CONFLICT (credit_type, origin, COALESCE(credit_grade, 'A'), period_start)
    DO UPDATE SET
      avg_discount = EXCLUDED.avg_discount,
      min_discount = EXCLUDED.min_discount,
      max_discount = EXCLUDED.max_discount,
      median_discount = EXCLUDED.median_discount,
      stddev_discount = EXCLUDED.stddev_discount,
      total_volume = EXCLUDED.total_volume,
      transaction_count = EXCLUDED.transaction_count,
      sample_size = EXCLUDED.sample_size,
      period_end = NOW(),
      updated_at = NOW();

    v_updated := v_updated + 1;

    -- Benchmark por grade
    INSERT INTO market_benchmarks (
      credit_type, origin, credit_grade,
      avg_discount, min_discount, max_discount, median_discount, stddev_discount,
      total_volume, transaction_count,
      sample_size, period_start, period_end
    )
    SELECT
      v_combo.credit_type, v_combo.origin, ph.credit_grade,
      ROUND(AVG(ph.discount_applied)::numeric, 2),
      ROUND(MIN(ph.discount_applied)::numeric, 2),
      ROUND(MAX(ph.discount_applied)::numeric, 2),
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ph.discount_applied)::numeric, 2),
      ROUND(COALESCE(STDDEV(ph.discount_applied), 0)::numeric, 2),
      COALESCE(SUM(ph.amount), 0),
      COUNT(*),
      COUNT(*),
      NOW() - INTERVAL '90 days',
      NOW()
    FROM price_history ph
    WHERE ph.credit_type = v_combo.credit_type
      AND ph.origin = v_combo.origin
      AND ph.credit_grade IS NOT NULL
      AND ph.recorded_at > NOW() - INTERVAL '90 days'
    GROUP BY ph.credit_grade
    ON CONFLICT (credit_type, origin, COALESCE(credit_grade, 'A'), period_start)
    DO UPDATE SET
      avg_discount = EXCLUDED.avg_discount,
      min_discount = EXCLUDED.min_discount,
      max_discount = EXCLUDED.max_discount,
      median_discount = EXCLUDED.median_discount,
      stddev_discount = EXCLUDED.stddev_discount,
      total_volume = EXCLUDED.total_volume,
      transaction_count = EXCLUDED.transaction_count,
      sample_size = EXCLUDED.sample_size,
      period_end = NOW(),
      updated_at = NOW();

    v_updated := v_updated + 1;
  END LOOP;

  RETURN jsonb_build_object('benchmarks_updated', v_updated);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: record_price_from_transaction()
-- Trigger: quando transacao completa, registra em price_history
-- ============================================================

CREATE OR REPLACE FUNCTION record_price_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_listing RECORD;
  v_score RECORD;
BEGIN
  -- Somente quando status muda para 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Buscar listing via match
    SELECT cl.* INTO v_listing
    FROM matches m
    JOIN credit_listings cl ON cl.id = m.listing_id
    WHERE m.id = NEW.match_id;

    IF FOUND THEN
      -- Buscar score atual
      SELECT score, grade INTO v_score
      FROM credit_scores
      WHERE listing_id = v_listing.id
      ORDER BY calculated_at DESC LIMIT 1;

      INSERT INTO price_history (
        listing_id, transaction_id,
        credit_type, origin, amount,
        discount_applied, price_per_real,
        credit_score, credit_grade
      ) VALUES (
        v_listing.id, NEW.id,
        v_listing.credit_type, v_listing.origin, NEW.credit_amount,
        NEW.discount_applied, 1.0 - (NEW.discount_applied / 100.0),
        v_score.score, v_score.grade
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_record_price_on_tx_complete
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION record_price_from_transaction();

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE market_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_recommendations ENABLE ROW LEVEL SECURITY;

-- Benchmarks sao publicos para autenticados (dados de mercado)
CREATE POLICY market_benchmarks_select ON market_benchmarks FOR SELECT
  USING (TRUE);

-- Recomendacoes sao visiveis para todos autenticados
CREATE POLICY price_recommendations_select ON price_recommendations FOR SELECT
  USING (TRUE);

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE price_recommendations;
ALTER PUBLICATION supabase_realtime ADD TABLE market_benchmarks;

-- ============================================================
-- SEED: Dados iniciais de benchmark para nao começar vazio
-- ============================================================

INSERT INTO market_benchmarks (credit_type, origin, credit_grade, avg_discount, min_discount, max_discount, median_discount, stddev_discount, total_volume, transaction_count, avg_days_to_sell, liquidity_score, sample_size, confidence_level, period_start, period_end) VALUES
('acumulado', 'exportacao', 'A', 8.50, 5.00, 12.00, 8.00, 1.80, 15000000, 42, 4.5, 92, 42, 0.85, NOW() - INTERVAL '90 days', NOW()),
('acumulado', 'exportacao', 'B', 11.00, 7.00, 15.00, 10.50, 2.10, 8500000, 28, 8.0, 78, 28, 0.80, NOW() - INTERVAL '90 days', NOW()),
('acumulado', 'exportacao', 'C', 15.50, 10.00, 22.00, 15.00, 3.20, 3200000, 12, 18.0, 52, 12, 0.65, NOW() - INTERVAL '90 days', NOW()),
('acumulado', 'exportacao', 'D', 22.00, 15.00, 32.00, 21.00, 4.50, 800000, 4, 35.0, 25, 4, 0.40, NOW() - INTERVAL '90 days', NOW()),

('acumulado', 'diferimento', 'A', 10.00, 6.00, 14.00, 9.50, 2.00, 9000000, 30, 6.0, 85, 30, 0.82, NOW() - INTERVAL '90 days', NOW()),
('acumulado', 'diferimento', 'B', 13.00, 9.00, 18.00, 12.50, 2.40, 5500000, 20, 11.0, 70, 20, 0.75, NOW() - INTERVAL '90 days', NOW()),
('acumulado', 'diferimento', 'C', 18.00, 12.00, 25.00, 17.50, 3.50, 2000000, 8, 22.0, 45, 8, 0.58, NOW() - INTERVAL '90 days', NOW()),

('st', 'substituicao_tributaria', 'A', 9.00, 5.50, 13.00, 8.50, 1.90, 12000000, 35, 5.0, 88, 35, 0.83, NOW() - INTERVAL '90 days', NOW()),
('st', 'substituicao_tributaria', 'B', 12.50, 8.00, 17.00, 12.00, 2.30, 7000000, 22, 10.0, 72, 22, 0.77, NOW() - INTERVAL '90 days', NOW()),
('st', 'substituicao_tributaria', 'C', 17.00, 11.00, 24.00, 16.50, 3.40, 2500000, 9, 20.0, 48, 9, 0.60, NOW() - INTERVAL '90 days', NOW()),

('acumulado', 'aliquota_reduzida', 'A', 11.50, 7.00, 16.00, 11.00, 2.30, 6000000, 18, 7.5, 80, 18, 0.75, NOW() - INTERVAL '90 days', NOW()),
('acumulado', 'aliquota_reduzida', 'B', 14.50, 10.00, 20.00, 14.00, 2.60, 3500000, 12, 14.0, 62, 12, 0.68, NOW() - INTERVAL '90 days', NOW());
