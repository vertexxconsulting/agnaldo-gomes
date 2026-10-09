-- ==============================================================================
-- MIGRAÇÃO: Auditoria salon_appointment_logs + trigger automático
-- ==============================================================================
-- Execute no SQL Editor do Supabase

-- 1. Tabela de auditoria de agendamentos
CREATE TABLE IF NOT EXISTS salon_appointment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES salon_appointments(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  field_changed TEXT NOT NULL, -- 'status', 'professional_id', 'date', 'start_time', 'end_time', etc.
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_salon_appointment_logs_appointment ON salon_appointment_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_salon_appointment_logs_changed_by ON salon_appointment_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_salon_appointment_logs_field ON salon_appointment_logs(field_changed);
CREATE INDEX IF NOT EXISTS idx_salon_appointment_logs_created ON salon_appointment_logs(created_at DESC);

-- 2. RLS
ALTER TABLE salon_appointment_logs ENABLE ROW LEVEL SECURITY;

-- Admins veem tudo
DROP POLICY IF EXISTS "Admins view appointment logs" ON salon_appointment_logs;
CREATE POLICY "Admins view appointment logs" ON salon_appointment_logs 
  FOR SELECT USING (public.get_user_role() = 'ADMIN');

-- STUDIO_SECRETARIA veem tudo
DROP POLICY IF EXISTS "Secretaria view appointment logs" ON salon_appointment_logs;
CREATE POLICY "Secretaria view appointment logs" ON salon_appointment_logs 
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'studio_secretaria'
    OR public.get_user_role() = 'studio_secretaria'
  );

-- PROFESSIONAL vê logs dos seus agendamentos
DROP POLICY IF EXISTS "Professionals view own appointment logs" ON salon_appointment_logs;
CREATE POLICY "Professionals view own appointment logs" ON salon_appointment_logs 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM salon_appointments sa
      JOIN salon_professionals sp ON sp.id = sa.professional_id
      WHERE sa.id = salon_appointment_logs.appointment_id
        AND sp.user_id = auth.uid()
    )
  );

-- CLIENTES veem logs dos seus agendamentos
DROP POLICY IF EXISTS "Customers view own appointment logs" ON salon_appointment_logs;
CREATE POLICY "Customers view own appointment logs" ON salon_appointment_logs 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM salon_appointments sa
      JOIN salon_customers sc ON sc.id = sa.customer_id
      WHERE sa.id = salon_appointment_logs.appointment_id
        AND sc.user_id = auth.uid()
    )
  );

-- Service Role para trigger
DROP POLICY IF EXISTS "Service Role manages appointment logs" ON salon_appointment_logs;
CREATE POLICY "Service Role manages appointment logs" ON salon_appointment_logs 
  FOR ALL USING (auth.role() = 'service_role');

-- 3. Trigger automático para popular logs
CREATE OR REPLACE FUNCTION log_salon_appointment_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_by UUID;
  v_fields TEXT[];
  v_field TEXT;
  v_old JSONB;
  v_new JSONB;
BEGIN
  -- Obter usuário que fez a alteração (pode ser null se via service_role)
  v_changed_by := auth.uid();

  -- Detectar quais campos mudaram
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO salon_appointment_logs (appointment_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'status', to_jsonb(OLD.status), to_jsonb(NEW.status));
  END IF;

  IF OLD.professional_id IS DISTINCT FROM NEW.professional_id THEN
    INSERT INTO salon_appointment_logs (appointment_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'professional_id', to_jsonb(OLD.professional_id), to_jsonb(NEW.professional_id));
  END IF;

  IF OLD.date IS DISTINCT FROM NEW.date THEN
    INSERT INTO salon_appointment_logs (appointment_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'date', to_jsonb(OLD.date), to_jsonb(NEW.date));
  END IF;

  IF OLD.start_time IS DISTINCT FROM NEW.start_time THEN
    INSERT INTO salon_appointment_logs (appointment_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'start_time', to_jsonb(OLD.start_time), to_jsonb(NEW.start_time));
  END IF;

  IF OLD.end_time IS DISTINCT FROM NEW.end_time THEN
    INSERT INTO salon_appointment_logs (appointment_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'end_time', to_jsonb(OLD.end_time), to_jsonb(NEW.end_time));
  END IF;

  IF OLD.service_id IS DISTINCT FROM NEW.service_id THEN
    INSERT INTO salon_appointment_logs (appointment_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'service_id', to_jsonb(OLD.service_id), to_jsonb(NEW.service_id));
  END IF;

  IF OLD.channel IS DISTINCT FROM NEW.channel THEN
    INSERT INTO salon_appointment_logs (appointment_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'channel', to_jsonb(OLD.channel), to_jsonb(NEW.channel));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS salon_appointment_audit_trigger ON salon_appointments;
DROP TRIGGER IF EXISTS salon_appointment_audit_trigger ON salon_appointments;
CREATE TRIGGER salon_appointment_audit_trigger
  AFTER UPDATE ON salon_appointments
  FOR EACH ROW
  EXECUTE FUNCTION log_salon_appointment_changes();

-- 4. Função helper para buscar histórico de um agendamento
CREATE OR REPLACE FUNCTION get_appointment_history(p_appointment_id UUID)
RETURNS TABLE (
  id UUID,
  field_changed TEXT,
  old_value JSONB,
  new_value JSONB,
  changed_by UUID,
  changed_by_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sal.id,
    sal.field_changed,
    sal.old_value,
    sal.new_value,
    sal.changed_by,
    COALESCE(p.full_name, 'Sistema') as changed_by_name,
    sal.created_at
  FROM salon_appointment_logs sal
  LEFT JOIN profiles p ON p.id = sal.changed_by
  WHERE sal.appointment_id = p_appointment_id
  ORDER BY sal.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;