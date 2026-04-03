-- ============================================================
-- E-CREDac ICMS Platform — Database Schema
-- Supabase / PostgreSQL
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE company_tier AS ENUM ('free', 'premium');
CREATE TYPE company_type AS ENUM ('seller', 'buyer', 'both');
CREATE TYPE sefaz_status AS ENUM ('regular', 'irregular', 'suspended', 'pending');

CREATE TYPE credit_type AS ENUM ('acumulado', 'st', 'rural');
CREATE TYPE credit_origin AS ENUM ('exportacao', 'diferimento', 'aliquota_reduzida', 'substituicao_tributaria');
CREATE TYPE homologation_status AS ENUM ('pendente', 'em_analise', 'homologado', 'rejeitado');
CREATE TYPE listing_status AS ENUM ('draft', 'active', 'matched', 'sold', 'expired', 'cancelled');

CREATE TYPE request_urgency AS ENUM ('low', 'medium', 'high');
CREATE TYPE request_status AS ENUM ('active', 'matched', 'fulfilled', 'expired', 'cancelled');

CREATE TYPE match_status AS ENUM ('proposed', 'accepted_seller', 'accepted_buyer', 'confirmed', 'cancelled', 'expired');

CREATE TYPE transaction_status AS ENUM ('pending_payment', 'paid', 'transferring', 'completed', 'disputed', 'cancelled');
CREATE TYPE payment_method AS ENUM ('pix', 'ted', 'boleto');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'confirmed', 'failed', 'refunded');

CREATE TYPE document_type AS ENUM ('contract', 'nfe', 'receipt', 'power_of_attorney', 'other');
CREATE TYPE audit_action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'match', 'confirm', 'payment');

-- ============================================================
-- TABLE: companies
-- ============================================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Auth reference
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Company identity
  cnpj VARCHAR(18) NOT NULL UNIQUE,
  razao_social VARCHAR(300) NOT NULL,
  nome_fantasia VARCHAR(200),
  inscricao_estadual VARCHAR(20),

  -- SEFAZ verification
  sefaz_status sefaz_status NOT NULL DEFAULT 'pending',
  sefaz_verified_at TIMESTAMPTZ,
  sefaz_last_check TIMESTAMPTZ,

  -- Contact
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(20),

  -- Address (JSONB for flexibility)
  address JSONB DEFAULT '{}',
  -- Expected: { street, number, complement, neighborhood, city, state, zip }

  -- Platform
  tier company_tier NOT NULL DEFAULT 'free',
  type company_type NOT NULL DEFAULT 'buyer',

  -- Verification
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID,

  -- LGPD
  lgpd_consent BOOLEAN NOT NULL DEFAULT FALSE,
  lgpd_consent_at TIMESTAMPTZ,
  lgpd_consent_ip INET,

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_cnpj ON companies(cnpj);
CREATE INDEX idx_companies_auth_user ON companies(auth_user_id);
CREATE INDEX idx_companies_sefaz_status ON companies(sefaz_status);
CREATE INDEX idx_companies_type ON companies(type);
CREATE INDEX idx_companies_tier ON companies(tier);

-- ============================================================
-- TABLE: credit_listings (ofertas de credito — cedentes)
-- ============================================================

CREATE TABLE credit_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Credit details
  credit_type credit_type NOT NULL,
  origin credit_origin NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  remaining_amount NUMERIC(15,2) NOT NULL CHECK (remaining_amount >= 0),

  -- Discount range
  min_discount NUMERIC(5,2) NOT NULL CHECK (min_discount >= 0 AND min_discount <= 100),
  max_discount NUMERIC(5,2) NOT NULL CHECK (max_discount >= 0 AND max_discount <= 100),

  -- e-CredAc
  e_credac_protocol VARCHAR(30),
  homologation_status homologation_status NOT NULL DEFAULT 'pendente',
  homologation_date DATE,

  -- Status and dates
  status listing_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  expires_at DATE,

  -- Notes
  description TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_discount_range CHECK (min_discount <= max_discount),
  CONSTRAINT chk_remaining CHECK (remaining_amount <= amount)
);

CREATE INDEX idx_listings_company ON credit_listings(company_id);
CREATE INDEX idx_listings_status ON credit_listings(status);
CREATE INDEX idx_listings_type ON credit_listings(credit_type);
CREATE INDEX idx_listings_amount ON credit_listings(amount);
CREATE INDEX idx_listings_active ON credit_listings(status, homologation_status) WHERE status = 'active';

-- ============================================================
-- TABLE: credit_requests (demandas de credito — cessionarios)
-- ============================================================

CREATE TABLE credit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Demand details
  amount_needed NUMERIC(15,2) NOT NULL CHECK (amount_needed > 0),
  remaining_needed NUMERIC(15,2) NOT NULL CHECK (remaining_needed >= 0),
  max_discount_accepted NUMERIC(5,2) NOT NULL CHECK (max_discount_accepted >= 0 AND max_discount_accepted <= 100),

  -- Urgency
  urgency request_urgency NOT NULL DEFAULT 'medium',
  icms_due_date DATE,

  -- Preferred credit types (NULL = any)
  preferred_credit_types credit_type[],
  preferred_origins credit_origin[],

  -- Status
  status request_status NOT NULL DEFAULT 'active',

  -- Notes
  description TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_remaining_needed CHECK (remaining_needed <= amount_needed)
);

CREATE INDEX idx_requests_company ON credit_requests(company_id);
CREATE INDEX idx_requests_status ON credit_requests(status);
CREATE INDEX idx_requests_urgency ON credit_requests(urgency);
CREATE INDEX idx_requests_active ON credit_requests(status) WHERE status = 'active';

-- ============================================================
-- TABLE: matches (matches automaticos)
-- ============================================================

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  listing_id UUID NOT NULL REFERENCES credit_listings(id),
  request_id UUID NOT NULL REFERENCES credit_requests(id),
  seller_company_id UUID NOT NULL REFERENCES companies(id),
  buyer_company_id UUID NOT NULL REFERENCES companies(id),

  -- Match details
  matched_amount NUMERIC(15,2) NOT NULL CHECK (matched_amount > 0),
  agreed_discount NUMERIC(5,2) NOT NULL CHECK (agreed_discount >= 0 AND agreed_discount <= 100),
  platform_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 2.00,

  -- Computed values (stored for performance)
  total_payment NUMERIC(15,2) GENERATED ALWAYS AS (matched_amount * (1 - agreed_discount / 100)) STORED,
  platform_fee NUMERIC(15,2) GENERATED ALWAYS AS (matched_amount * (1 - agreed_discount / 100) * platform_fee_pct / 100) STORED,
  net_to_seller NUMERIC(15,2) GENERATED ALWAYS AS (matched_amount * (1 - agreed_discount / 100) * (1 - platform_fee_pct / 100)) STORED,

  -- Matching algorithm metadata
  match_score NUMERIC(5,2), -- 0-100 compatibility score
  match_algorithm_version VARCHAR(10) DEFAULT 'v1',

  -- Status
  status match_status NOT NULL DEFAULT 'proposed',
  seller_accepted_at TIMESTAMPTZ,
  buyer_accepted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_matches_listing ON matches(listing_id);
CREATE INDEX idx_matches_request ON matches(request_id);
CREATE INDEX idx_matches_seller ON matches(seller_company_id);
CREATE INDEX idx_matches_buyer ON matches(buyer_company_id);
CREATE INDEX idx_matches_status ON matches(status);

-- ============================================================
-- TABLE: transactions
-- ============================================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  match_id UUID NOT NULL REFERENCES matches(id),
  seller_company_id UUID NOT NULL REFERENCES companies(id),
  buyer_company_id UUID NOT NULL REFERENCES companies(id),

  -- Amounts
  credit_amount NUMERIC(15,2) NOT NULL,
  discount_applied NUMERIC(5,2) NOT NULL,
  total_payment NUMERIC(15,2) NOT NULL,
  platform_fee NUMERIC(15,2) NOT NULL,
  net_to_seller NUMERIC(15,2) NOT NULL,

  -- Payment
  payment_method payment_method,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_confirmed_at TIMESTAMPTZ,
  payment_reference VARCHAR(100), -- PIX/TED ref

  -- Tax transfer
  nfe_key VARCHAR(44), -- 44-digit NF-e access key
  nfe_cfop VARCHAR(10), -- CFOP 5.601 or 5.602
  nfe_issued_at TIMESTAMPTZ,
  e_credac_transfer_protocol VARCHAR(30),
  transfer_confirmed_at TIMESTAMPTZ,

  -- Contract
  contract_clicksign_key VARCHAR(100),
  contract_signed_at TIMESTAMPTZ,
  contract_url TEXT,

  -- Status
  status transaction_status NOT NULL DEFAULT 'pending_payment',
  completed_at TIMESTAMPTZ,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_match ON transactions(match_id);
CREATE INDEX idx_transactions_seller ON transactions(seller_company_id);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_company_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_payment ON transactions(payment_status);

-- ============================================================
-- TABLE: documents
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),

  type document_type NOT NULL,
  name VARCHAR(255) NOT NULL,

  -- Signing
  clicksign_key VARCHAR(100),
  signed BOOLEAN NOT NULL DEFAULT FALSE,
  signed_at TIMESTAMPTZ,
  signers JSONB DEFAULT '[]',

  -- Storage
  storage_path TEXT,
  file_size INTEGER,
  mime_type VARCHAR(100),

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_transaction ON documents(transaction_id);
CREATE INDEX idx_documents_company ON documents(company_id);

-- ============================================================
-- TABLE: audit_log (LGPD compliance)
-- ============================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES companies(id),

  action audit_action NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'company', 'listing', 'transaction', etc.
  entity_id UUID,

  -- Details
  description TEXT,
  changes JSONB, -- { before: {...}, after: {...} }

  -- Request context
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_company ON audit_log(company_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ============================================================
-- TABLE: notifications
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL, -- 'match_found', 'match_confirmed', 'payment_received', etc.
  title VARCHAR(200) NOT NULL,
  body TEXT,

  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Reference
  reference_type VARCHAR(50),
  reference_id UUID,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_company ON notifications(company_id);
CREATE INDEX idx_notifications_unread ON notifications(company_id, read) WHERE read = FALSE;

-- ============================================================
-- TABLE: platform_settings
-- ============================================================

CREATE TABLE platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Default settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('default_fee_pct', '2.00', 'Taxa de comissao padrao da plataforma (%)'),
  ('max_discount_pct', '25.00', 'Desconto maximo permitido (%)'),
  ('match_frequency', '"hourly"', 'Frequencia de execucao do matching automatico'),
  ('match_auto_enabled', 'true', 'Matching automatico habilitado'),
  ('match_expiry_hours', '72', 'Horas ate um match proposto expirar'),
  ('min_listing_amount', '10000.00', 'Valor minimo de uma oferta de credito (R$)'),
  ('min_request_amount', '10000.00', 'Valor minimo de uma demanda de credito (R$)');

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_listings_updated BEFORE UPDATE ON credit_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_requests_updated BEFORE UPDATE ON credit_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_matches_updated BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- MATCHING ENGINE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION run_matching_engine()
RETURNS TABLE (
  match_id UUID,
  listing_id UUID,
  request_id UUID,
  matched_amount NUMERIC,
  agreed_discount NUMERIC,
  match_score NUMERIC
) AS $$
DECLARE
  req RECORD;
  listing RECORD;
  calc_amount NUMERIC;
  calc_discount NUMERIC;
  calc_score NUMERIC;
  fee_pct NUMERIC;
BEGIN
  -- Get platform fee
  SELECT (value::TEXT)::NUMERIC INTO fee_pct FROM platform_settings WHERE key = 'default_fee_pct';
  IF fee_pct IS NULL THEN fee_pct := 2.00; END IF;

  -- Iterate active requests ordered by urgency
  FOR req IN
    SELECT cr.*, c.sefaz_status as buyer_sefaz
    FROM credit_requests cr
    JOIN companies c ON c.id = cr.company_id
    WHERE cr.status = 'active'
      AND cr.remaining_needed > 0
      AND c.sefaz_status = 'regular'
      AND c.verified = TRUE
    ORDER BY
      CASE cr.urgency WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
      cr.icms_due_date ASC NULLS LAST
  LOOP
    -- Find best compatible listing
    FOR listing IN
      SELECT cl.*, c.sefaz_status as seller_sefaz
      FROM credit_listings cl
      JOIN companies c ON c.id = cl.company_id
      WHERE cl.status = 'active'
        AND cl.homologation_status = 'homologado'
        AND cl.remaining_amount > 0
        AND cl.min_discount <= req.max_discount_accepted
        AND c.sefaz_status = 'regular'
        AND c.verified = TRUE
        AND cl.company_id != req.company_id -- Can't match with yourself
        -- Check no existing active match
        AND NOT EXISTS (
          SELECT 1 FROM matches m
          WHERE m.listing_id = cl.id AND m.request_id = req.id
          AND m.status NOT IN ('cancelled', 'expired')
        )
      ORDER BY
        cl.min_discount ASC, -- Prefer lower discount (better for buyer)
        cl.remaining_amount DESC -- Prefer larger amounts
      LIMIT 1
    LOOP
      -- Calculate match
      calc_amount := LEAST(listing.remaining_amount, req.remaining_needed);
      calc_discount := ROUND((listing.min_discount + req.max_discount_accepted) / 2, 2);

      -- Score: based on amount coverage + discount attractiveness + urgency
      calc_score := ROUND(
        (calc_amount / req.remaining_needed * 40) +
        ((req.max_discount_accepted - calc_discount) / GREATEST(req.max_discount_accepted, 1) * 30) +
        (CASE req.urgency WHEN 'high' THEN 30 WHEN 'medium' THEN 20 WHEN 'low' THEN 10 END),
        2
      );

      -- Insert match
      INSERT INTO matches (
        listing_id, request_id, seller_company_id, buyer_company_id,
        matched_amount, agreed_discount, platform_fee_pct, match_score
      ) VALUES (
        listing.id, req.id, listing.company_id, req.company_id,
        calc_amount, calc_discount, fee_pct, calc_score
      )
      RETURNING matches.id INTO match_id;

      -- Return result
      listing_id := listing.id;
      request_id := req.id;
      matched_amount := calc_amount;
      agreed_discount := calc_discount;
      match_score := calc_score;
      RETURN NEXT;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Companies: users can see all verified companies, edit only their own
CREATE POLICY companies_select ON companies FOR SELECT
  USING (verified = TRUE OR auth_user_id = auth.uid());

CREATE POLICY companies_insert ON companies FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY companies_update ON companies FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Listings: visible to all authenticated, editable by owner
CREATE POLICY listings_select ON credit_listings FOR SELECT
  USING (
    status = 'active' OR
    company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
  );

CREATE POLICY listings_insert ON credit_listings FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));

CREATE POLICY listings_update ON credit_listings FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));

-- Requests: visible to all authenticated, editable by owner
CREATE POLICY requests_select ON credit_requests FOR SELECT
  USING (
    status = 'active' OR
    company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
  );

CREATE POLICY requests_insert ON credit_requests FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));

CREATE POLICY requests_update ON credit_requests FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));

-- Matches: visible to involved parties
CREATE POLICY matches_select ON matches FOR SELECT
  USING (
    seller_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()) OR
    buyer_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
  );

-- Transactions: visible to involved parties
CREATE POLICY transactions_select ON transactions FOR SELECT
  USING (
    seller_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()) OR
    buyer_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
  );

-- Documents: visible to involved parties
CREATE POLICY documents_select ON documents FOR SELECT
  USING (
    company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()) OR
    transaction_id IN (
      SELECT id FROM transactions WHERE
        seller_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()) OR
        buyer_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
    )
  );

-- Notifications: only own
CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));

CREATE POLICY notifications_update ON notifications FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));

-- Audit log: only own
CREATE POLICY audit_select ON audit_log FOR SELECT
  USING (
    user_id = auth.uid() OR
    company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
  );

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE credit_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE credit_requests;
