-- ============================================================
-- E-CREDac ICMS Platform — Migration 005
-- Sprint 4: Execucao Guiada com SLA
-- Checklist dinamico, responsaveis, SLA por fase
-- AMBIENTE: DEV ONLY (ggtivdrgazqygydoiyqu)
-- ============================================================

-- ============================================================
-- ENUM: task_status, sla_status
-- ============================================================

CREATE TYPE execution_task_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked', 'skipped');
CREATE TYPE sla_status AS ENUM ('on_track', 'at_risk', 'breached', 'completed');
CREATE TYPE responsible_role AS ENUM ('seller', 'buyer', 'platform', 'sefaz', 'legal', 'financial');

-- ============================================================
-- TABLE: execution_templates
-- Templates de checklist por fase do pipeline
-- Cada fase tem tarefas padrão com SLA default
-- ============================================================

CREATE TABLE execution_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  phase INTEGER NOT NULL CHECK (phase >= 1 AND phase <= 8),
  phase_name VARCHAR(50) NOT NULL,

  -- Tarefa
  task_order INTEGER NOT NULL DEFAULT 1,
  task_name VARCHAR(200) NOT NULL,
  task_description TEXT,

  -- Responsavel padrao
  responsible responsible_role NOT NULL DEFAULT 'platform',

  -- SLA
  sla_hours INTEGER NOT NULL DEFAULT 24,        -- horas para completar
  sla_critical BOOLEAN NOT NULL DEFAULT FALSE,  -- se true, bloqueia avanço

  -- Condicional
  required BOOLEAN NOT NULL DEFAULT TRUE,        -- obrigatoria?
  depends_on_task INTEGER,                       -- depende de qual task_order na mesma fase?

  -- Documentacao esperada
  requires_document BOOLEAN NOT NULL DEFAULT FALSE,
  document_type VARCHAR(50),                     -- tipo de documento esperado

  -- Automacao
  auto_complete_condition VARCHAR(100),           -- campo que auto-completa a task
  -- Ex: 'transaction.payment_status=confirmed', 'listing.homologation_status=homologado'

  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_phase ON execution_templates(phase, task_order);

-- ============================================================
-- TABLE: execution_plans
-- Plano de execucao instanciado para cada deal (match)
-- ============================================================

CREATE TABLE execution_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,

  -- Status geral
  current_phase INTEGER NOT NULL DEFAULT 1,
  overall_progress NUMERIC(5,2) NOT NULL DEFAULT 0,  -- 0-100
  overall_sla_status sla_status NOT NULL DEFAULT 'on_track',

  -- Datas
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estimated_completion TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Stats
  total_tasks INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  blocked_tasks INTEGER NOT NULL DEFAULT 0,
  breached_slas INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_plan_per_match UNIQUE (match_id)
);

CREATE INDEX idx_plans_match ON execution_plans(match_id);
CREATE INDEX idx_plans_status ON execution_plans(overall_sla_status);

-- ============================================================
-- TABLE: execution_tasks
-- Tarefas instanciadas do plano de execucao
-- ============================================================

CREATE TABLE execution_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES execution_plans(id) ON DELETE CASCADE,
  template_id UUID REFERENCES execution_templates(id),

  -- Fase e ordem
  phase INTEGER NOT NULL,
  task_order INTEGER NOT NULL,
  task_name VARCHAR(200) NOT NULL,
  task_description TEXT,

  -- Status
  status execution_task_status NOT NULL DEFAULT 'pending',

  -- Responsavel
  responsible responsible_role NOT NULL DEFAULT 'platform',
  assigned_company_id UUID REFERENCES companies(id),
  assigned_user_name VARCHAR(100),

  -- SLA
  sla_hours INTEGER NOT NULL DEFAULT 24,
  sla_deadline TIMESTAMPTZ,
  sla_status sla_status NOT NULL DEFAULT 'on_track',
  sla_breached_at TIMESTAMPTZ,

  -- Execucao
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by VARCHAR(100),
  completion_note TEXT,

  -- Bloqueio
  blocked_reason TEXT,
  blocked_at TIMESTAMPTZ,

  -- Documento associado
  document_id UUID,
  document_url TEXT,

  -- Flags
  required BOOLEAN NOT NULL DEFAULT TRUE,
  sla_critical BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_plan ON execution_tasks(plan_id, phase, task_order);
CREATE INDEX idx_tasks_status ON execution_tasks(status);
CREATE INDEX idx_tasks_sla ON execution_tasks(sla_status) WHERE sla_status IN ('at_risk', 'breached');
CREATE INDEX idx_tasks_deadline ON execution_tasks(sla_deadline) WHERE status NOT IN ('completed', 'skipped');

-- ============================================================
-- TABLE: execution_comments
-- Comentarios/notas em tarefas do plano
-- ============================================================

CREATE TABLE execution_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES execution_tasks(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  author_name VARCHAR(100),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_task ON execution_comments(task_id);

-- ============================================================
-- FUNCTION: create_execution_plan(match_id UUID)
-- Instancia um plano de execucao a partir dos templates
-- ============================================================

CREATE OR REPLACE FUNCTION create_execution_plan(p_match_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_plan_id UUID;
  v_template RECORD;
  v_task_count INTEGER := 0;
  v_match RECORD;
  v_sla_start TIMESTAMPTZ := NOW();
BEGIN
  -- Verificar se ja existe plano
  SELECT id INTO v_plan_id FROM execution_plans WHERE match_id = p_match_id;
  IF FOUND THEN
    RETURN jsonb_build_object('error', 'Plan already exists', 'plan_id', v_plan_id);
  END IF;

  -- Buscar match
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Match not found');
  END IF;

  -- Criar plano
  INSERT INTO execution_plans (match_id) VALUES (p_match_id) RETURNING id INTO v_plan_id;

  -- Instanciar tarefas dos templates ativos
  FOR v_template IN
    SELECT * FROM execution_templates WHERE active = TRUE ORDER BY phase, task_order
  LOOP
    INSERT INTO execution_tasks (
      plan_id, template_id,
      phase, task_order, task_name, task_description,
      responsible, sla_hours, sla_critical, required,
      sla_deadline,
      assigned_company_id
    ) VALUES (
      v_plan_id, v_template.id,
      v_template.phase, v_template.task_order, v_template.task_name, v_template.task_description,
      v_template.responsible, v_template.sla_hours, v_template.sla_critical, v_template.required,
      v_sla_start + (v_template.sla_hours || ' hours')::interval,
      CASE v_template.responsible
        WHEN 'seller' THEN v_match.seller_company_id
        WHEN 'buyer' THEN v_match.buyer_company_id
        ELSE NULL
      END
    );

    v_task_count := v_task_count + 1;

    -- Acumular tempo de SLA para tasks sequenciais na mesma fase
    IF v_template.task_order = (SELECT MAX(task_order) FROM execution_templates WHERE phase = v_template.phase AND active = TRUE) THEN
      v_sla_start := v_sla_start + (v_template.sla_hours || ' hours')::interval;
    END IF;
  END LOOP;

  -- Atualizar contagem
  UPDATE execution_plans SET
    total_tasks = v_task_count,
    estimated_completion = v_sla_start
  WHERE id = v_plan_id;

  RETURN jsonb_build_object(
    'plan_id', v_plan_id,
    'tasks_created', v_task_count,
    'estimated_completion', v_sla_start
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: complete_execution_task(task_id UUID, note TEXT)
-- Completa uma tarefa e atualiza progresso do plano
-- ============================================================

CREATE OR REPLACE FUNCTION complete_execution_task(
  p_task_id UUID,
  p_note TEXT DEFAULT NULL,
  p_completed_by VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_task RECORD;
  v_plan RECORD;
  v_completed INTEGER;
  v_total INTEGER;
  v_progress NUMERIC(5,2);
  v_phase_complete BOOLEAN;
  v_next_phase INTEGER;
BEGIN
  -- Buscar task
  SELECT * INTO v_task FROM execution_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Task not found'); END IF;
  IF v_task.status = 'completed' THEN RETURN jsonb_build_object('error', 'Task already completed'); END IF;

  -- Completar task
  UPDATE execution_tasks SET
    status = 'completed',
    completed_at = NOW(),
    completed_by = p_completed_by,
    completion_note = p_note,
    sla_status = CASE
      WHEN sla_deadline IS NOT NULL AND NOW() > sla_deadline THEN 'breached'
      ELSE 'completed'
    END,
    updated_at = NOW()
  WHERE id = p_task_id;

  -- Buscar plano
  SELECT * INTO v_plan FROM execution_plans WHERE id = v_task.plan_id;

  -- Calcular progresso
  SELECT COUNT(*) INTO v_completed FROM execution_tasks
  WHERE plan_id = v_task.plan_id AND status IN ('completed', 'skipped');

  SELECT COUNT(*) INTO v_total FROM execution_tasks
  WHERE plan_id = v_task.plan_id;

  v_progress := (v_completed::NUMERIC / GREATEST(v_total, 1)) * 100;

  -- Verificar se fase atual esta completa
  SELECT NOT EXISTS (
    SELECT 1 FROM execution_tasks
    WHERE plan_id = v_task.plan_id
      AND phase = v_task.phase
      AND required = TRUE
      AND status NOT IN ('completed', 'skipped')
  ) INTO v_phase_complete;

  -- Se fase completa, avancar para proxima
  v_next_phase := v_plan.current_phase;
  IF v_phase_complete AND v_task.phase = v_plan.current_phase THEN
    v_next_phase := v_plan.current_phase + 1;

    -- Ativar SLAs da proxima fase
    UPDATE execution_tasks SET
      sla_deadline = NOW() + (sla_hours || ' hours')::interval
    WHERE plan_id = v_task.plan_id
      AND phase = v_next_phase
      AND status = 'pending';
  END IF;

  -- Atualizar plano
  UPDATE execution_plans SET
    current_phase = LEAST(v_next_phase, 8),
    overall_progress = v_progress,
    completed_tasks = v_completed,
    breached_slas = (SELECT COUNT(*) FROM execution_tasks WHERE plan_id = v_task.plan_id AND sla_status = 'breached'),
    completed_at = CASE WHEN v_progress >= 100 THEN NOW() ELSE NULL END,
    overall_sla_status = CASE
      WHEN v_progress >= 100 THEN 'completed'
      WHEN EXISTS (SELECT 1 FROM execution_tasks WHERE plan_id = v_task.plan_id AND sla_status = 'breached') THEN 'breached'
      WHEN EXISTS (SELECT 1 FROM execution_tasks WHERE plan_id = v_task.plan_id AND sla_status = 'at_risk') THEN 'at_risk'
      ELSE 'on_track'
    END,
    updated_at = NOW()
  WHERE id = v_task.plan_id;

  -- Notificar se fase avancou
  IF v_phase_complete AND v_next_phase > v_plan.current_phase THEN
    -- Notificar vendedor
    INSERT INTO notifications (company_id, type, title, body, reference_type, reference_id)
    SELECT seller_company_id, 'phase_advanced',
      format('Fase %s concluida!', v_plan.current_phase),
      format('A operacao avancou para a fase %s. Verifique as proximas tarefas.', v_next_phase),
      'execution_plan', v_plan.id
    FROM matches WHERE id = v_plan.match_id;

    -- Notificar comprador
    INSERT INTO notifications (company_id, type, title, body, reference_type, reference_id)
    SELECT buyer_company_id, 'phase_advanced',
      format('Fase %s concluida!', v_plan.current_phase),
      format('A operacao avancou para a fase %s. Verifique as proximas tarefas.', v_next_phase),
      'execution_plan', v_plan.id
    FROM matches WHERE id = v_plan.match_id;
  END IF;

  RETURN jsonb_build_object(
    'task_id', p_task_id,
    'status', 'completed',
    'phase_complete', v_phase_complete,
    'new_phase', v_next_phase,
    'progress', v_progress
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: check_sla_breaches()
-- Verificar e marcar SLAs vencidos (rodar via cron)
-- ============================================================

CREATE OR REPLACE FUNCTION check_sla_breaches()
RETURNS JSONB AS $$
DECLARE
  v_task RECORD;
  v_breached INTEGER := 0;
  v_at_risk INTEGER := 0;
BEGIN
  -- Marcar tasks com SLA vencido
  FOR v_task IN
    SELECT et.*, ep.match_id
    FROM execution_tasks et
    JOIN execution_plans ep ON ep.id = et.plan_id
    WHERE et.status NOT IN ('completed', 'skipped')
      AND et.sla_deadline IS NOT NULL
      AND et.sla_status NOT IN ('breached')
  LOOP
    IF v_task.sla_deadline < NOW() THEN
      -- Breached
      UPDATE execution_tasks SET
        sla_status = 'breached',
        sla_breached_at = NOW(),
        updated_at = NOW()
      WHERE id = v_task.id;

      -- Notificar responsavel
      IF v_task.assigned_company_id IS NOT NULL THEN
        INSERT INTO notifications (company_id, type, title, body, reference_type, reference_id)
        VALUES (
          v_task.assigned_company_id,
          'sla_breached',
          format('SLA vencido: %s', v_task.task_name),
          format('A tarefa "%s" ultrapassou o prazo de %s horas.', v_task.task_name, v_task.sla_hours),
          'execution_task', v_task.id
        );
      END IF;

      v_breached := v_breached + 1;

    ELSIF v_task.sla_deadline < NOW() + INTERVAL '2 hours' AND v_task.sla_status = 'on_track' THEN
      -- At risk (menos de 2 horas)
      UPDATE execution_tasks SET sla_status = 'at_risk', updated_at = NOW() WHERE id = v_task.id;

      IF v_task.assigned_company_id IS NOT NULL THEN
        INSERT INTO notifications (company_id, type, title, body, reference_type, reference_id)
        VALUES (
          v_task.assigned_company_id,
          'sla_at_risk',
          format('SLA proximo: %s', v_task.task_name),
          format('A tarefa "%s" vence em menos de 2 horas.', v_task.task_name),
          'execution_task', v_task.id
        );
      END IF;

      v_at_risk := v_at_risk + 1;
    END IF;
  END LOOP;

  -- Atualizar status geral dos planos afetados
  UPDATE execution_plans SET
    overall_sla_status = CASE
      WHEN EXISTS (SELECT 1 FROM execution_tasks WHERE plan_id = execution_plans.id AND sla_status = 'breached') THEN 'breached'
      WHEN EXISTS (SELECT 1 FROM execution_tasks WHERE plan_id = execution_plans.id AND sla_status = 'at_risk') THEN 'at_risk'
      ELSE overall_sla_status
    END,
    breached_slas = (SELECT COUNT(*) FROM execution_tasks WHERE plan_id = execution_plans.id AND sla_status = 'breached'),
    updated_at = NOW()
  WHERE overall_sla_status NOT IN ('completed');

  RETURN jsonb_build_object('breached', v_breached, 'at_risk', v_at_risk);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGER: auto-create execution plan when match is confirmed
-- ============================================================

CREATE OR REPLACE FUNCTION trg_create_plan_on_confirm()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    PERFORM create_execution_plan(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_match_confirmed_plan
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION trg_create_plan_on_confirm();

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE execution_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_comments ENABLE ROW LEVEL SECURITY;

-- Templates: visiveis para todos autenticados
CREATE POLICY templates_select ON execution_templates FOR SELECT USING (TRUE);

-- Plans: visiveis para vendedor e comprador do match
CREATE POLICY plans_select ON execution_plans FOR SELECT
  USING (match_id IN (
    SELECT id FROM matches
    WHERE seller_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
       OR buyer_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
  ));

-- Tasks: visiveis para participantes do plano
CREATE POLICY tasks_select ON execution_tasks FOR SELECT
  USING (plan_id IN (SELECT id FROM execution_plans WHERE match_id IN (
    SELECT id FROM matches
    WHERE seller_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
       OR buyer_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
  )));

CREATE POLICY tasks_update ON execution_tasks FOR UPDATE
  USING (plan_id IN (SELECT id FROM execution_plans WHERE match_id IN (
    SELECT id FROM matches
    WHERE seller_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
       OR buyer_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
  )));

-- Comments: visiveis para participantes
CREATE POLICY comments_select ON execution_comments FOR SELECT
  USING (task_id IN (SELECT id FROM execution_tasks WHERE plan_id IN (
    SELECT id FROM execution_plans WHERE match_id IN (
      SELECT id FROM matches
      WHERE seller_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
         OR buyer_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
    ))));

CREATE POLICY comments_insert ON execution_comments FOR INSERT
  WITH CHECK (task_id IN (SELECT id FROM execution_tasks WHERE plan_id IN (
    SELECT id FROM execution_plans WHERE match_id IN (
      SELECT id FROM matches
      WHERE seller_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
         OR buyer_company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid())
    ))));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE execution_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE execution_tasks;

-- ============================================================
-- SEED: Templates padrao para as 8 fases do pipeline
-- ============================================================

INSERT INTO execution_templates (phase, phase_name, task_order, task_name, task_description, responsible, sla_hours, sla_critical, required, requires_document, document_type) VALUES

-- Fase 1: Originacao
(1, 'Originacao', 1, 'Validar documentacao do credito', 'Verificar e-CREDac, NFs de origem, escrituracao', 'seller', 24, TRUE, TRUE, TRUE, 'other'),
(1, 'Originacao', 2, 'Consultar situacao SEFAZ', 'Consultar status da empresa cedente junto a SEFAZ-SP', 'platform', 4, TRUE, TRUE, FALSE, NULL),
(1, 'Originacao', 3, 'Calcular Credit Score', 'Executar algoritmo de scoring do credito', 'platform', 1, FALSE, TRUE, FALSE, NULL),
(1, 'Originacao', 4, 'Publicar credito no marketplace', 'Ativar listing com Credit ID gerado', 'seller', 12, FALSE, TRUE, FALSE, NULL),

-- Fase 2: Matching
(2, 'Matching', 1, 'Aguardar matching automatico', 'Engine de matching buscando demandas compativeis', 'platform', 48, FALSE, TRUE, FALSE, NULL),
(2, 'Matching', 2, 'Analisar match proposto', 'Vendedor e comprador avaliam o match sugerido', 'seller', 24, TRUE, TRUE, FALSE, NULL),
(2, 'Matching', 3, 'Comprador aceita match', 'Comprador confirma interesse no credito', 'buyer', 24, TRUE, TRUE, FALSE, NULL),

-- Fase 3: Conclusao Comercial
(3, 'Conclusao Comercial', 1, 'Negociar desconto final', 'Ajustar desconto entre as partes (ou via leilao)', 'platform', 24, FALSE, TRUE, FALSE, NULL),
(3, 'Conclusao Comercial', 2, 'Confirmar termos comerciais', 'Ambas as partes concordam com valores finais', 'seller', 12, TRUE, TRUE, FALSE, NULL),
(3, 'Conclusao Comercial', 3, 'Gerar termo de compromisso', 'Plataforma gera documento com termos acordados', 'platform', 4, FALSE, TRUE, TRUE, 'contract'),

-- Fase 4: Procuracao Digital
(4, 'Procuracao Digital', 1, 'Preparar procuracao e-CREDac', 'Gerar procuracao digital para transferencia', 'platform', 8, FALSE, TRUE, TRUE, 'power_of_attorney'),
(4, 'Procuracao Digital', 2, 'Cedente assina procuracao', 'Assinatura digital do cedente via ClickSign', 'seller', 24, TRUE, TRUE, TRUE, 'power_of_attorney'),
(4, 'Procuracao Digital', 3, 'Cessionario assina procuracao', 'Assinatura digital do cessionario', 'buyer', 24, TRUE, TRUE, TRUE, 'power_of_attorney'),
(4, 'Procuracao Digital', 4, 'Validar procuracao assinada', 'Conferir assinaturas e protocolar', 'platform', 4, TRUE, TRUE, FALSE, NULL),

-- Fase 5: Contrato
(5, 'Contrato', 1, 'Gerar contrato de cessao', 'Elaborar contrato de cessao de credito ICMS', 'legal', 24, FALSE, TRUE, TRUE, 'contract'),
(5, 'Contrato', 2, 'Revisao juridica — cedente', 'Cedente revisa e aprova contrato', 'seller', 48, FALSE, TRUE, FALSE, NULL),
(5, 'Contrato', 3, 'Revisao juridica — cessionario', 'Cessionario revisa e aprova contrato', 'buyer', 48, FALSE, TRUE, FALSE, NULL),
(5, 'Contrato', 4, 'Assinatura digital do contrato', 'Ambas partes assinam via ClickSign', 'platform', 24, TRUE, TRUE, TRUE, 'contract'),
(5, 'Contrato', 5, 'Registrar contrato', 'Protocolar contrato assinado no sistema', 'platform', 4, FALSE, TRUE, FALSE, NULL),

-- Fase 6: Transferencia
(6, 'Transferencia', 1, 'Comprador efetua pagamento', 'Pagamento via PIX/TED conforme contrato', 'buyer', 48, TRUE, TRUE, TRUE, 'receipt'),
(6, 'Transferencia', 2, 'Confirmar recebimento do pagamento', 'Vendedor confirma recebimento do valor', 'seller', 12, TRUE, TRUE, FALSE, NULL),
(6, 'Transferencia', 3, 'Emitir NF-e de transferencia', 'Emissao da nota fiscal de cessao de credito', 'seller', 24, TRUE, TRUE, TRUE, 'nfe'),
(6, 'Transferencia', 4, 'Protocolar transferencia na SEFAZ', 'Registrar cessao no sistema e-CREDac da SEFAZ', 'platform', 48, TRUE, TRUE, FALSE, NULL),
(6, 'Transferencia', 5, 'Confirmar averbacao SEFAZ', 'SEFAZ confirma averbacao da transferencia', 'sefaz', 120, TRUE, TRUE, FALSE, NULL),

-- Fase 7: Uso do Credito
(7, 'Uso do Credito', 1, 'Credito disponivel para uso', 'Credito averbado e pronto para compensacao', 'platform', 4, FALSE, TRUE, FALSE, NULL),
(7, 'Uso do Credito', 2, 'Monitorar utilizacao', 'Acompanhar uso do credito pelo cessionario', 'platform', 720, FALSE, FALSE, FALSE, NULL),

-- Fase 8: Concluido
(8, 'Concluido', 1, 'Gerar relatorio final', 'Relatorio completo da operacao para ambas as partes', 'platform', 24, FALSE, TRUE, TRUE, 'other'),
(8, 'Concluido', 2, 'Avaliar operacao', 'Ambas partes avaliam a experiencia na plataforma', 'buyer', 168, FALSE, FALSE, FALSE, NULL),
(8, 'Concluido', 3, 'Encerrar operacao', 'Marcar operacao como finalizada no sistema', 'platform', 4, FALSE, TRUE, FALSE, NULL);
