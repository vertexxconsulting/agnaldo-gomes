-- ==============================================================================
-- MIGRAÇÃO: Tabela bolten_webhook_events (Idempotência Webhook Bolten)
-- ==============================================================================
-- Execute no SQL Editor do Supabase para garantir que webhooks duplicados
-- do CRM Bolten não criem registros duplicados no sistema mãe.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS bolten_webhook_events (
  event_id TEXT PRIMARY KEY,         -- X-Bolten-Event-ID ou hash do payload
  event_type TEXT,                   -- tipo do evento (opportunity.created, etc.)
  payload JSONB,                     -- payload completo para debug/auditoria
  processed_at TIMESTAMPTZ,          -- null até ser processado com sucesso
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Índice para limpeza periódica (eventos antigos)
CREATE INDEX IF NOT EXISTS idx_bolten_webhook_events_created_at
  ON bolten_webhook_events(created_at DESC);

-- RLS: Apenas admins e service role
ALTER TABLE bolten_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage bolten_webhook_events" ON bolten_webhook_events;
CREATE POLICY "Admins manage bolten_webhook_events"
  ON bolten_webhook_events FOR ALL
  USING (public.get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "Service role manages bolten_webhook_events" ON bolten_webhook_events;
CREATE POLICY "Service role manages bolten_webhook_events"
  ON bolten_webhook_events FOR ALL
  USING (auth.role() = 'service_role');
