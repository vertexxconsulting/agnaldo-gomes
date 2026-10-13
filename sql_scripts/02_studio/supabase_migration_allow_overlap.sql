-- ==============================================================================
-- Migration: Adicionar suporte a sobreposição/encaixes em agendamentos
-- Permite que atendimentos de procedimentos longos (ex: coloração) permitam encaixes durante pausas.
-- Executar no SQL Editor do Supabase se desejar persistir a flag na coluna dedicada.
-- ==============================================================================

ALTER TABLE salon_appointments 
ADD COLUMN IF NOT EXISTS allow_overlap BOOLEAN DEFAULT false;

COMMENT ON COLUMN salon_appointments.allow_overlap IS 'Indica se este agendamento permite encaixe/sobreposição de outro cliente durante o período (ex: pausa de procedimento).';
