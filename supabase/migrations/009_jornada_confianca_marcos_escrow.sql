-- ============================================================
-- Migration 009: Jornada de Confiança — Marcos, Evidências, Escrow
-- "Visibilidade total. Acesso zero."
-- Aplicada em: 2026-04-05
-- ============================================================

-- Ver migration completa aplicada via Supabase MCP
-- Tabelas: operacao_marcos, marco_evidencias, escrow_parcelas, operacao_audit_log
-- Funções: criar_marcos_operacao(), criar_escrow_padrao()
-- RLS: is_transaction_participant() helper + policies por tabela
