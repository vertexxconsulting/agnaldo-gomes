-- Adiciona % de comissão padrão no serviço
ALTER TABLE salon_services ADD COLUMN IF NOT EXISTS default_commission_pct DECIMAL(5,2) DEFAULT 40.00;

-- Script para inserir regras de comissão para vínculos já existentes
-- Ele pega todos os serviços que os profissionais já fazem hoje
-- E cria uma regra de comissão usando a "comissão padrão do serviço" (ou 40.00 se for null)
-- Apenas se a regra ainda NÃO existir
INSERT INTO salon_commission_rules (professional_id, service_id, commission_pct, active)
SELECT 
    ps.professional_id, 
    ps.service_id, 
    COALESCE(s.default_commission_pct, 40.00) as commission_pct, 
    true as active
FROM salon_professional_services ps
JOIN salon_services s ON s.id = ps.service_id
WHERE NOT EXISTS (
    SELECT 1 
    FROM salon_commission_rules r 
    WHERE r.professional_id = ps.professional_id 
      AND r.service_id = ps.service_id
);
