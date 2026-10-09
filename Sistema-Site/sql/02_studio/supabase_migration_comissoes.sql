-- ==============================================================================
-- MIGRATION: COMISSÕES DE PROFISSIONAIS
-- Execute no SQL Editor do Supabase (após supabase_migration_estoque.sql)
-- ==============================================================================

-- 1. Regras de comissão por profissional (e opcionalmente por serviço)
CREATE TABLE IF NOT EXISTS salon_commission_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID REFERENCES salon_professionals(id) ON DELETE CASCADE,
    service_id UUID REFERENCES salon_services(id) ON DELETE SET NULL,  -- null = regra geral
    commission_pct DECIMAL(5,2) NOT NULL DEFAULT 40.00,
    active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(professional_id, service_id)
);

CREATE TRIGGER update_salon_commission_rules_modtime
BEFORE UPDATE ON salon_commission_rules
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE salon_commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access salon_commission_rules" ON salon_commission_rules
    USING (true) WITH CHECK (true);

-- 2. Registro de comissões geradas por atendimento
CREATE TABLE IF NOT EXISTS salon_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES salon_appointments(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES salon_professionals(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,        -- valor total do atendimento
    commission_pct DECIMAL(5,2) NOT NULL,        -- % aplicada
    total_commission DECIMAL(10,2) NOT NULL,     -- valor total da comissão
    installments INT NOT NULL DEFAULT 1,         -- número de parcelas
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER update_salon_commissions_modtime
BEFORE UPDATE ON salon_commissions
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE salon_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access salon_commissions" ON salon_commissions
    USING (true) WITH CHECK (true);

-- 3. Parcelas individuais de comissão
CREATE TABLE IF NOT EXISTS salon_commission_installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commission_id UUID REFERENCES salon_commissions(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE salon_commission_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access salon_commission_installments" ON salon_commission_installments
    USING (true) WITH CHECK (true);

-- ==============================================================================
-- FIM DA MIGRATION: COMISSÕES DE PROFISSIONAIS
-- ==============================================================================
