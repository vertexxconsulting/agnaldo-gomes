-- Adicionar comissão de produtos aos profissionais
ALTER TABLE salon_professionals 
ADD COLUMN IF NOT EXISTS product_commission_pct DECIMAL(5,2) DEFAULT 0.00;

-- Adicionar link de afiliado aos pedidos (orders)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES salon_professionals(id) ON DELETE SET NULL;

-- Criar tabela de taxas de pagamento (Maquininha / Gateway)
CREATE TABLE IF NOT EXISTS payment_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- Ex: 'Visa Crédito', 'Mastercard Débito', 'Pix', 'Asaas Boleto'
    payment_type TEXT NOT NULL, -- 'credito', 'debito', 'pix', 'dinheiro', 'boleto'
    fee_percentage DECIMAL(5,2) DEFAULT 0.00, -- Ex: 3.50 para 3.5%
    fee_fixed DECIMAL(10,2) DEFAULT 0.00, -- Ex: 0.99 para R$0,99 por transação
    days_to_receive INTEGER DEFAULT 1, -- Quantos dias para cair na conta (D+1, D+30)
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Trigger para updated_at
CREATE TRIGGER update_payment_fees_modtime 
BEFORE UPDATE ON payment_fees 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Inserir algumas taxas padrões
INSERT INTO payment_fees (name, payment_type, fee_percentage, fee_fixed, days_to_receive)
VALUES 
    ('Dinheiro', 'dinheiro', 0.00, 0.00, 0),
    ('Pix', 'pix', 0.99, 0.00, 0), -- Exemplo genérico
    ('Crédito à Vista', 'credito', 3.19, 0.00, 30),
    ('Crédito Parcelado', 'credito', 3.79, 0.00, 30),
    ('Débito', 'debito', 1.99, 0.00, 1)
ON CONFLICT DO NOTHING;
