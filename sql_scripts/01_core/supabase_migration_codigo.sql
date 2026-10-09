-- Criação de um campo 'codigo' com auto incremento (serial) que permite inserção manual
-- Caso a coluna 'codigo' não exista, vamos adicioná-la.

ALTER TABLE public.salon_customers ADD COLUMN IF NOT EXISTS codigo INT;

-- Vamos criar uma sequence para gerenciar o auto-incremento do código
CREATE SEQUENCE IF NOT EXISTS salon_customers_codigo_seq;

-- Se já existirem dados na tabela e a coluna foi recém-adicionada, vamos atualizar 
-- a sequence para o maior código atual (se houver), ou 1.
DO $$
DECLARE
    max_cod INT;
BEGIN
    SELECT MAX(codigo) INTO max_cod FROM public.salon_customers;
    IF max_cod IS NOT NULL THEN
        PERFORM setval('salon_customers_codigo_seq', max_cod);
    END IF;
END $$;

-- Define o valor padrão da coluna para usar a sequence
ALTER TABLE public.salon_customers ALTER COLUMN codigo SET DEFAULT nextval('salon_customers_codigo_seq');

-- Adicionar um índice para buscas rápidas por código
CREATE INDEX IF NOT EXISTS idx_salon_customers_codigo ON public.salon_customers(codigo);
