CREATE TABLE IF NOT EXISTS caixa_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(10,2),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
  opened_by VARCHAR(255),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id UUID REFERENCES caixa_diario(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL, -- 'INCOME', 'EXPENSE'
  category VARCHAR(50) NOT NULL, -- 'BILLS', 'PAYROLL', 'MAINTENANCE', 'SUPPLIES', 'OTHER'
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_method VARCHAR(50), -- 'PIX', 'DINHEIRO', 'CARTAO', 'TRANSFERENCIA'
  status VARCHAR(20) DEFAULT 'PAID' -- 'PAID', 'PENDING'
);
