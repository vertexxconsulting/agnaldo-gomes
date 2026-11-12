-- Adiciona colunas para suporte a preço promocional (De: / Por:) e percentual de desconto
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS discount_pct INTEGER;
