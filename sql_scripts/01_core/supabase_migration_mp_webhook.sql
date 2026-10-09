-- ==============================================================================
-- MIGRAÇÃO: Tabela mp_webhook_logs (Idempotência Webhook Mercado Pago - Loja)
-- ==============================================================================
-- Execute no SQL Editor do Supabase ANTES de configurar o webhook no painel MP.
-- ==============================================================================

-- Tabela para registrar cada notificação processada do Mercado Pago
-- O UNIQUE em payment_id garante idempotência (processar apenas uma vez por pagamento)
CREATE TABLE IF NOT EXISTS mp_webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id TEXT NOT NULL,
  topic TEXT,                        -- 'payment', 'merchant_order', etc.
  action TEXT,                       -- 'payment.created', 'payment.updated', etc.
  status TEXT,                       -- status do payment no MP: approved, rejected, etc.
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  payload JSONB,                     -- payload completo recebido do MP
  processed_at TIMESTAMPTZ,          -- null até ser processado com sucesso
  error_message TEXT,                -- se houve erro no processamento
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  CONSTRAINT mp_webhook_logs_payment_id_unique UNIQUE (payment_id)
);

-- Índices para consulta rápida
CREATE INDEX IF NOT EXISTS idx_mp_webhook_logs_payment_id ON mp_webhook_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_mp_webhook_logs_order_id ON mp_webhook_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_mp_webhook_logs_created_at ON mp_webhook_logs(created_at DESC);

-- RLS: Apenas admins podem consultar os logs de webhook
ALTER TABLE mp_webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage mp_webhook_logs" ON mp_webhook_logs;
CREATE POLICY "Admins manage mp_webhook_logs"
  ON mp_webhook_logs FOR ALL
  USING (public.get_user_role() = 'ADMIN');

-- Permitir service role (usado pelo webhook server-side) inserir/atualizar sem restrição
DROP POLICY IF EXISTS "Service role manages mp_webhook_logs" ON mp_webhook_logs;
CREATE POLICY "Service role manages mp_webhook_logs"
  ON mp_webhook_logs FOR ALL
  USING (auth.role() = 'service_role');
