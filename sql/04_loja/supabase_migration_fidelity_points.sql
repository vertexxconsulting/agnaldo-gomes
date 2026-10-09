
-- Adiciona campos de fidelidade nos servicos
ALTER TABLE salon_services ADD COLUMN IF NOT EXISTS points_reward INTEGER DEFAULT 0;
ALTER TABLE salon_services ADD COLUMN IF NOT EXISTS points_cost INTEGER DEFAULT 0;

-- A tabela salon_customers ja possui a coluna loyalty_points (INTEGER DEFAULT 0)
