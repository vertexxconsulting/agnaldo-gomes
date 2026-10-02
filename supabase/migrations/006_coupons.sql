-- ============================================
-- Cupons de desconto para cursos do Academy
-- ============================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(8,2) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,
  max_uses INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- ============================================
-- Inserir cupons de exemplo (ajustar depois)
-- ============================================
INSERT INTO coupons (code, description, discount_type, discount_value, valid_until, max_uses, course_id, active)
VALUES
  ('PREVIEW2026', 'Desconto de pré-venda para novos alunos', 'percent', 20.00, NOW() + INTERVAL '30 days', 100, NULL, true),
  ('BOMVEM', 'Promoção de início de ano letivo', 'percent', 15.00, NOW() + INTERVAL '60 days', 50, NULL, true),
  ('FATURAMENTO', 'Desconto fixo para faturamento especial', 'fixed', 10.00, NOW() + INTERVAL '15 days', 20, NULL, true)
ON CONFLICT (code) DO NOTHING;
