import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// TEMPORARY: Run migration 006 — REMOVE after use
export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const results: any[] = []

  // Break migration into sequential statements
  const statements = [
    // ENUMS
    `CREATE TYPE IF NOT EXISTS user_role AS ENUM ('titular', 'representante', 'procurador')`,
    `CREATE TYPE IF NOT EXISTS procurador_status AS ENUM ('pending', 'active', 'suspended', 'inactive')`,
    `CREATE TYPE IF NOT EXISTS procurador_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond')`,
    `CREATE TYPE IF NOT EXISTS commission_status AS ENUM ('pending', 'earned', 'processing', 'paid', 'cancelled')`,

    // user_profiles
    `CREATE TABLE IF NOT EXISTS user_profiles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name VARCHAR(200) NOT NULL,
      cpf VARCHAR(14),
      phone VARCHAR(20),
      email VARCHAR(254) NOT NULL,
      role user_role NOT NULL DEFAULT 'titular',
      avatar_url TEXT,
      referral_code VARCHAR(20) UNIQUE,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,

    // company_members
    `CREATE TABLE IF NOT EXISTS company_members (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      role user_role NOT NULL,
      can_list_credits BOOLEAN NOT NULL DEFAULT FALSE,
      can_request_credits BOOLEAN NOT NULL DEFAULT FALSE,
      can_approve_matches BOOLEAN NOT NULL DEFAULT FALSE,
      can_sign_contracts BOOLEAN NOT NULL DEFAULT FALSE,
      can_view_financials BOOLEAN NOT NULL DEFAULT FALSE,
      can_manage_team BOOLEAN NOT NULL DEFAULT FALSE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      invited_by UUID REFERENCES user_profiles(id),
      accepted_at TIMESTAMPTZ,
      power_of_attorney_url TEXT,
      power_of_attorney_valid_until DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(company_id, user_profile_id)
    )`,

    // procurador_profiles
    `CREATE TABLE IF NOT EXISTS procurador_profiles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_profile_id UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
      office_name VARCHAR(200) NOT NULL,
      office_cnpj VARCHAR(18),
      office_crc VARCHAR(20),
      office_oab VARCHAR(20),
      specialty VARCHAR(100),
      status procurador_status NOT NULL DEFAULT 'pending',
      tier procurador_tier NOT NULL DEFAULT 'bronze',
      approved_at TIMESTAMPTZ,
      approved_by UUID,
      custom_commission_pct NUMERIC(5,2),
      total_companies INTEGER NOT NULL DEFAULT 0,
      total_volume_intermediated NUMERIC(15,2) NOT NULL DEFAULT 0,
      total_commissions_earned NUMERIC(15,2) NOT NULL DEFAULT 0,
      total_commissions_paid NUMERIC(15,2) NOT NULL DEFAULT 0,
      current_month_volume NUMERIC(15,2) NOT NULL DEFAULT 0,
      bank_name VARCHAR(100),
      bank_agency VARCHAR(10),
      bank_account VARCHAR(20),
      bank_account_type VARCHAR(20),
      pix_key VARCHAR(100),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,

    // referral_invites
    `CREATE TABLE IF NOT EXISTS referral_invites (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      procurador_id UUID NOT NULL REFERENCES procurador_profiles(id) ON DELETE CASCADE,
      invited_email VARCHAR(254),
      invited_cnpj VARCHAR(18),
      invited_company_name VARCHAR(300),
      referral_code VARCHAR(20) NOT NULL,
      invite_url TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      accepted_at TIMESTAMPTZ,
      accepted_by UUID REFERENCES user_profiles(id),
      company_id UUID REFERENCES companies(id),
      expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,

    // commissions
    `CREATE TABLE IF NOT EXISTS commissions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      procurador_id UUID NOT NULL REFERENCES procurador_profiles(id) ON DELETE CASCADE,
      transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
      company_id UUID NOT NULL REFERENCES companies(id),
      transaction_value NUMERIC(15,2) NOT NULL,
      commission_pct NUMERIC(5,2) NOT NULL,
      commission_value NUMERIC(15,2) NOT NULL,
      commission_type VARCHAR(30) NOT NULL DEFAULT 'transaction',
      status commission_status NOT NULL DEFAULT 'pending',
      paid_at TIMESTAMPTZ,
      payment_reference VARCHAR(100),
      reference_month DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,

    // commission_tiers
    `CREATE TABLE IF NOT EXISTS commission_tiers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tier procurador_tier NOT NULL UNIQUE,
      min_monthly_volume NUMERIC(15,2) NOT NULL,
      max_monthly_volume NUMERIC(15,2),
      commission_pct NUMERIC(5,2) NOT NULL,
      activation_bonus NUMERIC(10,2) NOT NULL DEFAULT 0,
      benefits JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,

    // Insert tier data
    `INSERT INTO commission_tiers (tier, min_monthly_volume, max_monthly_volume, commission_pct, activation_bonus, benefits) VALUES
      ('bronze',   0,          500000,    0.50, 200,  '{"priority_support": false, "dedicated_manager": false, "api_access": false}'),
      ('silver',   500000.01,  2000000,   0.80, 350,  '{"priority_support": true, "dedicated_manager": false, "api_access": false}'),
      ('gold',     2000000.01, 10000000,  1.00, 500,  '{"priority_support": true, "dedicated_manager": true, "api_access": false}'),
      ('platinum', 10000000.01,50000000,  1.20, 750,  '{"priority_support": true, "dedicated_manager": true, "api_access": true}'),
      ('diamond',  50000000.01,NULL,      1.50, 1000, '{"priority_support": true, "dedicated_manager": true, "api_access": true}')
    ON CONFLICT (tier) DO NOTHING`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_user_profiles_auth ON user_profiles(auth_user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role)`,
    `CREATE INDEX IF NOT EXISTS idx_user_profiles_referral ON user_profiles(referral_code) WHERE referral_code IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_company_members_company ON company_members(company_id)`,
    `CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_profile_id)`,
    `CREATE INDEX IF NOT EXISTS idx_procurador_profiles_status ON procurador_profiles(status)`,
    `CREATE INDEX IF NOT EXISTS idx_referral_invites_procurador ON referral_invites(procurador_id)`,
    `CREATE INDEX IF NOT EXISTS idx_referral_invites_code ON referral_invites(referral_code)`,
    `CREATE INDEX IF NOT EXISTS idx_commissions_procurador ON commissions(procurador_id)`,
    `CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status)`,
    `CREATE INDEX IF NOT EXISTS idx_commissions_month ON commissions(reference_month)`,

    // RLS
    `ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE company_members ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE procurador_profiles ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE referral_invites ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE commissions ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE commission_tiers ENABLE ROW LEVEL SECURITY`,

    // RLS Policies
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_profiles_select') THEN
        CREATE POLICY user_profiles_select ON user_profiles FOR SELECT USING (auth_user_id = auth.uid());
      END IF;
    END $$`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_profiles_update') THEN
        CREATE POLICY user_profiles_update ON user_profiles FOR UPDATE USING (auth_user_id = auth.uid());
      END IF;
    END $$`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'commission_tiers_select') THEN
        CREATE POLICY commission_tiers_select ON commission_tiers FOR SELECT USING (TRUE);
      END IF;
    END $$`,

    // Referral code generator function
    `CREATE OR REPLACE FUNCTION generate_referral_code()
    RETURNS VARCHAR(20) AS $$
    DECLARE code VARCHAR(20); exists_count INTEGER;
    BEGIN
      LOOP
        code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
        SELECT COUNT(*) INTO exists_count FROM user_profiles WHERE referral_code = code;
        IF exists_count = 0 THEN RETURN code; END IF;
      END LOOP;
    END;
    $$ LANGUAGE plpgsql`,

    // Auto-generate referral code trigger
    `CREATE OR REPLACE FUNCTION auto_generate_referral_code()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.role = 'procurador' AND NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql`,

    `DROP TRIGGER IF EXISTS trg_auto_referral_code ON user_profiles`,
    `CREATE TRIGGER trg_auto_referral_code BEFORE INSERT ON user_profiles FOR EACH ROW EXECUTE FUNCTION auto_generate_referral_code()`,
  ]

  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i]
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // Try direct approach via postgrest
      results.push({ index: i, status: 'error', message: error.message, sql: sql.substring(0, 80) })
    } else {
      results.push({ index: i, status: 'ok' })
    }
  }

  return NextResponse.json({ total: statements.length, results })
}
