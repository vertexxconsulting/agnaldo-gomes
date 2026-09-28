-- ==============================================================================
-- MIGRAÇÃO: Notificações (push, email, WhatsApp)
-- ==============================================================================
-- Execute no SQL Editor do Supabase

-- 1. Tabela notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'appointment_confirmed', 'payment_approved', 'lesson_published', 'reminder_24h', 'certificate_issued', etc.
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- dados extras: { appointment_id, course_id, order_id, etc. }
  channels TEXT[] DEFAULT ARRAY['in_app'], -- 'in_app', 'email', 'whatsapp', 'push'
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 2. Tabela notification_preferences (preferências do usuário)
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT TRUE,
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT TRUE,
  appointment_reminders BOOLEAN DEFAULT TRUE,
  payment_notifications BOOLEAN DEFAULT TRUE,
  course_updates BOOLEAN DEFAULT TRUE,
  marketing BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS update_notification_preferences_modtime ON notification_preferences;
CREATE TRIGGER update_notification_preferences_modtime 
  BEFORE UPDATE ON notification_preferences 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 3. RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Usuário vê próprias notificações
DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
CREATE POLICY "Users view own notifications" ON notifications 
  FOR SELECT USING (user_id = auth.uid());

-- Usuário marca como lida
DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications 
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Admins veem/gerenciam todas
DROP POLICY IF EXISTS "Admins manage notifications" ON notifications;
CREATE POLICY "Admins manage notifications" ON notifications 
  FOR ALL USING (public.get_user_role() = 'ADMIN');

-- Service Role para triggers/inserção
DROP POLICY IF EXISTS "Service Role manages notifications" ON notifications;
CREATE POLICY "Service Role manages notifications" ON notifications 
  FOR ALL USING (auth.role() = 'service_role');

-- Preferences
DROP POLICY IF EXISTS "Users manage own preferences" ON notification_preferences;
CREATE POLICY "Users manage own preferences" ON notification_preferences 
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins view preferences" ON notification_preferences;
CREATE POLICY "Admins view preferences" ON notification_preferences 
  FOR SELECT USING (public.get_user_role() = 'ADMIN');

-- 4. Trigger automático para criar preferências ao criar usuário
CREATE OR REPLACE FUNCTION create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS create_notification_prefs ON profiles;
DROP TRIGGER IF EXISTS create_notification_prefs ON profiles;
CREATE TRIGGER create_notification_prefs
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_preferences();

-- 5. Função helper para criar notificação
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}',
  p_channels TEXT[] DEFAULT ARRAY['in_app']
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_prefs RECORD;
  v_final_channels TEXT[] := p_channels;
BEGIN
  -- Buscar preferências do usuário
  SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = p_user_id;
  
  IF FOUND THEN
    -- Filtrar canais baseado nas preferências
    IF NOT v_prefs.email_enabled THEN
      v_final_channels := array_remove(v_final_channels, 'email');
    END IF;
    IF NOT v_prefs.whatsapp_enabled THEN
      v_final_channels := array_remove(v_final_channels, 'whatsapp');
    END IF;
    IF NOT v_prefs.push_enabled THEN
      v_final_channels := array_remove(v_final_channels, 'push');
    END IF;
    
    -- Verificar tipo específico
    IF p_type = 'appointment_confirmed' AND NOT v_prefs.appointment_reminders THEN
      v_final_channels := array_remove(v_final_channels, 'email');
      v_final_channels := array_remove(v_final_channels, 'whatsapp');
    END IF;
    IF p_type = 'payment_approved' AND NOT v_prefs.payment_notifications THEN
      v_final_channels := array_remove(v_final_channels, 'email');
      v_final_channels := array_remove(v_final_channels, 'whatsapp');
    END IF;
    IF p_type = 'lesson_published' AND NOT v_prefs.course_updates THEN
      v_final_channels := array_remove(v_final_channels, 'email');
      v_final_channels := array_remove(v_final_channels, 'whatsapp');
    END IF;
    IF p_type = 'marketing' AND NOT v_prefs.marketing THEN
      v_final_channels := '{}';
    END IF;
  END IF;

  -- Inserir notificação
  INSERT INTO notifications (user_id, type, title, body, data, channels)
  VALUES (p_user_id, p_type, p_title, p_body, p_data, v_final_channels)
  RETURNING id INTO v_notification_id;

  -- TODO: Enviar via canais externos (email, WhatsApp, push) via Edge Function ou worker
  -- Por enquanto, apenas in_app é processado automaticamente
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Triggers automáticos para eventos comuns
-- Trigger: Agendamento confirmado
CREATE OR REPLACE FUNCTION trigger_appointment_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'CONFIRMED' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM create_notification(
      (SELECT user_id FROM salon_customers WHERE id = NEW.customer_id),
      'appointment_confirmed',
      'Agendamento Confirmado ✅',
      'Seu agendamento para ' || (SELECT name FROM salon_services WHERE id = NEW.service_id) || ' foi confirmado!',
      jsonb_build_object('appointment_id', NEW.id, 'service_id', NEW.service_id),
      ARRAY['in_app', 'email', 'whatsapp']
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS notify_appointment_confirmed ON salon_appointments;
DROP TRIGGER IF EXISTS notify_appointment_confirmed ON salon_appointments;
CREATE TRIGGER notify_appointment_confirmed
  AFTER UPDATE ON salon_appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_appointment_confirmed();

-- Trigger: Nova aula publicada
CREATE OR REPLACE FUNCTION trigger_lesson_published()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'PUBLISHED' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Notificar alunos matriculados no curso
    PERFORM create_notification(
      ce.user_id,
      'lesson_published',
      'Nova Aula Disponível 🎓',
      'A aula "' || NEW.title || '" foi publicada no curso ' || c.title,
      jsonb_build_object('lesson_id', NEW.id, 'course_id', c.id),
      ARRAY['in_app', 'email']
    )
    FROM course_enrollments ce
    JOIN courses c ON c.id = ce.course_id
    JOIN modules m ON m.id = NEW.module_id
    WHERE m.course_id = c.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Nota: courses não tem coluna status 'PUBLISHED' no schema atual, apenas lessons
-- Este trigger seria em lessons se tivessem status