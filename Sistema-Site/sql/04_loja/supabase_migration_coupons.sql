-- ==============================================================================
-- MIGRAÇÃO: Cupons de Desconto (Loja + Academy)
-- ==============================================================================
-- Execute no SQL Editor do Supabase

-- 1. Tabela coupons
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- 'percent' | 'fixed'
  value DECIMAL(10,2) NOT NULL, -- percentual (0-100) ou valor fixo
  min_order DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER, -- NULL = ilimitado
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  valid_until TIMESTAMPTZ,
  applicable_to TEXT NOT NULL DEFAULT 'all', -- 'shop' | 'academy' | 'all'
  course_ids UUID[], -- se applicable_to = 'academy', quais cursos
  product_ids UUID[], -- se applicable_to = 'shop', quais produtos
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS update_coupons_modtime ON coupons;
CREATE TRIGGER update_coupons_modtime 
  BEFORE UPDATE ON coupons 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, valid_from, valid_until);

-- 2. RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Todos veem cupons ativos e válidos (para validação no checkout)
DROP POLICY IF EXISTS "Active coupons visible for validation" ON coupons;
CREATE POLICY "Active coupons visible for validation" ON coupons 
  FOR SELECT USING (
    is_active = true 
    AND valid_from <= now() 
    AND (valid_until IS NULL OR valid_until >= now())
  );

-- Admins gerenciam todos
DROP POLICY IF EXISTS "Admins manage coupons" ON coupons;
CREATE POLICY "Admins manage coupons" ON coupons 
  FOR ALL USING (public.get_user_role() = 'ADMIN');

-- 3. Função para validar e aplicar cupom
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code TEXT,
  p_subtotal DECIMAL(10,2),
  p_context TEXT, -- 'shop' | 'academy'
  p_course_id UUID DEFAULT NULL,
  p_product_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  valid BOOLEAN,
  discount DECIMAL(10,2),
  error TEXT,
  coupon_id UUID,
  coupon_code TEXT,
  coupon_type TEXT,
  coupon_value DECIMAL(10,2)
) AS $$
DECLARE
  v_coupon RECORD;
  v_applicable BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_coupon
  FROM coupons
  WHERE code = upper(p_code)
    AND is_active = true
    AND valid_from <= now()
    AND (valid_until IS NULL OR valid_until >= now())
    AND (max_uses IS NULL OR used_count < max_uses);

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Cupom inválido, expirado ou esgotado', NULL, NULL, NULL, NULL;
    RETURN;
  END IF;

  -- Verificar valor mínimo
  IF p_subtotal < v_coupon.min_order THEN
    RETURN QUERY SELECT false, 0, 'Valor mínimo do pedido não atingido', NULL, NULL, NULL, NULL;
    RETURN;
  END IF;

  -- Verificar aplicabilidade
  IF v_coupon.applicable_to = 'all' THEN
    v_applicable := TRUE;
  ELSIF v_coupon.applicable_to = 'shop' AND p_context = 'shop' THEN
    IF v_coupon.product_ids IS NULL OR array_length(v_coupon.product_ids, 1) IS NULL OR p_product_ids IS NULL THEN
      v_applicable := TRUE;
    ELSE
      v_applicable := (SELECT bool_or(pid = ANY(v_coupon.product_ids)) FROM unnest(p_product_ids) AS pid);
    END IF;
  ELSIF v_coupon.applicable_to = 'academy' AND p_context = 'academy' THEN
    IF v_coupon.course_ids IS NULL OR array_length(v_coupon.course_ids, 1) IS NULL OR p_course_id IS NULL THEN
      v_applicable := TRUE;
    ELSE
      v_applicable := (p_course_id = ANY(v_coupon.course_ids));
    END IF;
  END IF;

  IF NOT v_applicable THEN
    RETURN QUERY SELECT false, 0, 'Cupom não aplicável a este pedido', NULL, NULL, NULL, NULL;
    RETURN;
  END IF;

  -- Calcular desconto
  DECLARE v_discount DECIMAL(10,2);
  BEGIN
    IF v_coupon.type = 'percent' THEN
      v_discount := (p_subtotal * v_coupon.value / 100)::DECIMAL(10,2);
    ELSE
      v_discount := LEAST(v_coupon.value, p_subtotal);
    END IF;
  END;

  RETURN QUERY SELECT true, v_discount, NULL, v_coupon.id, v_coupon.code, v_coupon.type, v_coupon.value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Função para incrementar uso do cupom
CREATE OR REPLACE FUNCTION increment_coupon_usage(p_coupon_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE coupons
  SET used_count = used_count + 1
  WHERE id = p_coupon_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;