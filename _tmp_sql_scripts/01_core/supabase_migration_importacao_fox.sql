-- ════════════════════════════════════════════════════════════════
-- Migração: campos extras para importação do sistema FOX
-- Rode no SQL Editor do Supabase ANTES da importação.
-- ════════════════════════════════════════════════════════════════

-- Profissionais: dados cadastrais vindos do FOX
ALTER TABLE salon_professionals ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE salon_professionals ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE salon_professionals ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE salon_professionals ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE salon_professionals ADD COLUMN IF NOT EXISTS role_title text;

-- Estoque: código de barras (EAN) para leitura no caixa
ALTER TABLE salon_inventory ADD COLUMN IF NOT EXISTS barcode text;
CREATE INDEX IF NOT EXISTS idx_salon_inventory_barcode ON salon_inventory (barcode);

-- Clientes: índices para busca rápida com ~7 mil cadastros
CREATE INDEX IF NOT EXISTS idx_salon_customers_phone ON salon_customers (phone);
CREATE INDEX IF NOT EXISTS idx_salon_customers_cpf ON salon_customers (cpf);
CREATE INDEX IF NOT EXISTS idx_salon_customers_name ON salon_customers (lower(name));

NOTIFY pgrst, 'reload schema';
