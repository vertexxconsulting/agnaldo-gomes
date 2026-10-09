-- ==============================================================================
-- MIGRAÇÃO: Tabelas para Agendamentos do Dia da Noiva
-- ==============================================================================
-- Execute no SQL Editor do Supabase para criar as tabelas específicas de Noivas.
-- Corrige o erro "column customer_id does not exist" referenciando "id" corretamente.
-- ==============================================================================

-- 1. SALON_BRIDE_APPOINTMENTS
DROP TABLE IF EXISTS salon_bride_payments CASCADE;
DROP TABLE IF EXISTS salon_bride_appointments CASCADE;

CREATE TABLE IF NOT EXISTS salon_bride_appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES salon_customers(id) ON DELETE SET NULL,
  profissional_id UUID REFERENCES salon_professionals(id) ON DELETE SET NULL,
  pacote_id UUID REFERENCES salon_services(id) ON DELETE SET NULL,
  nome_noiva TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  data_evento DATE NOT NULL,
  data_agendamento DATE NOT NULL,
  hora TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'sinal_pendente',
  sinal_percentual INTEGER DEFAULT 50,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_salon_bride_appointments_modtime ON salon_bride_appointments;
CREATE TRIGGER update_salon_bride_appointments_modtime 
  BEFORE UPDATE ON salon_bride_appointments 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_salon_bride_appt_date ON salon_bride_appointments(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_salon_bride_appt_status ON salon_bride_appointments(status);
CREATE INDEX IF NOT EXISTS idx_salon_bride_appt_phone ON salon_bride_appointments(telefone);

-- 2. SALON_BRIDE_PAYMENTS
CREATE TABLE IF NOT EXISTS salon_bride_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agendamento_id UUID REFERENCES salon_bride_appointments(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, 
  valor DECIMAL(10,2) NOT NULL,
  forma TEXT, 
  status TEXT NOT NULL DEFAULT 'pendente', 
  pix_copia_cola TEXT,
  comprovante_url TEXT,
  data_pagamento TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_salon_bride_payments_modtime ON salon_bride_payments;
CREATE TRIGGER update_salon_bride_payments_modtime 
  BEFORE UPDATE ON salon_bride_payments 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- RLS - ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE salon_bride_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_bride_payments ENABLE ROW LEVEL SECURITY;

-- Admins e Profissionais gerenciam todos os agendamentos de noivas
DROP POLICY IF EXISTS "Admins e Profissionais gerenciam bride_appointments" ON salon_bride_appointments;
CREATE POLICY "Admins e Profissionais gerenciam bride_appointments"
  ON salon_bride_appointments FOR ALL
  USING (public.get_user_role() IN ('ADMIN', 'PROFESSIONAL'));

DROP POLICY IF EXISTS "Admins e Profissionais gerenciam bride_payments" ON salon_bride_payments;
CREATE POLICY "Admins e Profissionais gerenciam bride_payments"
  ON salon_bride_payments FOR ALL
  USING (public.get_user_role() IN ('ADMIN', 'PROFESSIONAL'));

-- Clientes veem apenas os seus (via correspondência de e-mail ou vínculo com o CRM)
DROP POLICY IF EXISTS "Clientes veem seus próprios bride_appointments" ON salon_bride_appointments;
CREATE POLICY "Clientes veem seus próprios bride_appointments"
  ON salon_bride_appointments FOR SELECT
  USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid()) OR
    customer_id IN (SELECT id FROM salon_customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Clientes veem seus próprios bride_payments" ON salon_bride_payments;
CREATE POLICY "Clientes veem seus próprios bride_payments"
  ON salon_bride_payments FOR SELECT
  USING (
    agendamento_id IN (
      SELECT id FROM salon_bride_appointments WHERE 
        email = (SELECT email FROM profiles WHERE id = auth.uid()) OR
        customer_id IN (SELECT id FROM salon_customers WHERE user_id = auth.uid())
    )
  );

-- Permitir Service Role (Webhook)
DROP POLICY IF EXISTS "Service Role gerencia bride_appointments" ON salon_bride_appointments;
CREATE POLICY "Service Role gerencia bride_appointments"
  ON salon_bride_appointments FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service Role gerencia bride_payments" ON salon_bride_payments;
CREATE POLICY "Service Role gerencia bride_payments"
  ON salon_bride_payments FOR ALL
  USING (auth.role() = 'service_role');
