-- ============================================================
-- Migration 010: Camada de Compliance — KYC, PLD/AML, Termos
-- ============================================================
-- Cobre:
--   1. KYC (Know Your Customer) — perfis e documentos
--   2. PLD (Prevenção à Lavagem de Dinheiro) — alertas automáticos
--   3. Aceites de Termos de Uso / Política de Privacidade
--   4. Extensão do audit_log para eventos de compliance
-- ============================================================

-- =====================
-- 1. ENUMS
-- =====================

CREATE TYPE kyc_status AS ENUM (
  'pendente',           -- Cadastro iniciado, documentos não enviados
  'em_analise',         -- Documentos enviados, aguardando revisão
  'aprovado',           -- KYC validado
  'reprovado',          -- KYC negado (pode reenviar)
  'expirado'            -- Venceu prazo de validade (recadastramento)
);

CREATE TYPE kyc_doc_type AS ENUM (
  'contrato_social',
  'cartao_cnpj',
  'procuracao',
  'comprovante_endereco',
  'certidao_negativa_federal',
  'certidao_negativa_estadual',
  'certidao_negativa_municipal',
  'balanco_patrimonial',
  'dre',
  'cnd_fgts',
  'cnd_trabalhista',
  'inscricao_estadual',
  'documento_identidade_socio',
  'selfie_socio',
  'outro'
);

CREATE TYPE kyc_doc_status AS ENUM (
  'enviado',
  'aprovado',
  'reprovado',
  'expirado'
);

CREATE TYPE pld_alert_severity AS ENUM (
  'baixo',
  'medio',
  'alto',
  'critico'
);

CREATE TYPE pld_alert_status AS ENUM (
  'aberto',
  'em_analise',
  'resolvido',
  'falso_positivo',
  'escalado'
);

CREATE TYPE termo_tipo AS ENUM (
  'termos_uso',
  'politica_privacidade',
  'termo_intermediacao',
  'termo_risco',
  'lgpd_consentimento'
);

-- =====================
-- 2. KYC PROFILES
-- =====================

CREATE TABLE kyc_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  status kyc_status NOT NULL DEFAULT 'pendente',

  -- Dados coletados no cadastro
  razao_social TEXT,
  cnpj TEXT,
  inscricao_estadual TEXT,
  endereco_completo TEXT,
  cep TEXT,
  cidade TEXT,
  uf CHAR(2),

  -- Sócios / representante legal
  nome_representante TEXT,
  cpf_representante TEXT,
  cargo_representante TEXT,

  -- Faturamento declarado (para PLD)
  faturamento_anual_declarado NUMERIC(18,2),
  setor_atividade TEXT,
  cnae_principal TEXT,

  -- Pessoa politicamente exposta
  pep BOOLEAN DEFAULT FALSE,
  pep_descricao TEXT,

  -- Controle de revisão
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Validade do KYC (recadastramento)
  expires_at TIMESTAMPTZ,

  -- Score de risco interno (0-100, quanto maior = mais risco)
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(company_id)
);

-- Trigger updated_at
CREATE TRIGGER set_kyc_profiles_updated_at
  BEFORE UPDATE ON kyc_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- 3. KYC DOCUMENTS
-- =====================

CREATE TABLE kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_profile_id UUID NOT NULL REFERENCES kyc_profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  doc_type kyc_doc_type NOT NULL,
  status kyc_doc_status NOT NULL DEFAULT 'enviado',

  -- Arquivo
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,   -- Path no Supabase Storage
  file_size INTEGER,         -- bytes
  mime_type TEXT,

  -- Validade do documento
  emitido_em DATE,
  validade DATE,

  -- Revisão
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Metadados extras (ex: número do documento)
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kyc_documents_profile ON kyc_documents(kyc_profile_id);
CREATE INDEX idx_kyc_documents_company ON kyc_documents(company_id);
CREATE INDEX idx_kyc_documents_status ON kyc_documents(status);

CREATE TRIGGER set_kyc_documents_updated_at
  BEFORE UPDATE ON kyc_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- 4. PLD ALERTS
-- =====================

CREATE TABLE pld_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  transaction_id UUID REFERENCES transactions(id),

  -- Classificação
  alert_type TEXT NOT NULL,  -- ex: 'volume_anomalo', 'cnpj_restritivo', 'desagio_suspeito', 'pep_envolvido', 'operacao_fracionada'
  severity pld_alert_severity NOT NULL DEFAULT 'medio',
  status pld_alert_status NOT NULL DEFAULT 'aberto',

  -- Descrição
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Dados que geraram o alerta
  trigger_data JSONB DEFAULT '{}',

  -- Resolução
  resolved_by UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Escalação
  escalated_to TEXT,  -- ex: COAF, compliance externo
  escalated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pld_alerts_company ON pld_alerts(company_id);
CREATE INDEX idx_pld_alerts_transaction ON pld_alerts(transaction_id);
CREATE INDEX idx_pld_alerts_status ON pld_alerts(status);
CREATE INDEX idx_pld_alerts_severity ON pld_alerts(severity);
CREATE INDEX idx_pld_alerts_type ON pld_alerts(alert_type);

CREATE TRIGGER set_pld_alerts_updated_at
  BEFORE UPDATE ON pld_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- 5. ACEITES DE TERMOS
-- =====================

CREATE TABLE aceites_termos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),

  tipo termo_tipo NOT NULL,
  versao TEXT NOT NULL,            -- ex: '1.0', '2.0'

  -- Registro do aceite
  aceito_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,

  -- Hash do documento aceito (para prova de integridade)
  document_hash TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aceites_user ON aceites_termos(user_id);
CREATE INDEX idx_aceites_company ON aceites_termos(company_id);
CREATE INDEX idx_aceites_tipo_versao ON aceites_termos(tipo, versao);

-- =====================
-- 6. TERMOS VIGENTES (config)
-- =====================

CREATE TABLE termos_vigentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo termo_tipo NOT NULL,
  versao TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,       -- Markdown do documento
  obrigatorio BOOLEAN DEFAULT TRUE,
  ativo BOOLEAN DEFAULT TRUE,
  publicado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tipo, versao)
);

-- =====================
-- 7. RLS POLICIES
-- =====================

ALTER TABLE kyc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pld_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE aceites_termos ENABLE ROW LEVEL SECURITY;
ALTER TABLE termos_vigentes ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- KYC Profiles: empresa vê o próprio, admin vê todos
CREATE POLICY "kyc_profiles_own_company" ON kyc_profiles
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_profile_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "kyc_profiles_insert_own" ON kyc_profiles
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_profile_id = auth.uid()
    )
  );

CREATE POLICY "kyc_profiles_update_own_or_admin" ON kyc_profiles
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_profile_id = auth.uid()
    )
    OR is_admin()
  );

-- KYC Documents: empresa vê os próprios, admin vê todos
CREATE POLICY "kyc_documents_own_company" ON kyc_documents
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_profile_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "kyc_documents_insert_own" ON kyc_documents
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_profile_id = auth.uid()
    )
  );

CREATE POLICY "kyc_documents_update_admin" ON kyc_documents
  FOR UPDATE USING (is_admin());

-- PLD Alerts: somente admin vê
CREATE POLICY "pld_alerts_admin_only" ON pld_alerts
  FOR ALL USING (is_admin());

-- Aceites Termos: usuário vê os próprios, admin vê todos
CREATE POLICY "aceites_own" ON aceites_termos
  FOR SELECT USING (
    user_id = auth.uid() OR is_admin()
  );

CREATE POLICY "aceites_insert_own" ON aceites_termos
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Termos Vigentes: todos lêem os ativos
CREATE POLICY "termos_vigentes_read" ON termos_vigentes
  FOR SELECT USING (ativo = TRUE);

CREATE POLICY "termos_vigentes_admin_manage" ON termos_vigentes
  FOR ALL USING (is_admin());

-- =====================
-- 8. STORAGE BUCKET
-- =====================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  FALSE,
  10485760,  -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "kyc_storage_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT c.id::text FROM companies c
      INNER JOIN company_members cm ON cm.company_id = c.id
      WHERE cm.user_profile_id = auth.uid()
    )
  );

CREATE POLICY "kyc_storage_read_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'kyc-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT c.id::text FROM companies c
        INNER JOIN company_members cm ON cm.company_id = c.id
        WHERE cm.user_profile_id = auth.uid()
      )
      OR is_admin()
    )
  );

-- =====================
-- 9. PLD AUTO-TRIGGERS
-- =====================

-- Função que verifica regras PLD ao criar/atualizar transação
CREATE OR REPLACE FUNCTION check_pld_rules()
RETURNS TRIGGER AS $$
DECLARE
  _company_kyc kyc_profiles%ROWTYPE;
  _total_30d NUMERIC;
  _count_30d INTEGER;
BEGIN
  -- Regra 1: Volume anômalo (transação > R$ 500.000)
  IF NEW.credit_value > 500000 THEN
    INSERT INTO pld_alerts (company_id, transaction_id, alert_type, severity, title, description, trigger_data)
    VALUES (
      COALESCE(NEW.seller_id, NEW.buyer_id),
      NEW.id,
      'volume_anomalo',
      'alto',
      'Transação de alto valor detectada',
      'Transação com valor de R$ ' || TO_CHAR(NEW.credit_value, 'FM999G999G999D00') || ' excede o limite de R$ 500.000',
      jsonb_build_object('credit_value', NEW.credit_value, 'transaction_id', NEW.id)
    );
  END IF;

  -- Regra 2: Deságio suspeito (> 40%)
  IF NEW.discount_percentage IS NOT NULL AND NEW.discount_percentage > 40 THEN
    INSERT INTO pld_alerts (company_id, transaction_id, alert_type, severity, title, description, trigger_data)
    VALUES (
      COALESCE(NEW.seller_id, NEW.buyer_id),
      NEW.id,
      'desagio_suspeito',
      'medio',
      'Deságio acima do normal',
      'Deságio de ' || NEW.discount_percentage || '% está muito acima da média de mercado (15-25%)',
      jsonb_build_object('discount_percentage', NEW.discount_percentage, 'transaction_id', NEW.id)
    );
  END IF;

  -- Regra 3: Frequência alta (> 10 transações em 30 dias para mesma empresa)
  SELECT COUNT(*), COALESCE(SUM(credit_value), 0)
  INTO _count_30d, _total_30d
  FROM transactions
  WHERE (seller_id = NEW.seller_id OR buyer_id = NEW.buyer_id)
    AND created_at > NOW() - INTERVAL '30 days'
    AND id != NEW.id;

  IF _count_30d > 10 THEN
    INSERT INTO pld_alerts (company_id, transaction_id, alert_type, severity, title, description, trigger_data)
    VALUES (
      COALESCE(NEW.seller_id, NEW.buyer_id),
      NEW.id,
      'operacao_fracionada',
      'alto',
      'Possível fracionamento de operações',
      'Empresa tem ' || _count_30d || ' transações nos últimos 30 dias (total R$ ' || TO_CHAR(_total_30d, 'FM999G999G999D00') || ')',
      jsonb_build_object('count_30d', _count_30d, 'total_30d', _total_30d)
    );
  END IF;

  -- Regra 4: PEP envolvido
  SELECT * INTO _company_kyc FROM kyc_profiles
  WHERE company_id = COALESCE(NEW.seller_id, NEW.buyer_id)
  LIMIT 1;

  IF _company_kyc.pep = TRUE THEN
    INSERT INTO pld_alerts (company_id, transaction_id, alert_type, severity, title, description, trigger_data)
    VALUES (
      COALESCE(NEW.seller_id, NEW.buyer_id),
      NEW.id,
      'pep_envolvido',
      'alto',
      'Pessoa Politicamente Exposta envolvida',
      'Empresa com PEP declarado: ' || COALESCE(_company_kyc.pep_descricao, 'sem detalhes'),
      jsonb_build_object('pep_descricao', _company_kyc.pep_descricao, 'company_id', _company_kyc.company_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger na tabela transactions
CREATE TRIGGER trg_pld_check
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION check_pld_rules();

-- =====================
-- 10. VIEWS ÚTEIS
-- =====================

-- View: resumo KYC por empresa
CREATE OR REPLACE VIEW vw_kyc_resumo AS
SELECT
  k.id,
  k.company_id,
  c.legal_name,
  c.cnpj,
  k.status,
  k.risk_score,
  k.pep,
  k.expires_at,
  k.reviewed_at,
  k.created_at,
  (SELECT COUNT(*) FROM kyc_documents d WHERE d.kyc_profile_id = k.id) as total_docs,
  (SELECT COUNT(*) FROM kyc_documents d WHERE d.kyc_profile_id = k.id AND d.status = 'aprovado') as docs_aprovados,
  (SELECT COUNT(*) FROM kyc_documents d WHERE d.kyc_profile_id = k.id AND d.status = 'reprovado') as docs_reprovados,
  (SELECT COUNT(*) FROM kyc_documents d WHERE d.kyc_profile_id = k.id AND d.status = 'enviado') as docs_pendentes
FROM kyc_profiles k
JOIN companies c ON c.id = k.company_id;

-- View: alertas PLD abertos
CREATE OR REPLACE VIEW vw_pld_alerts_abertos AS
SELECT
  a.*,
  c.legal_name as company_name,
  c.cnpj as company_cnpj,
  t.credit_value as transaction_value
FROM pld_alerts a
LEFT JOIN companies c ON c.id = a.company_id
LEFT JOIN transactions t ON t.id = a.transaction_id
WHERE a.status IN ('aberto', 'em_analise')
ORDER BY
  CASE a.severity
    WHEN 'critico' THEN 1
    WHEN 'alto' THEN 2
    WHEN 'medio' THEN 3
    WHEN 'baixo' THEN 4
  END,
  a.created_at DESC;

-- =====================
-- 11. SEED: TERMOS VIGENTES (v1.0)
-- =====================

INSERT INTO termos_vigentes (tipo, versao, titulo, conteudo, obrigatorio) VALUES
(
  'termos_uso',
  '1.0',
  'Termos de Uso — E-CREDac',
  E'# Termos de Uso — Plataforma E-CREDac\n\n**Versão 1.0 — Vigência: Abril de 2026**\n\n## 1. Objeto\n\nA plataforma E-CREDac é um ambiente digital de intermediação de créditos acumulados de ICMS, operando como marketplace que conecta cedentes (vendedores de crédito) e cessionários (compradores de crédito), com acompanhamento de representantes credenciados.\n\n## 2. Natureza do Serviço\n\nA E-CREDac **não é** uma instituição financeira, corretora de valores ou consultoria tributária. A plataforma atua exclusivamente como intermediadora tecnológica, facilitando a conexão entre partes interessadas na transferência de créditos de ICMS nos termos da legislação estadual aplicável.\n\n## 3. Cadastro e KYC\n\nO uso da plataforma está condicionado ao preenchimento completo do cadastro (Know Your Customer), incluindo envio de documentação societária, comprovações fiscais e declarações de conformidade. A E-CREDac reserva-se o direito de recusar ou suspender cadastros que não atendam aos critérios de compliance.\n\n## 4. Responsabilidade sobre Créditos\n\nA E-CREDac **não garante** a homologação, validade ou liquidez dos créditos de ICMS anunciados. Os scores e indicadores exibidos na plataforma são estimativas baseadas em dados públicos e declarados, podendo divergir da avaliação oficial da SEFAZ.\n\n## 5. Intermediação e Taxas\n\nA plataforma cobra uma taxa de intermediação sobre transações concluídas, conforme tabela vigente. A taxa é devida somente após a conclusão efetiva da transferência do crédito junto à SEFAZ.\n\n## 6. PLD/AML\n\nTodas as transações são monitoradas por sistema automático de Prevenção à Lavagem de Dinheiro. A E-CREDac pode, a seu critério, suspender operações, solicitar documentação adicional ou reportar atividades suspeitas às autoridades competentes (COAF).\n\n## 7. Limitação de Responsabilidade\n\nA E-CREDac não se responsabiliza por: (a) decisões de investimento tomadas com base em informações da plataforma; (b) atrasos ou negativas de homologação pela SEFAZ; (c) inadimplência entre as partes; (d) danos indiretos ou consequenciais.\n\n## 8. Alterações\n\nEstes termos podem ser atualizados a qualquer momento, mediante notificação prévia de 30 dias. O uso continuado da plataforma após a notificação implica aceitação dos novos termos.',
  TRUE
),
(
  'politica_privacidade',
  '1.0',
  'Política de Privacidade — E-CREDac',
  E'# Política de Privacidade — Plataforma E-CREDac\n\n**Versão 1.0 — Vigência: Abril de 2026**\n\n## 1. Dados Coletados\n\nColetamos: dados cadastrais (CNPJ, razão social, endereço, representantes legais), documentação KYC, dados de transações, logs de acesso e navegação, comunicações na plataforma.\n\n## 2. Finalidade\n\nOs dados são utilizados para: (a) operação e melhoria da plataforma; (b) cumprimento de obrigações legais (PLD/AML, LGPD, fiscais); (c) análise de risco e scoring; (d) comunicação sobre operações e serviços.\n\n## 3. Compartilhamento\n\nDados podem ser compartilhados com: (a) partes envolvidas em transações (dados limitados necessários à operação); (b) autoridades competentes quando exigido por lei; (c) prestadores de serviço essenciais (infraestrutura, pagamentos).\n\n## 4. Segurança\n\nAdotamos medidas técnicas e administrativas para proteger dados pessoais, incluindo criptografia em trânsito e repouso, controle de acesso baseado em função, e auditoria de acessos.\n\n## 5. Retenção\n\nDados são retidos pelo período necessário ao cumprimento das finalidades ou obrigações legais. Dados de transações e compliance são retidos por no mínimo 5 anos.\n\n## 6. Direitos do Titular (LGPD)\n\nVocê tem direito a: acesso, correção, exclusão (quando não conflitar com obrigações legais), portabilidade, e revogação de consentimento. Solicitações devem ser feitas pelo canal privacidade@ecredac.com.br.\n\n## 7. Encarregado de Dados (DPO)\n\nContato: dpo@ecredac.com.br',
  TRUE
),
(
  'termo_intermediacao',
  '1.0',
  'Termo de Ciência de Intermediação',
  E'# Termo de Ciência de Intermediação\n\n**Declaro que:**\n\n1. Estou ciente de que a E-CREDac atua exclusivamente como **intermediadora tecnológica** na transferência de créditos acumulados de ICMS.\n\n2. A E-CREDac **não garante** a homologação dos créditos pela SEFAZ, nem a conclusão das operações.\n\n3. Os scores, índices e indicadores exibidos na plataforma são **estimativas** e **não constituem** garantia de valor, liquidez ou aprovação.\n\n4. Sou responsável por minhas próprias decisões de negociação e consultei (ou tive a oportunidade de consultar) assessoria jurídica e contábil independente.\n\n5. Estou ciente das taxas de intermediação aplicáveis e concordo com a cobrança mediante transação concluída.',
  TRUE
),
(
  'termo_risco',
  '1.0',
  'Termo de Ciência de Risco',
  E'# Termo de Ciência de Risco\n\n**Declaro estar ciente dos seguintes riscos:**\n\n1. **Risco de homologação**: créditos podem não ser homologados pela SEFAZ, resultando em perda parcial ou total do valor investido.\n\n2. **Risco de liquidez**: créditos de ICMS podem ter liquidez limitada e prazos de utilização variáveis.\n\n3. **Risco regulatório**: mudanças na legislação tributária podem afetar o valor e a utilização dos créditos.\n\n4. **Risco de contraparte**: a outra parte da transação pode não cumprir suas obrigações, apesar dos mecanismos de proteção da plataforma.\n\n5. Os indicadores da plataforma (Score de Liquidez, estimativas de valor) são **ferramentas auxiliares** e **não devem** ser a única base para decisões de investimento.',
  TRUE
),
(
  'lgpd_consentimento',
  '1.0',
  'Consentimento LGPD',
  E'# Consentimento para Tratamento de Dados Pessoais (LGPD)\n\nNos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), autorizo a E-CREDac a coletar, armazenar e processar meus dados pessoais e da empresa que represento, para as finalidades descritas na Política de Privacidade, incluindo:\n\n- Verificação cadastral (KYC)\n- Análise de risco e scoring\n- Monitoramento PLD/AML\n- Comunicações sobre operações\n- Melhoria dos serviços\n\nEste consentimento pode ser revogado a qualquer momento via canal privacidade@ecredac.com.br, sem prejuízo do tratamento realizado anteriormente.',
  TRUE
);

-- =====================
-- 12. FUNÇÃO: verificar aceites pendentes
-- =====================

CREATE OR REPLACE FUNCTION get_pending_terms(p_user_id UUID)
RETURNS TABLE (
  tipo termo_tipo,
  versao TEXT,
  titulo TEXT
) AS $$
  SELECT tv.tipo, tv.versao, tv.titulo
  FROM termos_vigentes tv
  WHERE tv.ativo = TRUE
    AND tv.obrigatorio = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM aceites_termos at
      WHERE at.user_id = p_user_id
        AND at.tipo = tv.tipo
        AND at.versao = tv.versao
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
