-- ============================================
-- Tabela de registros de compra de cursos
-- (para controle interno do Academy)
-- ============================================
CREATE TABLE IF NOT EXISTS course_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  purchase_type TEXT NOT NULL CHECK (purchase_type IN ('stripe', 'hotmart', 'manual')),
  purchase_reference TEXT,               -- PaymentIntent ID, Hotmart order ID, etc.
  purchase_amount NUMERIC(10,2),        -- valor pago
  currency TEXT NOT NULL DEFAULT 'brl',
  cupom_code TEXT,                       -- cupom aplicado, se houver
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'refunded', 'failed')),
  acquisition_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  refund_date TIMESTAMPTZ,
  metadata JSONB,
  UNIQUE(user_id, course_id, purchase_type)
);

CREATE INDEX IF NOT EXISTS idx_course_purchases_user_course ON course_purchases(user_id, course_id);

-- ============================================
-- Trigger de atualização de metadata em compras
-- ============================================
CREATE OR REPLACE FUNCTION trg_course_purchases_defaults()
RETURNS TRIGGER AS $$
BEGIN
  NEW.metadata = COALESCE(NEW.metadata, '{}');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_course_purchases_set_metadata
  BEFORE INSERT ON course_purchases
  FOR EACH ROW
  EXECUTE FUNCTION trg_course_purchases_defaults();
