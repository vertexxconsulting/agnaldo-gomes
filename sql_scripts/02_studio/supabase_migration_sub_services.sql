-- ============================================================
-- Migração: adiciona coluna sub_services em salon_appointments
-- Executar no Supabase SQL Editor
-- ============================================================

-- Adiciona coluna para armazenar subserviços/adicionais do agendamento
ALTER TABLE salon_appointments
  ADD COLUMN IF NOT EXISTS sub_services JSONB DEFAULT NULL;

COMMENT ON COLUMN salon_appointments.sub_services IS
  'Array de subserviços/adicionais vinculados ao agendamento (ex: Escova, Hidratação). Armazenado como JSONB.';

-- Índice GIN para buscas dentro do JSONB (opcional, melhora performance)
CREATE INDEX IF NOT EXISTS idx_salon_appointments_sub_services
  ON salon_appointments USING GIN (sub_services);
