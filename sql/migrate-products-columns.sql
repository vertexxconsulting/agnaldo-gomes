-- ==========================================
-- MIGRAÇÃO SQL: Colunas extras para produtos
-- Tabela: public.products
-- Projeto: Agnaldo Gomes - Loja
-- Data: 2026-09-22
--
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/nbxikhiwdzllhgypkfyw/sql/editor
-- ==========================================

-- 1. featured (boolean) - Controla se o produto aparece na seção "Destaques AG"
--    Na loja: filtra produtos com featured=true para mostrar na seção de destaques
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

-- 2. tagline (text) - Badge opcional no card do produto
--    Na loja: mostra um badge pequeno com o texto (ex: "O mais vendido", "Edição especial")
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tagline text NULL;

-- 3. rating (numeric 3,1) - Avaliação média do produto
--    Na loja: exibe ★ {rating} ({reviews}) no card
--    Exemplo: rating=4.8 é armazenado como 4.8 no tipo numeric(3,1)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS rating numeric(3,1) NULL;

-- 4. reviews (integer) - Quantidade de avaliações/resenhas
--    Na loja: exibe junto com o rating no card do produto
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS reviews integer NULL DEFAULT 0;

-- ==========================================
-- VERIFICAÇÃO
-- ==========================================
-- Após rodar os comandos acima, execute para confirmar:
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND table_schema = 'public'
ORDER BY ordinal_position;
