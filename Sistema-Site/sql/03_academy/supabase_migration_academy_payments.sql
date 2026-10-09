-- ==============================================================================
-- MIGRAÇÃO: Tabela payment_records Academy + Webhook Stripe
-- ==============================================================================
-- Execute no SQL Editor do Supabase

-- 1. Tabela payment_records (registro de pagamentos da Academy)
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'stripe' | 'mercadopago'
  provider_payment_id TEXT NOT NULL,
  provider_session_id TEXT,
  amount_brl DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed, refunded, cancelled
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  paid_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS update_payment_records_modtime ON payment_records;
CREATE TRIGGER update_payment_records_modtime 
  BEFORE UPDATE ON payment_records 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_payment_records_user ON payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_course ON payment_records(course_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_provider_id ON payment_records(provider_payment_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_records_provider_session ON payment_records(provider_session_id) WHERE provider_session_id IS NOT NULL;

-- 2. RLS
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- Usuário vê próprios pagamentos
CREATE POLICY "Users view own payments" ON payment_records 
  FOR SELECT USING (user_id = auth.uid());

-- Admins gerenciam todos
CREATE POLICY "Admins manage payments" ON payment_records 
  FOR ALL USING (public.get_user_role() = 'ADMIN');

-- Service Role para webhook
CREATE POLICY "Service Role manages payments" ON payment_records 
  FOR ALL USING (auth.role() = 'service_role');

-- 3. Função para criar matrícula após pagamento aprovado
CREATE OR REPLACE FUNCTION create_enrollment_after_payment(
  p_user_id UUID,
  p_course_id UUID,
  p_payment_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Verificar se já existe matrícula
  SELECT EXISTS(SELECT 1 FROM course_enrollments WHERE user_id = p_user_id AND course_id = p_course_id) INTO v_exists;
  
  IF NOT v_exists THEN
    INSERT INTO course_enrollments (user_id, course_id, enrolled_at)
    VALUES (p_user_id, p_course_id, now());
  END IF;
  
  -- Atualizar payment_records com referência à matrícula
  UPDATE payment_records 
  SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{enrollment_created}', 'true')
  WHERE id = p_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Trigger para criar matrícula automaticamente quando payment_records.status = 'paid'
CREATE OR REPLACE FUNCTION trigger_create_enrollment_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM create_enrollment_after_payment(NEW.user_id, NEW.course_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS create_enrollment_on_payment_paid ON payment_records;
DROP TRIGGER IF EXISTS create_enrollment_on_payment_paid ON payment_records;
CREATE TRIGGER create_enrollment_on_payment_paid
  AFTER UPDATE ON payment_records
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_enrollment_on_payment();

-- 5. Adicionar coluna assistido_segundos em lesson_progress (para Item 19)
ALTER TABLE lesson_progress 
ADD COLUMN IF NOT EXISTS assistido_segundos INTEGER DEFAULT 0;

-- 6. Adicionar coluna materials em lessons (JSONB para materiais de apoio)
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS materials JSONB DEFAULT '[]';

-- 7. Tabela lesson_notes (anotações do aluno)
CREATE TABLE IF NOT EXISTS lesson_notes (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, lesson_id)
);

DROP TRIGGER IF EXISTS update_lesson_notes_modtime ON lesson_notes;
CREATE TRIGGER update_lesson_notes_modtime 
  BEFORE UPDATE ON lesson_notes 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notes" ON lesson_notes;
CREATE POLICY "Users manage own notes" ON lesson_notes 
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all notes" ON lesson_notes;
CREATE POLICY "Admins manage all notes" ON lesson_notes 
  FOR ALL USING (public.get_user_role() = 'ADMIN');