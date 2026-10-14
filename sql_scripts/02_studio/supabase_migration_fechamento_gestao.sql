-- ==============================================================================
-- Migration: Suporte ao Fechamento Financeiro em Duas Etapas (Secretaria vs Gestão)
-- ==============================================================================
-- Etapa 1: A Secretaria faz o Fechamento Prévio (pré-recebimento) na recepção/agenda.
-- Etapa 2: A Gestão do Salão faz a Conferência e Confirmação Final na aba Financeiro e Caixa.
--
-- O sistema armazena o status financeiro de forma retrocompatível no sub_services._meta
-- e, caso as colunas abaixo existam, também persiste diretamente nas colunas dedicadas.
-- ==============================================================================

ALTER TABLE salon_appointments 
ADD COLUMN IF NOT EXISTS financial_status TEXT DEFAULT 'PENDING_CONFIRMATION';

ALTER TABLE salon_appointments 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

ALTER TABLE salon_appointments 
ADD COLUMN IF NOT EXISTS confirmed_by TEXT;

COMMENT ON COLUMN salon_appointments.financial_status IS 'Status da conferência financeira: PENDING_CONFIRMATION (Pré-fechamento pela secretaria) ou CONFIRMED (Confirmado e contabilizado pela gestão).';
