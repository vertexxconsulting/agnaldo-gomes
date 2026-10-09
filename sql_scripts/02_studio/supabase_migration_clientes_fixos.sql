-- =========================================================================
-- MIGRATION: ADICIONAR CAMPOS DE CLIENTE FIXO AOS AGENDAMENTOS
-- =========================================================================

-- 1. Cria um novo enum para o tipo de recorrência (se não existir)
DO $$ BEGIN
    CREATE TYPE appointment_recurrence AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Adiciona as colunas na tabela de agendamentos
ALTER TABLE salon_appointments 
ADD COLUMN is_fixed BOOLEAN DEFAULT false,
ADD COLUMN recurrence_type appointment_recurrence,
ADD COLUMN recurrence_custom_day INTEGER;

-- Comentários sobre as colunas para facilitar o entendimento
COMMENT ON COLUMN salon_appointments.is_fixed IS 'Indica se este é um horário fixo/recorrente do cliente';
COMMENT ON COLUMN salon_appointments.recurrence_type IS 'Frequência do horário fixo: WEEKLY (Semanal), BIWEEKLY (Quinzenal), MONTHLY (Mensal), CUSTOM (Personalizado)';
COMMENT ON COLUMN salon_appointments.recurrence_custom_day IS 'Dia do mês para recorrência customizada (ex: todo dia 5)';
