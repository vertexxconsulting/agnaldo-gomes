-- 1. Tabela para registrar a "Comanda Digital" do Atendimento (Insumos e Produtos Upsell)
CREATE TABLE IF NOT EXISTS salon_appointment_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES salon_appointments(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES salon_inventory(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('INSUMO', 'PRODUTO')),
  qty DECIMAL(10,2) NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL DEFAULT 0, -- R$ 0 para insumo, valor do produto para venda/upsell
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Um insumo específico só deve aparecer uma vez na comanda por atendimento (pode ser atualizado)
  UNIQUE(appointment_id, inventory_id, type)
);

-- Habilitar RLS
ALTER TABLE salon_appointment_items ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Full access interno)
CREATE POLICY "Full access to salon_appointment_items for authenticated users"
  ON salon_appointment_items FOR ALL 
  USING (auth.role() = 'authenticated');
