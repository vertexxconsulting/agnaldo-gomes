-- ==============================================================================
-- MIGRAÇÃO: Tabela stripe_webhook_events para idempotência
-- ==============================================================================
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service Role manages stripe events" ON stripe_webhook_events;
CREATE POLICY "Service Role manages stripe events" ON stripe_webhook_events 
  FOR ALL USING (auth.role() = 'service_role');