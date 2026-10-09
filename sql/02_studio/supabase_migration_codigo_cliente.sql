-- Adicionar coluna de código ao cliente
ALTER TABLE salon_customers ADD COLUMN IF NOT EXISTS codigo integer;

-- Extrair os códigos que estão na coluna notes e atualizar a nova coluna (codigo)
-- O padrão no notes está como: Código: 7323 | Cliente desde ...
UPDATE salon_customers
SET codigo = CAST(SUBSTRING(notes FROM 'Código:\s*([0-9]+)') AS integer)
WHERE notes LIKE '%Código:%';

-- Limpar o "Código: XXXX | " da coluna notes
UPDATE salon_customers
SET notes = REGEXP_REPLACE(notes, 'Código:\s*[0-9]+\s*\|\s*', '')
WHERE notes LIKE '%Código:%';

-- Limpar o "Código: XXXX" se não tiver a barra vertical
UPDATE salon_customers
SET notes = REGEXP_REPLACE(notes, 'Código:\s*[0-9]+\s*', '')
WHERE notes LIKE '%Código:%';

-- Para que os novos clientes recebam um código sequencial automático, 
-- criamos uma sequência baseada no maior código atual
DO $$
DECLARE
    max_id integer;
BEGIN
    SELECT COALESCE(MAX(codigo), 0) INTO max_id FROM salon_customers;
    
    -- Criar a sequência caso não exista
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'salon_customers_codigo_seq') THEN
        EXECUTE 'CREATE SEQUENCE salon_customers_codigo_seq';
    END IF;
    
    -- Ajustar o valor inicial da sequência
    EXECUTE 'ALTER SEQUENCE salon_customers_codigo_seq RESTART WITH ' || (max_id + 1);
    
    -- Configurar a coluna para usar a sequência por padrão
    ALTER TABLE salon_customers ALTER COLUMN codigo SET DEFAULT nextval('salon_customers_codigo_seq');
END $$;
