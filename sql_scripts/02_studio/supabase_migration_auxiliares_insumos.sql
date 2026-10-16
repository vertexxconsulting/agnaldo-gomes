-- ==============================================================================
-- Migration: Suporte a Auxiliares de Procedimento e Custo de Insumos por Grama
-- ==============================================================================
-- 1. Permite múltiplos profissionais (Titular + Auxiliares) participando do mesmo
--    procedimento (ex: mechas com 5 etapas, descoloração, lavatório, finalização).
-- 2. Registra o custo total dos produtos usados por grama (fundo reserva de reposição).
--
-- O sistema opera 100% retrocompatível armazenando os dados tanto no JSONB de metadados
-- (_meta no sub_services) quanto nas colunas dedicadas abaixo.
-- ==============================================================================

-- Coluna para lista de UUIDs dos profissionais auxiliares que participaram do atendimento
ALTER TABLE salon_appointments 
ADD COLUMN IF NOT EXISTS assistant_ids UUID[] DEFAULT '{}';

-- Coluna para custo total dos insumos utilizados por grama (fundo reserva de recompra)
ALTER TABLE salon_appointments 
ADD COLUMN IF NOT EXISTS product_cost NUMERIC(10,2) DEFAULT 0.00;

-- Comentários descritivos
COMMENT ON COLUMN salon_appointments.assistant_ids IS 'Lista de IDs dos profissionais auxiliares/co-participantes do procedimento cuja agenda fica ocupada.';
COMMENT ON COLUMN salon_appointments.product_cost IS 'Custo total em R$ dos insumos/produtos usados por grama no atendimento (fundo reserva para recompra de estoque).';
