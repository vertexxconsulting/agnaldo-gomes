-- ==============================================================================
-- MIGRAÇÃO: RPC create_order_with_stock_check + correção RLS course_enrollments
-- ==============================================================================
-- Execute no SQL Editor do Supabase

-- 1. Função RPC para criar pedido com validação de estoque atômica
CREATE OR REPLACE FUNCTION create_order_with_stock_check(
  p_order_id UUID,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_customer_cpf TEXT,
  p_shipping_cep TEXT,
  p_shipping_address TEXT,
  p_shipping_number TEXT,
  p_shipping_complement TEXT,
  p_shipping_neighborhood TEXT,
  p_shipping_city TEXT,
  p_shipping_state TEXT,
  p_shipping_method TEXT,
  p_shipping_cost DECIMAL(10,2),
  p_subtotal DECIMAL(10,2),
  p_total DECIMAL(10,2),
  p_items JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_item RECORD;
  v_product RECORD;
  v_new_stock INTEGER;
  v_order_items JSONB = '[]'::JSONB;
BEGIN
  -- Validar cada item e decrementar estoque (FOR UPDATE para evitar race condition)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) AS item
  LOOP
    -- Lock na linha do produto
    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'Produto não encontrado: ' || v_item->>'product_id', 'code', 'PRODUCT_NOT_FOUND');
    END IF;

    -- Verificar estoque apenas para LOCAL_STOCK
    IF v_product.type = 'LOCAL_STOCK' THEN
      IF (v_product.stock_quantity || 0) < (v_item->>'quantity')::INTEGER THEN
        RETURN jsonb_build_object(
          'error', 'Estoque insuficiente para ' || v_product.name,
          'code', 'INSUFFICIENT_STOCK',
          'productId', v_product.id,
          'available', v_product.stock_quantity,
          'requested', (v_item->>'quantity')::INTEGER
        );
      END IF;
      
      -- Decrementar estoque
      v_new_stock := (v_product.stock_quantity || 0) - (v_item->>'quantity')::INTEGER;
      UPDATE products
      SET stock_quantity = v_new_stock, updated_at = now()
      WHERE id = v_product.id;
    END IF;

    -- Acumular itens do pedido
    v_order_items := v_order_items || jsonb_build_object(
      'product_id', v_item->>'product_id',
      'quantity', (v_item->>'quantity')::INTEGER,
      'unit_price', (v_item->>'unit_price')::DECIMAL,
      'total_price', (v_item->>'total_price')::DECIMAL
    );
  END LOOP;

  -- Criar o pedido
  INSERT INTO orders (
    id,
    customer_name,
    customer_email,
    customer_phone,
    customer_cpf,
    shipping_cep,
    shipping_address,
    shipping_number,
    shipping_complement,
    shipping_neighborhood,
    shipping_city,
    shipping_state,
    shipping_method,
    shipping_cost,
    subtotal,
    total,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_order_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_customer_cpf,
    p_shipping_cep,
    p_shipping_address,
    p_shipping_number,
    p_shipping_complement,
    p_shipping_neighborhood,
    p_shipping_city,
    p_shipping_state,
    p_shipping_method,
    p_shipping_cost,
    p_subtotal,
    p_total,
    'PENDING_PAYMENT',
    now(),
    now()
  );

  -- Inserir itens do pedido
  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
  SELECT 
    p_order_id,
    (item->>'product_id')::UUID,
    (item->>'quantity')::INTEGER,
    (item->>'unit_price')::DECIMAL,
    (item->>'total_price')::DECIMAL
  FROM jsonb_array_elements(v_order_items) AS item;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM, 'code', 'DB_ERROR');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Corrigir RLS course_enrollments (Item 18) - apenas cursos gratuitos
DROP POLICY IF EXISTS "Users insert own enrollments" ON course_enrollments;
CREATE POLICY "Users insert own enrollments" ON course_enrollments 
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM courses WHERE id = course_id AND price = 0)
  );

-- Cursos pagos: INSERT apenas via service_role (webhook pagamento)
DROP POLICY IF EXISTS "Service Role manages enrollments" ON course_enrollments;
CREATE POLICY "Service Role manages enrollments" ON course_enrollments 
  FOR ALL USING (auth.role() = 'service_role');