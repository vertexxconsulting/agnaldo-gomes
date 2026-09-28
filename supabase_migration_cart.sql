-- ==============================================================================
-- MIGRAÇÃO: Tabelas Carrinho da Loja (server-side)
-- ==============================================================================
-- Execute no SQL Editor do Supabase

-- 1. Tabela carts
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT, -- para carrinhos anônimos
  status TEXT NOT NULL DEFAULT 'active', -- active, converted, abandoned
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

DROP TRIGGER IF EXISTS update_carts_modtime ON carts;
CREATE TRIGGER update_carts_modtime 
  BEFORE UPDATE ON carts 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id);
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status);

-- 2. Tabela cart_items
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE(cart_id, product_id)
);

DROP TRIGGER IF EXISTS update_cart_items_modtime ON cart_items;
CREATE TRIGGER update_cart_items_modtime 
  BEFORE UPDATE ON cart_items 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id);

-- 3. RLS
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Carrinho do usuário logado
DROP POLICY IF EXISTS "Users view own cart" ON carts;
CREATE POLICY "Users view own cart" ON carts 
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own cart" ON carts;
CREATE POLICY "Users insert own cart" ON carts 
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own cart" ON carts;
CREATE POLICY "Users update own cart" ON carts 
  FOR UPDATE USING (user_id = auth.uid());

-- Carrinho anônimo via session_id (apenas para leitura/criação via API)
DROP POLICY IF EXISTS "Anon cart by session" ON carts;
CREATE POLICY "Anon cart by session" ON carts 
  FOR SELECT USING (session_id IS NOT NULL AND user_id IS NULL);

-- Service Role para webhooks/cleanup
DROP POLICY IF EXISTS "Service Role manages carts" ON carts;
CREATE POLICY "Service Role manages carts" ON carts 
  FOR ALL USING (auth.role() = 'service_role');

-- Cart items
DROP POLICY IF EXISTS "Users view own cart items" ON cart_items;
CREATE POLICY "Users view own cart items" ON cart_items 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users manage own cart items" ON cart_items;
CREATE POLICY "Users manage own cart items" ON cart_items 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Service Role manages cart items" ON cart_items;
CREATE POLICY "Service Role manages cart items" ON cart_items 
  FOR ALL USING (auth.role() = 'service_role');