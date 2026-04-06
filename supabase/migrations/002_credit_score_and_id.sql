-- ============================================================
-- E-CREDac ICMS Platform — Migration 002
-- Credit Score System + Credit ID
-- "Clearing House de Credito Fiscal"
-- ============================================================

-- ============================================================
-- ENUM: credit_score_grade
-- ============================================================
CREATE TYPE credit_score_grade AS ENUM ('A', 'B', 'C', 'D');

-- ============================================================
-- TABLE: credit_scores
-- Score de qualidade de cada credito listado
-- ============================================================

CREATE TABLE credit_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES credit_listings(id) ON DELETE CASCADE,

  -- Score geral (0-100) e grade (A/B/C/D)
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  grade credit_score_grade NOT NULL,

  -- Componentes do score (cada um 0-100)
  sefaz_risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,        -- Risco SEFAZ da empresa cedente
  homologation_score NUMERIC(5,2) NOT NULL DEFAULT 0,       -- Status de homologacao
  maturity_score NUMERIC(5,2) NOT NULL DEFAULT 0,           -- Maturidade do credito (tempo)
  origin_score NUMERIC(5,2) NOT NULL DEFAULT 0,             -- Qualidade da origem
  documentation_score NUMERIC(5,2) NOT NULL DEFAULT 0,      -- Completude documental
  historical_score NUMERIC(5,2) NOT NULL DEFAULT 0,         -- Historico da empresa na plataforma

  -- Detalhes do risco
  risk_factors JSONB DEFAULT '[]',
  -- Ex: [{"factor": "sefaz_irregular", "impact": -20, "description": "..."}]

  -- Tempo medio de homologacao estimado (dias)
  estimated_homologation_days INTEGER,

  -- Versao do algoritmo
  algorithm_version VARCHAR(10) NOT NULL DEFAULT 'v1',

  -- Metadata
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_credit_scores_listing ON credit_scores(listing_id);
CREATE INDEX idx_credit_scores_grade ON credit_scores(grade);
CREATE INDEX idx_credit_scores_score ON credit_scores(score DESC);

-- ============================================================
-- ADD: credit_id to credit_listings
-- Identificador unico rastreavel do credito
-- Formato: ECR-{TIPO}{ORIGEM}-{ANO}{MES}-{SEQ}
-- Ex: ECR-AE-2504-0001 (Acumulado/Exportacao, Abril 2025, seq 1)
-- ============================================================

ALTER TABLE credit_listings
  ADD COLUMN IF NOT EXISTS credit_id VARCHAR(20) UNIQUE;

-- Sequence para gerar IDs unicos
CREATE SEQUENCE IF NOT EXISTS credit_id_seq START 1;

-- ============================================================
-- TABLE: price_history
-- Historico de precos para precificacao inteligente (Sprint 2)
-- Ja criamos a tabela para nao precisar de migration futura
-- ============================================================

CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Referencia
  listing_id UUID REFERENCES credit_listings(id),
  transaction_id UUID REFERENCES transactions(id),

  -- Dados do credito no momento
  credit_type credit_type NOT NULL,
  origin credit_origin NOT NULL,
  amount NUMERIC(15,2) NOT NULL,

  -- Preco
  discount_applied NUMERIC(5,2) NOT NULL,
  price_per_real NUMERIC(8,4) NOT NULL, -- valor pago por R$1 de credito

  -- Score no momento da transacao
  credit_score NUMERIC(5,2),
  credit_grade credit_score_grade,

  -- Contexto
  region VARCHAR(2), -- UF

  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_history_type ON price_history(credit_type, origin);
CREATE INDEX idx_price_history_date ON price_history(recorded_at DESC);
CREATE INDEX idx_price_history_grade ON price_history(credit_grade);

-- ============================================================
-- FUNCTION: generate_credit_id()
-- Gera ID unico para cada credito
-- ============================================================

CREATE OR REPLACE FUNCTION generate_credit_id(
  p_credit_type credit_type,
  p_origin credit_origin
) RETURNS VARCHAR(20) AS $$
DECLARE
  type_code CHAR(1);
  origin_code CHAR(1);
  year_month VARCHAR(4);
  seq_num INTEGER;
  credit_id VARCHAR(20);
BEGIN
  -- Type code
  type_code := CASE p_credit_type
    WHEN 'acumulado' THEN 'A'
    WHEN 'st' THEN 'S'
    WHEN 'rural' THEN 'R'
  END;

  -- Origin code
  origin_code := CASE p_origin
    WHEN 'exportacao' THEN 'E'
    WHEN 'diferimento' THEN 'D'
    WHEN 'aliquota_reduzida' THEN 'R'
    WHEN 'substituicao_tributaria' THEN 'T'
  END;

  -- Year + Month
  year_month := TO_CHAR(NOW(), 'YYMM');

  -- Sequence
  seq_num := NEXTVAL('credit_id_seq');

  credit_id := 'ECR-' || type_code || origin_code || '-' || year_month || '-' || LPAD(seq_num::TEXT, 4, '0');

  RETURN credit_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER: auto-generate credit_id on listing insert
-- ============================================================

CREATE OR REPLACE FUNCTION auto_generate_credit_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.credit_id IS NULL THEN
    NEW.credit_id := generate_credit_id(NEW.credit_type, NEW.origin);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listing_credit_id
  BEFORE INSERT ON credit_listings
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_credit_id();

-- ============================================================
-- FUNCTION: calculate_credit_score()
-- Calcula score de um credito
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_credit_score(p_listing_id UUID)
RETURNS TABLE (
  score NUMERIC,
  grade credit_score_grade,
  sefaz_risk NUMERIC,
  homologation NUMERIC,
  maturity NUMERIC,
  origin_quality NUMERIC,
  documentation NUMERIC,
  historical NUMERIC,
  risk_factors JSONB,
  est_homologation_days INTEGER
) AS $$
DECLARE
  v_listing credit_listings%ROWTYPE;
  v_company companies%ROWTYPE;
  v_sefaz_score NUMERIC := 0;
  v_homolog_score NUMERIC := 0;
  v_maturity_score NUMERIC := 0;
  v_origin_score NUMERIC := 0;
  v_doc_score NUMERIC := 0;
  v_hist_score NUMERIC := 0;
  v_total_score NUMERIC := 0;
  v_grade credit_score_grade;
  v_risks JSONB := '[]'::JSONB;
  v_est_days INTEGER := 30;
  v_completed_count INTEGER;
  v_disputed_count INTEGER;
  v_days_since_creation INTEGER;
BEGIN
  -- Buscar listing e company
  SELECT * INTO v_listing FROM credit_listings WHERE id = p_listing_id;
  SELECT * INTO v_company FROM companies WHERE id = v_listing.company_id;

  IF v_listing IS NULL OR v_company IS NULL THEN
    RAISE EXCEPTION 'Listing or company not found';
  END IF;

  -- ==============================
  -- 1. SEFAZ RISK SCORE (peso: 25%)
  -- ==============================
  v_sefaz_score := CASE v_company.sefaz_status
    WHEN 'regular' THEN 100
    WHEN 'pending' THEN 50
    WHEN 'irregular' THEN 15
    WHEN 'suspended' THEN 0
  END;

  IF v_company.sefaz_status != 'regular' THEN
    v_risks := v_risks || jsonb_build_object(
      'factor', 'sefaz_' || v_company.sefaz_status::TEXT,
      'impact', -(100 - v_sefaz_score),
      'description', 'Situacao SEFAZ: ' || v_company.sefaz_status::TEXT
    );
  END IF;

  -- ==============================
  -- 2. HOMOLOGATION SCORE (peso: 25%)
  -- ==============================
  v_homolog_score := CASE v_listing.homologation_status
    WHEN 'homologado' THEN 100
    WHEN 'em_analise' THEN 60
    WHEN 'pendente' THEN 30
    WHEN 'rejeitado' THEN 0
  END;

  v_est_days := CASE v_listing.homologation_status
    WHEN 'homologado' THEN 0
    WHEN 'em_analise' THEN 15
    WHEN 'pendente' THEN 30
    WHEN 'rejeitado' THEN -1
  END;

  IF v_listing.homologation_status = 'rejeitado' THEN
    v_risks := v_risks || jsonb_build_object(
      'factor', 'homologacao_rejeitada',
      'impact', -100,
      'description', 'Credito rejeitado pela SEFAZ'
    );
  END IF;

  -- ==============================
  -- 3. MATURITY SCORE (peso: 15%)
  -- Creditos mais antigos e estabelecidos = mais confiaveis
  -- ==============================
  v_days_since_creation := EXTRACT(DAY FROM NOW() - v_listing.created_at);
  v_maturity_score := CASE
    WHEN v_listing.homologation_date IS NOT NULL AND v_listing.homologation_date < CURRENT_DATE - INTERVAL '180 days' THEN 100
    WHEN v_listing.homologation_date IS NOT NULL AND v_listing.homologation_date < CURRENT_DATE - INTERVAL '90 days' THEN 85
    WHEN v_listing.homologation_date IS NOT NULL THEN 70
    WHEN v_days_since_creation > 90 THEN 50
    WHEN v_days_since_creation > 30 THEN 40
    ELSE 30
  END;

  -- Penalizar se proximo da expiracao
  IF v_listing.expires_at IS NOT NULL AND v_listing.expires_at < CURRENT_DATE + INTERVAL '30 days' THEN
    v_maturity_score := v_maturity_score * 0.7;
    v_risks := v_risks || jsonb_build_object(
      'factor', 'expiracao_proxima',
      'impact', -15,
      'description', 'Credito expira em menos de 30 dias'
    );
  END IF;

  -- ==============================
  -- 4. ORIGIN SCORE (peso: 15%)
  -- ==============================
  v_origin_score := CASE v_listing.origin
    WHEN 'exportacao' THEN 95           -- Mais previsivel, aceitacao alta
    WHEN 'substituicao_tributaria' THEN 85  -- Bem regulamentado
    WHEN 'diferimento' THEN 70          -- Moderado
    WHEN 'aliquota_reduzida' THEN 60    -- Menor liquidez historica
  END;

  -- Bonus por tipo
  IF v_listing.credit_type = 'acumulado' AND v_listing.origin = 'exportacao' THEN
    v_origin_score := LEAST(v_origin_score + 5, 100);
  END IF;

  -- ==============================
  -- 5. DOCUMENTATION SCORE (peso: 10%)
  -- ==============================
  v_doc_score := 40; -- Base

  IF v_listing.e_credac_protocol IS NOT NULL THEN
    v_doc_score := v_doc_score + 30;
  ELSE
    v_risks := v_risks || jsonb_build_object(
      'factor', 'sem_protocolo_ecredac',
      'impact', -15,
      'description', 'Protocolo e-CredAc nao informado'
    );
  END IF;

  IF v_listing.description IS NOT NULL AND LENGTH(v_listing.description) > 20 THEN
    v_doc_score := v_doc_score + 15;
  END IF;

  IF v_listing.homologation_date IS NOT NULL THEN
    v_doc_score := v_doc_score + 15;
  END IF;

  -- ==============================
  -- 6. HISTORICAL SCORE (peso: 10%)
  -- Baseado no historico da empresa na plataforma
  -- ==============================
  SELECT COUNT(*) INTO v_completed_count
  FROM transactions t
  WHERE (t.seller_company_id = v_company.id OR t.buyer_company_id = v_company.id)
    AND t.status = 'completed';

  SELECT COUNT(*) INTO v_disputed_count
  FROM transactions t
  WHERE (t.seller_company_id = v_company.id OR t.buyer_company_id = v_company.id)
    AND t.status = 'disputed';

  v_hist_score := CASE
    WHEN v_completed_count >= 10 THEN 100
    WHEN v_completed_count >= 5 THEN 85
    WHEN v_completed_count >= 2 THEN 70
    WHEN v_completed_count >= 1 THEN 55
    ELSE 40 -- Novo na plataforma
  END;

  -- Penalizar disputas
  IF v_disputed_count > 0 THEN
    v_hist_score := GREATEST(v_hist_score - (v_disputed_count * 15), 0);
    v_risks := v_risks || jsonb_build_object(
      'factor', 'historico_disputas',
      'impact', -(v_disputed_count * 15),
      'description', v_disputed_count || ' transacao(oes) disputada(s)'
    );
  END IF;

  -- ==============================
  -- CALCULO FINAL
  -- Pesos: SEFAZ 25% + Homolog 25% + Maturity 15% + Origin 15% + Doc 10% + Hist 10%
  -- ==============================
  v_total_score := ROUND(
    (v_sefaz_score * 0.25) +
    (v_homolog_score * 0.25) +
    (v_maturity_score * 0.15) +
    (v_origin_score * 0.15) +
    (v_doc_score * 0.10) +
    (v_hist_score * 0.10),
    2
  );

  -- Grade
  v_grade := CASE
    WHEN v_total_score >= 80 THEN 'A'::credit_score_grade
    WHEN v_total_score >= 60 THEN 'B'::credit_score_grade
    WHEN v_total_score >= 40 THEN 'C'::credit_score_grade
    ELSE 'D'::credit_score_grade
  END;

  -- Upsert score
  INSERT INTO credit_scores (
    listing_id, score, grade,
    sefaz_risk_score, homologation_score, maturity_score,
    origin_score, documentation_score, historical_score,
    risk_factors, estimated_homologation_days
  ) VALUES (
    p_listing_id, v_total_score, v_grade,
    v_sefaz_score, v_homolog_score, v_maturity_score,
    v_origin_score, v_doc_score, v_hist_score,
    v_risks, GREATEST(v_est_days, 0)
  )
  ON CONFLICT (listing_id) DO UPDATE SET
    score = EXCLUDED.score,
    grade = EXCLUDED.grade,
    sefaz_risk_score = EXCLUDED.sefaz_risk_score,
    homologation_score = EXCLUDED.homologation_score,
    maturity_score = EXCLUDED.maturity_score,
    origin_score = EXCLUDED.origin_score,
    documentation_score = EXCLUDED.documentation_score,
    historical_score = EXCLUDED.historical_score,
    risk_factors = EXCLUDED.risk_factors,
    estimated_homologation_days = EXCLUDED.estimated_homologation_days,
    calculated_at = NOW(),
    expires_at = NOW() + INTERVAL '24 hours',
    updated_at = NOW();

  -- Return
  score := v_total_score;
  grade := v_grade;
  sefaz_risk := v_sefaz_score;
  homologation := v_homolog_score;
  maturity := v_maturity_score;
  origin_quality := v_origin_score;
  documentation := v_doc_score;
  historical := v_hist_score;
  risk_factors := v_risks;
  est_homologation_days := GREATEST(v_est_days, 0);
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS for credit_scores
-- ============================================================

ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Scores visiveis para todos autenticados (informacao de mercado)
CREATE POLICY credit_scores_select ON credit_scores FOR SELECT
  USING (TRUE);

CREATE POLICY price_history_select ON price_history FOR SELECT
  USING (TRUE);

-- Trigger para atualizar score
CREATE TRIGGER trg_credit_scores_updated
  BEFORE UPDATE ON credit_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Realtime para scores
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE credit_scores;
