-- ============================================================
-- E-CREDac ICMS — Migration 006: User Roles & Commission System
-- Modelo de Assessor (inspirado XP/BTG) para Procuradores
-- ============================================================

-- ============================================================
-- ENUM TYPES
-- ============================================================

-- Perfil do usuario na plataforma
CREATE TYPE user_role AS ENUM (
  'titular',        -- Proprietario/socio da empresa
  'representante',  -- Funcionario autorizado (financeiro, fiscal)
  'procurador'      -- Contador, advogado, consultor tributario (motor comercial)
);

-- Status do procurador na plataforma
CREATE TYPE procurador_status AS ENUM (
  'pending',    -- Aguardando aprovacao
  'active',     -- Ativo e operando
  'suspended',  -- Suspenso temporariamente
  'inactive'    -- Inativo
);

-- Tier do procurador (determina % de comissao)
CREATE TYPE procurador_tier AS ENUM (
  'bronze',    -- Ate R$ 500k volume/mes   → 0.5% comissao
  'silver',    -- R$ 500k - R$ 2M/mes      → 0.8%
  'gold',      -- R$ 2M - R$ 10M/mes       → 1.0%
  'platinum',  -- R$ 10M - R$ 50M/mes      → 1.2%
  'diamond'    -- Acima de R$ 50M/mes       → 1.5%
);

-- Status da comissao
CREATE TYPE commission_status AS ENUM (
  'pending',     -- Transacao em andamento
  'earned',      -- Comissao confirmada (transacao concluida)
  'processing',  -- Pagamento em processamento
  'paid',        -- Pago ao procurador
  'cancelled'    -- Cancelada (transacao cancelada)
);

-- ============================================================
-- TABLE: user_profiles
-- Perfil individual do usuario (separado da empresa)
-- Um auth.user → um user_profile
-- ============================================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dados pessoais
  full_name VARCHAR(200) NOT NULL,
  cpf VARCHAR(14),  -- Opcional para titular/representante, obrigatorio para procurador
  phone VARCHAR(20),
  email VARCHAR(254) NOT NULL,

  -- Perfil
  role user_role NOT NULL DEFAULT 'titular',
  avatar_url TEXT,

  -- Procurador-specific: referral code unico
  referral_code VARCHAR(20) UNIQUE,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: company_members
-- Vinculo N:N entre usuarios e empresas
-- Titular pode ter 1 empresa, Procurador pode ter N empresas
-- ============================================================

CREATE TABLE company_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Papel dentro da empresa
  role user_role NOT NULL,  -- titular, representante, procurador

  -- Permissoes granulares
  can_list_credits BOOLEAN NOT NULL DEFAULT FALSE,   -- Pode criar ofertas
  can_request_credits BOOLEAN NOT NULL DEFAULT FALSE, -- Pode criar demandas
  can_approve_matches BOOLEAN NOT NULL DEFAULT FALSE,  -- Pode aprovar matches
  can_sign_contracts BOOLEAN NOT NULL DEFAULT FALSE,   -- Pode assinar contratos
  can_view_financials BOOLEAN NOT NULL DEFAULT FALSE,  -- Pode ver dados financeiros
  can_manage_team BOOLEAN NOT NULL DEFAULT FALSE,      -- Pode gerenciar equipe

  -- Status do vinculo
  active BOOLEAN NOT NULL DEFAULT TRUE,
  invited_by UUID REFERENCES user_profiles(id),
  accepted_at TIMESTAMPTZ,

  -- Procurador: procuracao digital
  power_of_attorney_url TEXT,  -- URL do documento de procuracao
  power_of_attorney_valid_until DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Um usuario so pode ter um vinculo por empresa
  UNIQUE(company_id, user_profile_id)
);

-- ============================================================
-- TABLE: procurador_profiles
-- Dados especificos do Procurador/Assessor
-- ============================================================

CREATE TABLE procurador_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_profile_id UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Dados do escritorio
  office_name VARCHAR(200) NOT NULL,           -- Nome do escritorio
  office_cnpj VARCHAR(18),                      -- CNPJ do escritorio (se PJ)
  office_crc VARCHAR(20),                       -- Registro CRC (contador)
  office_oab VARCHAR(20),                       -- Registro OAB (advogado)
  specialty VARCHAR(100),                       -- Ex: "Tributario", "Contabilidade Fiscal"

  -- Status e tier
  status procurador_status NOT NULL DEFAULT 'pending',
  tier procurador_tier NOT NULL DEFAULT 'bronze',
  approved_at TIMESTAMPTZ,
  approved_by UUID,

  -- Comissao customizada (override do tier)
  custom_commission_pct NUMERIC(5,2),  -- Se NULL, usa o % do tier

  -- Metricas acumuladas (atualizadas por trigger/cron)
  total_companies INTEGER NOT NULL DEFAULT 0,
  total_volume_intermediated NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_commissions_earned NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_commissions_paid NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_month_volume NUMERIC(15,2) NOT NULL DEFAULT 0,

  -- Dados bancarios para pagamento de comissoes
  bank_name VARCHAR(100),
  bank_agency VARCHAR(10),
  bank_account VARCHAR(20),
  bank_account_type VARCHAR(20),  -- corrente, poupanca
  pix_key VARCHAR(100),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: referral_invites
-- Convites enviados por procuradores para empresas
-- ============================================================

CREATE TABLE referral_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  procurador_id UUID NOT NULL REFERENCES procurador_profiles(id) ON DELETE CASCADE,

  -- Dados do convite
  invited_email VARCHAR(254),
  invited_cnpj VARCHAR(18),
  invited_company_name VARCHAR(300),

  -- Referral tracking
  referral_code VARCHAR(20) NOT NULL,
  invite_url TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, accepted, expired, cancelled
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES user_profiles(id),
  company_id UUID REFERENCES companies(id),  -- Preenchido quando aceito

  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: commissions
-- Registro individual de cada comissao
-- ============================================================

CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Quem ganha
  procurador_id UUID NOT NULL REFERENCES procurador_profiles(id) ON DELETE CASCADE,

  -- Origem
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id),  -- Empresa que gerou a comissao

  -- Valores
  transaction_value NUMERIC(15,2) NOT NULL,        -- Valor da transacao
  commission_pct NUMERIC(5,2) NOT NULL,             -- % aplicado
  commission_value NUMERIC(15,2) NOT NULL,          -- Valor da comissao

  -- Tipo
  commission_type VARCHAR(30) NOT NULL DEFAULT 'transaction',
  -- transaction: comissao sobre transacao
  -- activation_bonus: bonus por ativar empresa nova
  -- tier_bonus: bonus por atingir novo tier

  -- Status e pagamento
  status commission_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  payment_reference VARCHAR(100),  -- Comprovante de pagamento

  -- Periodo de referencia
  reference_month DATE,  -- YYYY-MM-01

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: commission_tiers
-- Configuracao dos tiers e regras de comissao
-- ============================================================

CREATE TABLE commission_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  tier procurador_tier NOT NULL UNIQUE,

  -- Faixas de volume mensal
  min_monthly_volume NUMERIC(15,2) NOT NULL,
  max_monthly_volume NUMERIC(15,2),  -- NULL = sem limite

  -- Comissao
  commission_pct NUMERIC(5,2) NOT NULL,

  -- Bonus de ativacao (por empresa nova trazida)
  activation_bonus NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Beneficios
  benefits JSONB DEFAULT '{}',
  -- Ex: { "priority_support": true, "dedicated_manager": false, "api_access": false }

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir tiers padrao
INSERT INTO commission_tiers (tier, min_monthly_volume, max_monthly_volume, commission_pct, activation_bonus, benefits) VALUES
  ('bronze',   0,          500000,    0.50, 200,  '{"priority_support": false, "dedicated_manager": false, "api_access": false}'),
  ('silver',   500000.01,  2000000,   0.80, 350,  '{"priority_support": true, "dedicated_manager": false, "api_access": false}'),
  ('gold',     2000000.01, 10000000,  1.00, 500,  '{"priority_support": true, "dedicated_manager": true, "api_access": false}'),
  ('platinum', 10000000.01,50000000,  1.20, 750,  '{"priority_support": true, "dedicated_manager": true, "api_access": true}'),
  ('diamond',  50000000.01,NULL,      1.50, 1000, '{"priority_support": true, "dedicated_manager": true, "api_access": true}');

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_user_profiles_auth ON user_profiles(auth_user_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_referral ON user_profiles(referral_code) WHERE referral_code IS NOT NULL;

CREATE INDEX idx_company_members_company ON company_members(company_id);
CREATE INDEX idx_company_members_user ON company_members(user_profile_id);
CREATE INDEX idx_company_members_active ON company_members(company_id, active) WHERE active = TRUE;

CREATE INDEX idx_procurador_profiles_status ON procurador_profiles(status);
CREATE INDEX idx_procurador_profiles_tier ON procurador_profiles(tier);

CREATE INDEX idx_referral_invites_procurador ON referral_invites(procurador_id);
CREATE INDEX idx_referral_invites_code ON referral_invites(referral_code);
CREATE INDEX idx_referral_invites_status ON referral_invites(status) WHERE status = 'pending';

CREATE INDEX idx_commissions_procurador ON commissions(procurador_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_month ON commissions(reference_month);
CREATE INDEX idx_commissions_company ON commissions(company_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Gerar referral code unico (8 chars alfanumericos)
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  code VARCHAR(20);
  exists_count INTEGER;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    SELECT COUNT(*) INTO exists_count FROM user_profiles WHERE referral_code = code;
    IF exists_count = 0 THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Auto-gerar referral code para procuradores
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'procurador' AND NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_referral_code
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- Calcular comissao quando transacao e concluida
CREATE OR REPLACE FUNCTION calculate_commission()
RETURNS TRIGGER AS $$
DECLARE
  proc_record RECORD;
  tier_record RECORD;
  comm_pct NUMERIC(5,2);
BEGIN
  -- So calcula quando transacao muda para 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Verificar se algum procurador esta vinculado a empresa vendedora ou compradora
    FOR proc_record IN
      SELECT pp.id AS procurador_id, pp.custom_commission_pct, pp.tier,
             cm.company_id
      FROM company_members cm
      JOIN user_profiles up ON up.id = cm.user_profile_id
      JOIN procurador_profiles pp ON pp.user_profile_id = up.id
      WHERE cm.company_id IN (NEW.seller_company_id, NEW.buyer_company_id)
        AND cm.role = 'procurador'
        AND cm.active = TRUE
        AND pp.status = 'active'
    LOOP
      -- Determinar % de comissao
      IF proc_record.custom_commission_pct IS NOT NULL THEN
        comm_pct := proc_record.custom_commission_pct;
      ELSE
        SELECT commission_pct INTO comm_pct
        FROM commission_tiers
        WHERE tier = proc_record.tier;
      END IF;

      -- Criar registro de comissao
      INSERT INTO commissions (
        procurador_id, transaction_id, company_id,
        transaction_value, commission_pct, commission_value,
        commission_type, status, reference_month
      ) VALUES (
        proc_record.procurador_id, NEW.id, proc_record.company_id,
        NEW.total_value, comm_pct, NEW.total_value * (comm_pct / 100),
        'transaction', 'earned',
        date_trunc('month', NOW())::date
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_commission
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_commission();

-- Atualizar metricas do procurador quando comissao muda
CREATE OR REPLACE FUNCTION update_procurador_metrics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE procurador_profiles
  SET
    total_volume_intermediated = (
      SELECT COALESCE(SUM(transaction_value), 0)
      FROM commissions WHERE procurador_id = NEW.procurador_id AND status IN ('earned', 'processing', 'paid')
    ),
    total_commissions_earned = (
      SELECT COALESCE(SUM(commission_value), 0)
      FROM commissions WHERE procurador_id = NEW.procurador_id AND status IN ('earned', 'processing', 'paid')
    ),
    total_commissions_paid = (
      SELECT COALESCE(SUM(commission_value), 0)
      FROM commissions WHERE procurador_id = NEW.procurador_id AND status = 'paid'
    ),
    current_month_volume = (
      SELECT COALESCE(SUM(transaction_value), 0)
      FROM commissions
      WHERE procurador_id = NEW.procurador_id
        AND reference_month = date_trunc('month', NOW())::date
        AND status IN ('earned', 'processing', 'paid')
    ),
    total_companies = (
      SELECT COUNT(DISTINCT company_id)
      FROM company_members cm
      JOIN user_profiles up ON up.id = cm.user_profile_id
      JOIN procurador_profiles pp ON pp.user_profile_id = up.id
      WHERE pp.id = NEW.procurador_id AND cm.active = TRUE
    ),
    updated_at = NOW()
  WHERE id = NEW.procurador_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_procurador_metrics
  AFTER INSERT OR UPDATE ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_procurador_metrics();

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurador_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_tiers ENABLE ROW LEVEL SECURITY;

-- user_profiles: usuario ve so o seu
CREATE POLICY user_profiles_select ON user_profiles
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY user_profiles_update ON user_profiles
  FOR UPDATE USING (auth_user_id = auth.uid());

-- company_members: membros da mesma empresa podem ver uns aos outros
CREATE POLICY company_members_select ON company_members
  FOR SELECT USING (
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      JOIN user_profiles up ON up.id = cm.user_profile_id
      WHERE up.auth_user_id = auth.uid() AND cm.active = TRUE
    )
  );

-- procurador_profiles: procurador ve so o seu
CREATE POLICY procurador_profiles_select ON procurador_profiles
  FOR SELECT USING (
    user_profile_id IN (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY procurador_profiles_update ON procurador_profiles
  FOR UPDATE USING (
    user_profile_id IN (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- referral_invites: procurador ve seus convites
CREATE POLICY referral_invites_select ON referral_invites
  FOR SELECT USING (
    procurador_id IN (
      SELECT pp.id FROM procurador_profiles pp
      JOIN user_profiles up ON up.id = pp.user_profile_id
      WHERE up.auth_user_id = auth.uid()
    )
  );

-- commissions: procurador ve suas comissoes
CREATE POLICY commissions_select ON commissions
  FOR SELECT USING (
    procurador_id IN (
      SELECT pp.id FROM procurador_profiles pp
      JOIN user_profiles up ON up.id = pp.user_profile_id
      WHERE up.auth_user_id = auth.uid()
    )
  );

-- commission_tiers: todos podem ver (publico)
CREATE POLICY commission_tiers_select ON commission_tiers
  FOR SELECT USING (TRUE);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER set_updated_at_user_profiles
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_company_members
  BEFORE UPDATE ON company_members
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_procurador_profiles
  BEFORE UPDATE ON procurador_profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_referral_invites
  BEFORE UPDATE ON referral_invites
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_commissions
  BEFORE UPDATE ON commissions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
