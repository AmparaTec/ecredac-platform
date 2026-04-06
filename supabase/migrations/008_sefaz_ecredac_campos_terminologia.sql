-- ============================================================
-- Migration 008: Alinhamento com terminologia oficial SEFAZ-SP
-- Portaria SRE 65/2023 — Sistema e-CredAc
-- Aplicada em: 2026-04-05
-- ============================================================

-- 1. Novos valores para enum credit_type
ALTER TYPE credit_type ADD VALUE IF NOT EXISTS 'outorgado';

-- 2. Novos valores para enum credit_origin (hipóteses de geração)
ALTER TYPE credit_origin ADD VALUE IF NOT EXISTS 'isencao';
ALTER TYPE credit_origin ADD VALUE IF NOT EXISTS 'aliquotas_diversificadas';

-- 3. Novos valores para enum homologation_status (fluxo completo SEFAZ)
ALTER TYPE homologation_status ADD VALUE IF NOT EXISTS 'arquivo_digital_transmitido';
ALTER TYPE homologation_status ADD VALUE IF NOT EXISTS 'pre_validado';
ALTER TYPE homologation_status ADD VALUE IF NOT EXISTS 'em_fiscalizacao';
ALTER TYPE homologation_status ADD VALUE IF NOT EXISTS 'homologado_parcial';

-- 4. Novo enum: modalidade de apropriação
DO $$ BEGIN
  CREATE TYPE modalidade_apropriacao AS ENUM ('simplificado', 'custeio');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Novo enum: status da conta corrente e-CredAc
DO $$ BEGIN
  CREATE TYPE conta_corrente_status AS ENUM ('ativa', 'bloqueada', 'sem_saldo');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Novo enum: natureza da transferência (Art. 73 RICMS)
DO $$ BEGIN
  CREATE TYPE natureza_transferencia AS ENUM (
    'interdependente',
    'fornecedor_mp',
    'energia',
    'ativo_imobilizado',
    'terceiros_art84'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Adicionar novos campos à tabela credit_listings
ALTER TABLE credit_listings
  ADD COLUMN IF NOT EXISTS modalidade_apropriacao modalidade_apropriacao DEFAULT 'simplificado',
  ADD COLUMN IF NOT EXISTS conta_corrente_status conta_corrente_status DEFAULT 'ativa',
  ADD COLUMN IF NOT EXISTS visto_eletronico VARCHAR(20),
  ADD COLUMN IF NOT EXISTS valor_conta_corrente NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS desagio_percentual NUMERIC(5,2);

-- 8. Adicionar campos SEFAZ à tabela transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS natureza_transferencia natureza_transferencia,
  ADD COLUMN IF NOT EXISTS codigo_efd VARCHAR(20),
  ADD COLUMN IF NOT EXISTS visto_eletronico_transferencia VARCHAR(20),
  ADD COLUMN IF NOT EXISTS data_aceite_cessionario TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prazo_aceite_expira TIMESTAMPTZ;

-- 9. Tabela de motivos de bloqueio da conta corrente (Art. 4º)
CREATE TABLE IF NOT EXISTS bloqueios_conta_corrente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  credit_listing_id UUID REFERENCES credit_listings(id) ON DELETE SET NULL,
  motivo VARCHAR(10) NOT NULL,
  descricao TEXT NOT NULL,
  data_bloqueio TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_desbloqueio TIMESTAMPTZ,
  protocolo_sipet VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'bloqueado' CHECK (status IN ('bloqueado', 'desbloqueado', 'em_analise')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Tabela de documentos por operação
CREATE TABLE IF NOT EXISTS documentos_operacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  credit_listing_id UUID REFERENCES credit_listings(id) ON DELETE SET NULL,
  tipo_operacao VARCHAR(30) NOT NULL CHECK (tipo_operacao IN ('transferencia', 'apropriacao', 'desbloqueio')),
  nome_documento VARCHAR(200) NOT NULL,
  obrigatorio BOOLEAN NOT NULL DEFAULT true,
  arquivo_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'validado', 'rejeitado')),
  validado_por UUID REFERENCES user_profiles(id),
  validado_em TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Índices
CREATE INDEX IF NOT EXISTS idx_bloqueios_company ON bloqueios_conta_corrente(company_id);
CREATE INDEX IF NOT EXISTS idx_bloqueios_status ON bloqueios_conta_corrente(status);
CREATE INDEX IF NOT EXISTS idx_documentos_transaction ON documentos_operacao(transaction_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON documentos_operacao(tipo_operacao);
CREATE INDEX IF NOT EXISTS idx_credit_listings_modalidade ON credit_listings(modalidade_apropriacao);
CREATE INDEX IF NOT EXISTS idx_credit_listings_conta_status ON credit_listings(conta_corrente_status);
CREATE INDEX IF NOT EXISTS idx_transactions_natureza ON transactions(natureza_transferencia);

-- 12. RLS para novas tabelas
ALTER TABLE bloqueios_conta_corrente ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_operacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY bloqueios_select_own ON bloqueios_conta_corrente
  FOR SELECT USING (
    company_id IN (
      SELECT cm.company_id FROM company_members cm WHERE cm.user_profile_id = auth.uid() AND cm.active = true
    )
  );

CREATE POLICY documentos_select_own ON documentos_operacao
  FOR SELECT USING (
    transaction_id IN (
      SELECT t.id FROM transactions t
      WHERE t.buyer_company_id IN (
        SELECT cm.company_id FROM company_members cm WHERE cm.user_profile_id = auth.uid() AND cm.active = true
      )
      OR t.seller_company_id IN (
        SELECT cm.company_id FROM company_members cm WHERE cm.user_profile_id = auth.uid() AND cm.active = true
      )
    )
  );

-- 13. Triggers updated_at
CREATE TRIGGER set_bloqueios_updated_at
  BEFORE UPDATE ON bloqueios_conta_corrente
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_documentos_updated_at
  BEFORE UPDATE ON documentos_operacao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 14. Comentários
COMMENT ON COLUMN credit_listings.modalidade_apropriacao IS 'Modalidade de apropriação SEFAZ: simplificado (até 10.000 UFESPs/mês) ou custeio (sem limite)';
COMMENT ON COLUMN credit_listings.conta_corrente_status IS 'Status da conta corrente e-CredAc na SEFAZ';
COMMENT ON COLUMN credit_listings.visto_eletronico IS 'Número do visto eletrônico (12 dígitos) emitido pelo e-CredAc';
COMMENT ON COLUMN credit_listings.valor_conta_corrente IS 'Saldo em conta corrente e-CredAc em R$';
COMMENT ON COLUMN credit_listings.desagio_percentual IS 'Percentual de deságio oferecido pelo cedente';
COMMENT ON COLUMN transactions.natureza_transferencia IS 'Natureza da transferência conforme Art. 73 RICMS-SP';
COMMENT ON COLUMN transactions.codigo_efd IS 'Código de escrituração EFD (ex: SP000221, SP020740)';
COMMENT ON COLUMN transactions.visto_eletronico_transferencia IS 'Visto eletrônico da transferência no e-CredAc';
COMMENT ON COLUMN transactions.data_aceite_cessionario IS 'Data do aceite pelo cessionário no e-CredAc';
COMMENT ON COLUMN transactions.prazo_aceite_expira IS 'Prazo de 10 dias para aceite do cessionário';
COMMENT ON TABLE bloqueios_conta_corrente IS 'Registro de bloqueios da conta corrente e-CredAc (Art. 4º Portaria SRE 65/2023)';
COMMENT ON TABLE documentos_operacao IS 'Documentos necessários por tipo de operação no e-CredAc';
