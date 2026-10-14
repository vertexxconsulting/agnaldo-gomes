-- ==============================================================================
-- MIGRATION: SENHAS DE ESTOQUE E LOGS DE RESPONSÁVEL
-- Adiciona senha/PIN aos profissionais e coluna created_by nas movimentações
-- ==============================================================================

ALTER TABLE salon_professionals
    ADD COLUMN IF NOT EXISTS stock_pin TEXT DEFAULT '1234';

COMMENT ON COLUMN salon_professionals.stock_pin IS 'PIN/Senha própria do profissional para autorizar entradas e baixas de estoque';

ALTER TABLE salon_inventory_movements
    ADD COLUMN IF NOT EXISTS created_by TEXT;

COMMENT ON COLUMN salon_inventory_movements.created_by IS 'Nome do profissional ou usuário responsável que realizou a entrada ou baixa';

-- ==============================================================================
-- FIM DA MIGRATION
-- ==============================================================================
