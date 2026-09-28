-- ==============================================================================
-- MIGRAÇÃO: Tabela de Certificados Academy + RPC para geração automática
-- ==============================================================================
-- Execute no SQL Editor do Supabase

-- 1. Tabela course_certificates
CREATE TABLE IF NOT EXISTS course_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  certificate_number TEXT UNIQUE NOT NULL,
  pdf_url TEXT,
  verification_hash TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued', -- issued, revoked, reissued
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS update_course_certificates_modtime ON course_certificates;
CREATE TRIGGER update_course_certificates_modtime 
  BEFORE UPDATE ON course_certificates 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_course_certificates_user ON course_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_course_certificates_course ON course_certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_course_certificates_verification ON course_certificates(verification_hash);

-- 2. RLS
ALTER TABLE course_certificates ENABLE ROW LEVEL SECURITY;

-- Alunos veem apenas seus próprios certificados
DROP POLICY IF EXISTS "Users view own certificates" ON course_certificates;
CREATE POLICY "Users view own certificates" ON course_certificates 
  FOR SELECT USING (user_id = auth.uid());

-- Admins gerenciam todos
DROP POLICY IF EXISTS "Admins manage certificates" ON course_certificates;
CREATE POLICY "Admins manage certificates" ON course_certificates 
  FOR ALL USING (public.get_user_role() = 'ADMIN');

-- Service Role para geração via RPC
DROP POLICY IF EXISTS "Service Role manages certificates" ON course_certificates;
CREATE POLICY "Service Role manages certificates" ON course_certificates 
  FOR ALL USING (auth.role() = 'service_role');

-- 3. Função para gerar número de certificado único
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
  cert_number TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    cert_number := 'AG-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM course_certificates WHERE certificate_number = cert_number) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN cert_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Função para gerar hash de verificação
CREATE OR REPLACE FUNCTION generate_verification_hash(p_user_id UUID, p_course_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(sha256((p_user_id || p_course_id || now()::text)::bytea), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. RPC para verificar conclusão e emitir certificado
CREATE OR REPLACE FUNCTION check_and_issue_certificate(p_user_id UUID, p_course_id UUID)
RETURNS TABLE (
  certificate_issued BOOLEAN,
  certificate_id UUID,
  certificate_number TEXT,
  pdf_url TEXT,
  verification_hash TEXT
) AS $$
DECLARE
  v_total_lessons INT;
  v_completed_lessons INT;
  v_progress_pct NUMERIC;
  v_existing_cert RECORD;
  v_cert_number TEXT;
  v_verification_hash TEXT;
  v_cert_id UUID;
BEGIN
  -- Verificar se já existe certificado emitido
  SELECT * INTO v_existing_cert 
  FROM course_certificates 
  WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'issued';
  
  IF v_existing_cert IS NOT NULL THEN
    RETURN QUERY SELECT true, v_existing_cert.id, v_existing_cert.certificate_number, v_existing_cert.pdf_url, v_existing_cert.verification_hash;
    RETURN;
  END IF;

  -- Contar total de aulas do curso
  SELECT COUNT(l.*) INTO v_total_lessons
  FROM lessons l
  JOIN modules m ON m.id = l.module_id
  WHERE m.course_id = p_course_id;

  IF v_total_lessons = 0 THEN
    RETURN QUERY SELECT false, NULL, NULL, NULL, NULL;
    RETURN;
  END IF;

  -- Contar aulas concluídas pelo usuário
  SELECT COUNT(*) INTO v_completed_lessons
  FROM lesson_progress lp
  JOIN lessons l ON l.id = lp.lesson_id
  JOIN modules m ON m.id = l.module_id
  WHERE lp.user_id = p_user_id 
    AND m.course_id = p_course_id
    AND lp.completed = true;

  v_progress_pct := (v_completed_lessons::NUMERIC / v_total_lessons) * 100;

  -- Só emite se 100% concluído
  IF v_progress_pct < 100 THEN
    RETURN QUERY SELECT false, NULL, NULL, NULL, NULL;
    RETURN;
  END IF;

  -- Gerar certificado
  v_cert_number := generate_certificate_number();
  v_verification_hash := generate_verification_hash(p_user_id, p_course_id);

  INSERT INTO course_certificates (user_id, course_id, certificate_number, verification_hash)
  VALUES (p_user_id, p_course_id, v_cert_number, v_verification_hash)
  RETURNING id INTO v_cert_id;

  -- TODO: Gerar PDF via Edge Function (pdf-lib ou Puppeteer)
  -- Por enquanto, retorna sem PDF. A geração de PDF será feita via Edge Function separada.

  RETURN QUERY SELECT true, v_cert_id, v_cert_number, NULL, v_verification_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Trigger automático ao marcar aula como concluída
CREATE OR REPLACE FUNCTION trigger_check_certificate_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Só executa quando aula é marcada como concluída (não quando desmarcada)
  IF NEW.completed = true AND (OLD.completed IS DISTINCT FROM NEW.completed) THEN
    -- Buscar course_id da aula
    PERFORM check_and_issue_certificate(NEW.user_id, m.course_id)
    FROM lessons l
    JOIN modules m ON m.id = l.module_id
    WHERE l.id = NEW.lesson_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS check_certificate_on_lesson_complete ON lesson_progress;
DROP TRIGGER IF EXISTS check_certificate_on_lesson_complete ON lesson_progress;
CREATE TRIGGER check_certificate_on_lesson_complete
  AFTER UPDATE ON lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_certificate_on_completion();

-- 7. View para verificação pública de certificado
CREATE OR REPLACE VIEW public_certificate_verification AS
SELECT 
  cc.certificate_number,
  cc.verification_hash,
  cc.issued_at,
  cc.status,
  p.full_name AS aluno_nome,
  c.title AS curso_titulo,
  p.email AS aluno_email
FROM course_certificates cc
JOIN profiles p ON p.id = cc.user_id
JOIN courses c ON c.id = cc.course_id
WHERE cc.status = 'issued';