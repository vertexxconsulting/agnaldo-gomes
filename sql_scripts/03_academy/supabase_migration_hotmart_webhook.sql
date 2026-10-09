-- Tabela de idempotência para webhooks da Hotmart
CREATE TABLE IF NOT EXISTS public.hotmart_webhook_events (
    transaction_id TEXT PRIMARY KEY,
    event_type TEXT,
    hottok_used TEXT,
    buyer_email TEXT,
    product_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS
ALTER TABLE public.hotmart_webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy (apenas admin/service_role)
CREATE POLICY "Enable ALL access for admins" ON public.hotmart_webhook_events FOR ALL USING (public.get_user_role() = 'ADMIN');

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_hotmart_webhook_events_email ON public.hotmart_webhook_events(buyer_email);
CREATE INDEX IF NOT EXISTS idx_hotmart_webhook_events_created ON public.hotmart_webhook_events(created_at);
