-- ==============================================================================
-- MIGRATION: ESTOQUE DO SALÃO
-- Execute no SQL Editor do Supabase
-- ==============================================================================

-- 1. Tabela principal do estoque
CREATE TABLE IF NOT EXISTS salon_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT NOT NULL DEFAULT 'Geral',
    unit TEXT NOT NULL DEFAULT 'g',              -- 'g' | 'ml' | 'un'
    stock_qty DECIMAL(10,3) NOT NULL DEFAULT 0,
    stock_alert_qty DECIMAL(10,3) DEFAULT 50,
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    sale_price DECIMAL(10,2),                    -- preço de venda direta (null = só insumo)
    price_per_gram DECIMAL(10,6),                -- custo por grama/ml (calculado)
    allow_sale BOOLEAN DEFAULT false,
    allow_procedure_use BOOLEAN DEFAULT true,
    active BOOLEAN DEFAULT true,
    image_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER update_salon_inventory_modtime
BEFORE UPDATE ON salon_inventory
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Habilitar RLS
ALTER TABLE salon_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access salon_inventory" ON salon_inventory
    USING (true) WITH CHECK (true);

-- 2. Movimentações de estoque
CREATE TABLE IF NOT EXISTS salon_inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID REFERENCES salon_inventory(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('IN', 'OUT_SALE', 'OUT_PROCEDURE', 'ADJUSTMENT')),
    qty DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,6),
    appointment_id UUID REFERENCES salon_appointments(id) ON DELETE SET NULL,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE salon_inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access salon_inventory_movements" ON salon_inventory_movements
    USING (true) WITH CHECK (true);

-- 3. Vínculo Serviço ↔ Produto (quais produtos são usados em cada serviço)
CREATE TABLE IF NOT EXISTS salon_service_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES salon_services(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES salon_inventory(id) ON DELETE CASCADE,
    default_qty_g DECIMAL(10,3) DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    UNIQUE(service_id, inventory_id)
);

ALTER TABLE salon_service_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access salon_service_products" ON salon_service_products
    USING (true) WITH CHECK (true);

-- 4. Adicionar colunas ao salon_appointments para registrar insumos e pagamento
ALTER TABLE salon_appointments
    ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS installments INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS product_cost DECIMAL(10,2) DEFAULT 0;

-- ==============================================================================
-- FIM DA MIGRATION: ESTOQUE DO SALÃO
-- ==============================================================================
