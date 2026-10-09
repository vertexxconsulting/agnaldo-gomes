-- ============================================
-- Tabela de cupons de desconto para cursos
-- ============================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
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

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Tabela de produtos de curso (Stripe e Hotmart)
-- ============================================
CREATE TABLE IF NOT EXISTS course_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('stripe', 'hotmart')),
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'brl',
  hotmart_product_id TEXT,
  hotmart_link TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  featured BOOLEAN NOT NULL DEFAULT false,
  original_price NUMERIC(10,2),
  discount_percent INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, type)
);

CREATE TRIGGER update_course_products_updated_at
  BEFORE UPDATE ON course_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Tabela de compras de cursos
-- ============================================
CREATE TABLE IF NOT EXISTS course_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  purchase_type TEXT NOT NULL CHECK (purchase_type IN ('stripe', 'hotmart')),
  purchase_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  purchase_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'brl',
  cupom_code TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, course_id, purchase_type)
);

CREATE TRIGGER update_course_purchases_updated_at
  BEFORE UPDATE ON course_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE course_purchases IS 'Registro de compras de cursos (Stripe ou Hotmart)';
COMMENT ON COLUMN course_purchases.metadata IS 'Metadados da compra (ex: Stripe session_id, Hotmart link)';
