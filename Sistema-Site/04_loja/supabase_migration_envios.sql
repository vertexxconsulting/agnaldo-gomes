-- ============================================================
-- MIGRATION: Sistema de Envios da Loja (Melhor Envio + Motoboy)
-- Executar no Supabase SQL Editor (uma única vez).
-- ============================================================

-- 1. PESO E DIMENSÕES DOS PRODUTOS (necessários p/ cotação e etiqueta)
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg numeric DEFAULT 0.5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS width_cm int DEFAULT 16;
ALTER TABLE products ADD COLUMN IF NOT EXISTS height_cm int DEFAULT 8;
ALTER TABLE products ADD COLUMN IF NOT EXISTS length_cm int DEFAULT 24;

-- 1b. SERVICE ID do Melhor Envio escolhido no checkout (p/ emissão da etiqueta)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_service_id text;

-- 2. CONFIGURAÇÃO DE ENVIO DA LOJA (linha única, id = true)
CREATE TABLE IF NOT EXISTS shipping_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  melhor_envio_token text DEFAULT '',
  melhor_envio_sandbox boolean DEFAULT false,
  cep_origem text DEFAULT '84268030',
  remetente_nome text DEFAULT 'Studio Agnaldo Gomes',
  remetente_endereco text DEFAULT '',
  remetente_numero text DEFAULT '',
  remetente_bairro text DEFAULT '',
  remetente_cidade text DEFAULT 'Campo Mourão',
  remetente_estado text DEFAULT 'PR',
  remetente_email text DEFAULT '',
  remetente_cpf_cnpj text DEFAULT '',
  frete_gratis boolean DEFAULT false,
  frete_gratis_acima_de numeric DEFAULT 0,
  valor_motoboy numeric DEFAULT 15,
  prazo_manuseio int DEFAULT 1,
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

INSERT INTO shipping_config (id) VALUES (true) ON CONFLICT DO NOTHING;

-- RLS: leitura/escrita apenas para ADMIN (rotas públicas usam service role)
ALTER TABLE shipping_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage shipping_config" ON shipping_config
  FOR ALL USING (public.get_user_role() = 'ADMIN');
