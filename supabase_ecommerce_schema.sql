-- ==============================================================================
-- SUPABASE SCHEMA - MÓDULO E-COMMERCE (ESTOQUE & AFILIADOS)
-- ==============================================================================
-- Instruções:
-- Execute este arquivo no SQL Editor do Supabase para adicionar as tabelas de Loja.
-- ==============================================================================

-- 1. Tipos Enum
CREATE TYPE product_type AS ENUM ('LOCAL_STOCK', 'AFFILIATE_ML');
CREATE TYPE order_status AS ENUM ('PENDING_PAYMENT', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED');
CREATE TYPE shipping_type AS ENUM ('MOTOBOY', 'CORREIOS', 'JADLOG', 'RETIRADA');

-- 2. Tabela de Produtos
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type product_type NOT NULL DEFAULT 'AFFILIATE_ML',
    
    -- Campos comuns
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

    -- Campos para Afiliados (Mercado Livre)
    ml_link TEXT,
    
    -- Campos para Estoque Físico Local (Maison, Mirra)
    price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    weight_kg DECIMAL(5,3) DEFAULT 0.500, -- Para cálculo de frete
    length_cm INTEGER DEFAULT 20,
    width_cm INTEGER DEFAULT 15,
    height_cm INTEGER DEFAULT 10
);

-- Gatilho para atualizar updated_at nos produtos
CREATE TRIGGER update_products_modtime
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 3. Tabela de Pedidos (Para produtos de Estoque Físico)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Se houver login de cliente
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    customer_cpf TEXT,
    
    -- Endereço
    shipping_cep TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_number TEXT NOT NULL,
    shipping_complement TEXT,
    shipping_neighborhood TEXT,
    shipping_city TEXT NOT NULL,
    shipping_state TEXT NOT NULL,

    -- Detalhes do Frete
    shipping_method shipping_type NOT NULL,
    shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tracking_code TEXT,

    -- Valores e Pagamento
    subtotal DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status order_status NOT NULL DEFAULT 'PENDING_PAYMENT',
    payment_link TEXT, -- Link gerado pelo Mercado Pago
    payment_id TEXT, -- ID da transação no gateway

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Gatilho para atualizar updated_at nos pedidos
CREATE TRIGGER update_orders_modtime
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 4. Itens do Pedido
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL
);

-- 5. RLS (Row Level Security) - Políticas Básicas
-- Produtos visíveis para todos
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Produtos visíveis publicamente" ON products FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam produtos" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Pedidos visíveis para o dono ou admins
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários veem seus próprios pedidos" ON orders FOR SELECT USING (
  customer_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Usuários podem inserir pedidos" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins gerenciam pedidos" ON orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários veem itens de seus pedidos" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE id = order_items.order_id AND (customer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')))
);
CREATE POLICY "Usuários podem inserir itens de pedidos" ON order_items FOR INSERT WITH CHECK (true);
